import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  Lock,
  BookOpen,
  PlayCircle,
  FileText,
  File,
  ExternalLink,
  ListChecks,
  Award,
  AlertCircle,
  Loader2,
  ClipboardCheck,
  Bot,
  WifiOff
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import TrainingAssistant from '../../components/TrainingAssistant';
import VideoPlayer, { parseVideoSource, isMeasurableEmbed } from '../../components/VideoPlayer';
import { learningService, certificateService, triggerDownload } from '../../services/api';

const TYPE_META = {
  text: { icon: BookOpen, label: 'Reading' },
  video: { icon: PlayCircle, label: 'Video' },
  pdf: { icon: FileText, label: 'PDF' },
  document: { icon: File, label: 'Document' },
  link: { icon: ExternalLink, label: 'External Link' }
};

// Anti-skip tolerance for the player, in seconds. Deliberately generous: this
// layer only produces an immediate, honest UX reaction, while the server's own
// playback-rate clamp stays the real enforcement.
const MAX_ADVANCE_SECONDS = 4;

const Learn = () => {
  const { trainingId, lessonId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lesson, setLesson] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [attesting, setAttesting] = useState(false);
  const [videoProgress, setVideoProgress] = useState(null);
  const [toast, setToast] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const lastSavedRef = useRef(-1);
  // Set only once the SERVER confirms the lesson completed. While it is false,
  // a position that passes the watch threshold is always worth reporting again,
  // so a crossing that lands on a busy moment is never lost for the session.
  const ackedThresholdRef = useRef(false);
  // The latest position not yet confirmed by the server. A report that arrives
  // while another save is in flight is drained right after it, instead of being
  // dropped - a dropped threshold crossing is how a fully watched video stays
  // permanently stuck below 100%.
  const pendingPositionRef = useRef(null);
  // Furthest point actually played, in seconds. Anything beyond it is a skip.
  const furthestWatchedRef = useRef(0);
  // The mounted player's seek function, so a blocked skip can be undone for
  // every provider (native <video>, YouTube, Vimeo) rather than just one.
  const playerApiRef = useRef(null);
  const saveInFlightRef = useRef(false);
  // Always points at the activity being played. The progress callback and the
  // save loop are memoized, so they must read the CURRENT lesson through this
  // ref; closing over `currentActivity` directly could save a position against
  // the previous lesson when two consecutive videos share a threshold.
  const currentActivityRef = useRef(null);

  // ---------- connectivity ----------
  // Video lessons stream from the network, so an offline trainee must be told
  // plainly rather than staring at a player that will never load.
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // The server owns the real threshold; the client mirrors it only to decide
  // when to report progress and to show an honest label.
  const watchThreshold = Math.min(
    1,
    Math.max(0.1, (Number(lesson?.video_progress_threshold) || 80) / 100)
  );
  const watchThresholdPercent = Math.round(watchThreshold * 100);

  // ---------- load course ----------
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    learningService.getCourse(trainingId)
      .then((res) => {
        if (!active) return;
        const data = res.data;
        setCourse(data);
        const activities = data.activities || [];
        if (activities.length === 0) {
          setError('This training has no published learning activities yet.');
          return;
        }
        let initial = 0;
        if (lessonId) {
          const found = activities.findIndex((a) => String(a.id) === String(lessonId));
          if (found >= 0) initial = found;
        } else if (data.nextIncompleteLessonId) {
          const found = activities.findIndex((a) => String(a.id) === String(data.nextIncompleteLessonId));
          if (found >= 0) initial = found;
        }
        setCurrentIndex(initial);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load training content'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [trainingId, lessonId]);

  const activities = course?.activities || [];

  // ---------- load current lesson content ----------
  useEffect(() => {
    const activity = activities[currentIndex];
    if (!activity) return;
    let active = true;
    setLessonLoading(true);
    setLesson(null);
    setVideoProgress(null);
    lastSavedRef.current = -1;
    ackedThresholdRef.current = false;
    pendingPositionRef.current = null;
    furthestWatchedRef.current = 0;
    saveInFlightRef.current = false;
    learningService.getLesson(activity.id)
      .then((res) => {
        if (!active) return;
        setLesson(res.data?.lesson || null);
        setVideoProgress(activity.last_video_position || 0);
      })
      .catch((err) => setToast(err.response?.data?.message || 'Failed to load lesson'))
      .finally(() => active && setLessonLoading(false));
    return () => { active = false; };
  }, [currentIndex, activities]);

  const currentActivity = activities[currentIndex];
  currentActivityRef.current = currentActivity;
  const summary = course?.summary;

  // Whether this lesson must be watched as a video. This covers real `video`
  // lessons and `link` lessons the server flagged as pointing at a video
  // source: both must clear the watch threshold (or be attested) to complete.
  const isVideoActivity = currentActivity?.type === 'video' ||
    (currentActivity?.type === 'link' && currentActivity?.video_trackable !== undefined);

  // Whether this lesson's video can be measured by the player we render. The
  // server's own classification is the authority (it decides whether it will
  // accept a completion at all); the client-side check is only a fallback for
  // the moment before the lesson payload arrives. An unmeasurable video must
  // offer the manual confirmation, otherwise the only button on the page is one
  // the server will always reject.
  const videoSource = isVideoActivity && lesson
    ? parseVideoSource(currentActivity?.type === 'link' ? lesson.external_url : lesson.video_url)
    : null;
  const isEmbedVideo = !!videoSource;
  const isMeasurableVideo = lesson && lesson.video_trackable !== undefined
    ? Boolean(lesson.video_trackable)
    : (isEmbedVideo ? isMeasurableEmbed(videoSource) : true);
  const videoAlreadyWatched = Boolean(lesson?.video_attested);

  // ---------- locked / unlocked computation ----------
  const computeUnlocked = useCallback(() => {
    const unlocked = {};
    let requiredSeen = 0;
    let requiredCompleted = 0;
    for (const a of activities) {
      const prevDone = requiredSeen === 0 || requiredCompleted === requiredSeen || a.status !== 'not_started';
      unlocked[a.id] = prevDone;
      if (a.is_required) {
        requiredSeen++;
        if (a.status === 'completed') requiredCompleted++;
      }
    }
    return unlocked;
  }, [activities]);

  const [unlockedMap, setUnlockedMap] = useState({});
  useEffect(() => {
    setUnlockedMap(computeUnlocked());
  }, [computeUnlocked]);

  const refreshSummary = useCallback((newSummary) => {
    if (!newSummary) return;
    setCourse((prev) => {
      if (!prev) return prev;
      return { ...prev, summary: newSummary };
    });
  }, []);

  // ---------- actions ----------
  const handleComplete = async () => {
    if (!currentActivity || completing) return;
    if (currentActivity.status === 'completed') {
      goNext();
      return;
    }
    // Completing is recorded on the server, so an offline attempt would just
    // fail. Say so instead of showing a network error.
    if (!navigator.onLine) {
      setToast('You are offline. Reconnect to mark this activity complete.');
      return;
    }
    setCompleting(true);
    try {
      const res = await learningService.completeLesson(currentActivity.id);
      const data = res.data;
      refreshSummary(data.summary);
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activities: prev.activities.map((a) =>
            String(a.id) === String(currentActivity.id) ? { ...a, status: 'completed', completed_at: new Date().toISOString() } : a
          ),
          nextIncompleteLessonId: data.nextIncompleteLessonId,
          summary: data.summary
        };
      });
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to mark lesson complete');
    } finally {
      setCompleting(false);
    }
  };

  // Pulls the player back to the furthest legitimately watched point. Works for
  // every provider because each one registers its own seek function.
  const blockSkip = () => {
    const api = playerApiRef.current;
    if (!api || typeof api.seekTo !== 'function') return false;
    api.seekTo(furthestWatchedRef.current);
    return true;
  };

  const handlePlayerApi = useCallback((api) => {
    playerApiRef.current = api;
  }, []);

  // The single place playback progress is turned into a saved position. Every
  // player (native <video>, YouTube, Vimeo) reports seconds here, so the
  // threshold, the resume position and the skip guard behave identically.
  const handleVideoProgress = useCallback((currentTime, duration) => {
    // A player that has not reported a usable duration (Infinity from a
    // progressive stream, NaN before metadata) cannot be measured at all.
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return;

    // A progress tick can land on the far side of a scrub, so guard the advance
    // here too and never let the watch watermark jump ahead.
    if (currentTime - furthestWatchedRef.current > MAX_ADVANCE_SECONDS) {
      if (blockSkip()) {
        setToast('Skipping ahead is not allowed. Watch the video to continue.');
        return;
      }
    }
    if (currentTime > furthestWatchedRef.current) {
      furthestWatchedRef.current = currentTime;
    }

    const position = Math.round((currentTime / duration) * 100) / 100;
    const bucket = Math.floor(position * 20);
    const pastThreshold = position >= watchThreshold;
    // Once the server confirms completion, reporting stops. Until then a
    // position past the threshold is ALWAYS worth saving again, so a crossing
    // that lands on a busy moment (a save already in flight) is retried rather
    // than dropped - a dropped crossing is how a fully watched video stays
    // stuck below 100% for the whole session.
    if (ackedThresholdRef.current) return;
    if (!pastThreshold && bucket === lastSavedRef.current) return;
    lastSavedRef.current = bucket;
    saveVideoPosition(position);
  }, [watchThreshold]);

  const saveVideoPosition = async (position) => {
    if (ackedThresholdRef.current) return;
    // Offline saves are dropped by the server anyway; skip the doomed request
    // and tell the trainee their position will be lost.
    if (!navigator.onLine) {
      setToast('You are offline, so this part of the video was not recorded. Reconnect and replay to save your place.');
      return;
    }
    // Remember the latest unsent position. If another save is already in
    // flight, it is drained the moment that one finishes instead of being
    // silently dropped (the previous "one report at a time" guard lost exactly
    // the report that first crossed the threshold).
    pendingPositionRef.current = position;
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    let savingPosition = null;
    try {
      // Drain every position that arrives while saving, so no report is left
      // behind. The last one wins; the server clamps implausible jumps anyway.
      while (pendingPositionRef.current !== null && !ackedThresholdRef.current) {
        savingPosition = pendingPositionRef.current;
        pendingPositionRef.current = null;
        const lessonId = currentActivityRef.current?.id;
        if (!lessonId) break;
        const res = await learningService.saveVideoPosition(lessonId, savingPosition);
        if (res.data?.completed) {
          ackedThresholdRef.current = true;
          setCourse((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              activities: prev.activities.map((a) =>
                String(a.id) === String(lessonId) ? { ...a, status: 'completed' } : a
              ),
              nextIncompleteLessonId: res.data.nextIncompleteLessonId,
              summary: res.data.summary
            };
          });
          break;
        }
        if (res.data?.clamped) {
          setToast('That jump was too large to record. Continue watching normally to save your place.');
        }
      }
    } catch (err) {
      // A rejected position means the server refused an implausible jump, so
      // the stored position is authoritative. Tell the trainee rather than
      // letting the video and the saved progress silently disagree.
      if (!navigator.onLine) {
        setToast('Connection lost. Your last saved position is being kept.');
      } else if (err.response?.status === 422 || err.response?.status === 400) {
        setToast('That jump was too large to record. Continue watching normally to save your place.');
      } else {
        // Transient failure (network hiccup, server restart): leave the pending
        // position in place so the next tick retries it instead of losing it.
        pendingPositionRef.current = pendingPositionRef.current ?? savingPosition;
      }
    } finally {
      saveInFlightRef.current = false;
      // A position queued while the loop above was finishing its last await
      // gets sent right away, keeping the threshold crossing reliable even on
      // the final tick (for example when a video ends).
      if (pendingPositionRef.current !== null && !ackedThresholdRef.current && navigator.onLine) {
        saveVideoPosition(pendingPositionRef.current);
      }
    }
  };

  // The escape hatch for a video whose provider cannot report playback
  // progress. The server records who confirmed it and when; it is the only way
  // such a lesson can ever be completed.
  const handleAttestVideo = async () => {
    if (!currentActivity || attesting) return;
    if (!navigator.onLine) {
      setToast('You are offline. Reconnect to confirm this video.');
      return;
    }
    setAttesting(true);
    try {
      const res = await learningService.attestVideoWatched(currentActivity.id);
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activities: prev.activities.map((a) =>
            String(a.id) === String(currentActivity.id) ? { ...a, status: 'completed' } : a
          ),
          nextIncompleteLessonId: res.data?.nextIncompleteLessonId ?? prev.nextIncompleteLessonId,
          summary: res.data?.summary ?? prev.summary
        };
      });
      setToast('Video confirmed as watched.');
    } catch (err) {
      setToast(err.response?.data?.message || 'Could not record your confirmation');
    } finally {
      setAttesting(false);
    }
  };

  const handleCertificateDownload = async () => {
    if (!summary?.certificate) return;
    try {
      const blob = await certificateService.download(summary.certificate.id);
      triggerDownload(blob, `certificate-${summary.certificate.certificate_number || summary.certificate.id}.html`);
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to download certificate');
    }
  };

  const openActivity = (index) => {
    if (index < 0 || index >= activities.length) return;
    const target = activities[index];
    setCurrentIndex(index);
    navigate(`/trainee/learn/${trainingId}/${target.id}`, { replace: true });
  };

  const goTo = (index) => {
    if (index < 0 || index >= activities.length) return;
    const target = activities[index];
    if (!unlockedMap[target.id]) {
      setToast('Complete the previous lessons to unlock this activity.');
      return;
    }
    openActivity(index);
  };

  const goNext = (overrideSummary) => {
    const nextSummary = overrideSummary || summary;
    if (currentIndex + 1 < activities.length) {
      openActivity(currentIndex + 1);
    } else {
      // Last activity -> go to assessment
      if (nextSummary?.assessmentUnlocked) {
        navigate(`/trainee/assessment/${trainingId}`);
      } else {
        navigate(`/trainee/trainings/${trainingId}`);
      }
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  };

  // ---------- render ----------
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading your training...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">{error}</h2>
          <Link to={`/trainee/trainings/${trainingId}`} className="inline-block mt-4 text-mint-primary hover:underline">
            Back to Training Details
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!course) return null;

  const TypeIcon = currentActivity ? (TYPE_META[currentActivity.type]?.icon || BookOpen) : BookOpen;
  const isLast = currentIndex === activities.length - 1;
  const canNext = currentActivity?.status === 'completed' || currentActivity?.is_required === false;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ---------- Sidebar ---------- */}
          <aside className="lg:w-80 shrink-0">
            <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden lg:sticky lg:top-24">
              <div className="p-4 border-b border-mint-border bg-mint-light">
                <p className="text-xs font-semibold text-mint-gray uppercase tracking-wide">Your Progress</p>
                <p className="text-2xl font-bold text-mint-primary mt-1">{summary?.progress?.percent || 0}%</p>
                <div className="w-full h-2.5 bg-mint-border rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-mint-accent rounded-full transition-all duration-500"
                    style={{ width: `${summary?.progress?.percent || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-mint-gray mt-2">
                  {summary?.progress?.completed || 0} of {summary?.progress?.total || 0} activities completed
                </p>
              </div>

              <div className="p-3">
                <p className="text-xs font-semibold text-mint-gray uppercase tracking-wide px-2 mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" /> Course Content
                </p>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {(course.modules || []).map((module) => (
                    <div key={module.id}>
                      <p className="text-xs font-bold text-gray-700 px-2 py-1 rounded bg-mint-light">
                        {module.title}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {module.lessons.map((lessonItem) => {
                          const unlocked = unlockedMap[lessonItem.id];
                          const isCurrent = currentActivity && String(currentActivity.id) === String(lessonItem.id);
                          return (
                            <li key={lessonItem.id}>
                              <button
                                onClick={() => {
                                  if (isCurrent) return;
                                  const idx = activities.findIndex((a) => String(a.id) === String(lessonItem.id));
                                  goTo(idx);
                                }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition text-sm
                                  ${isCurrent ? 'bg-mint-primary/10 text-mint-primary font-semibold'
                                    : unlocked ? 'hover:bg-mint-light text-gray-700'
                                    : 'text-mint-gray opacity-70 cursor-not-allowed'}`}
                              >
                                {lessonItem.status === 'completed' ? (
                                  <CheckCircle className="w-4 h-4 text-mint-accent shrink-0" />
                                ) : isCurrent ? (
                                  <PlayCircle className="w-4 h-4 text-mint-primary shrink-0" />
                                ) : unlocked ? (
                                  <Circle className="w-4 h-4 text-mint-border shrink-0" />
                                ) : (
                                  <Lock className="w-4 h-4 text-mint-gray shrink-0" />
                                )}
                                <span className="truncate">{lessonItem.title}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ---------- Main lesson area ---------- */}
          <div className="flex-1 min-w-0">
            <Link to={`/trainee/trainings/${trainingId}`} className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-3 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Training Details
            </Link>

            {!isOnline && (
              <div className="mb-3 bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-xl p-4 text-sm flex items-start gap-3">
                <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">You are offline</p>
                  <p className="mt-0.5">
                    {isVideoActivity
                      ? 'Videos need an internet connection, and your place in this video cannot be saved until you reconnect. Reading, PDF and link activities already on screen stay available.'
                      : 'Your activity and progress will be saved once you reconnect. Anything already loaded stays readable.'}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-mint-primary to-mint-secondary p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-white/70 font-medium">{course.training.training_title}</p>
                  <button
                    onClick={() => setAssistantOpen(true)}
                    aria-label="Open AI Training Assistant"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 border border-white/25 text-xs font-semibold hover:bg-white/25 transition shrink-0"
                  >
                    <Bot className="w-4 h-4 text-mint-gold" />
                    AI Training Assistant
                  </button>
                </div>
                <h1 className="text-xl md:text-2xl font-bold mt-1">{currentActivity?.title}</h1>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {currentActivity?.module_title && (
                    <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-medium">
                      {currentActivity.module_title}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-medium">
                    Lesson {currentActivity?.order || currentIndex + 1} of {activities.length}
                  </span>
                  <span className="px-3 py-1 bg-mint-gold/30 rounded-full text-xs font-medium flex items-center gap-1">
                    <TypeIcon className="w-3.5 h-3.5" />
                    {TYPE_META[currentActivity?.type]?.label || currentActivity?.type}
                  </span>
                  {currentActivity?.status === 'completed' && (
                    <span className="px-3 py-1 bg-mint-accent/40 rounded-full text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {lessonLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-mint-primary animate-spin" />
                  </div>
                ) : (
                  <LessonBody
                    lesson={lesson}
                    type={currentActivity?.type}
                    videoProgress={videoProgress}
                    onVideoProgress={handleVideoProgress}
                    onPlayerApi={handlePlayerApi}
                  />
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-mint-border bg-mint-light flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-mint-border bg-white text-gray-700 hover:bg-mint-primary hover:text-white transition text-sm disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>

                <div className="flex items-center gap-3">
                  {/*
                    A measurable video completes itself once the threshold is
                    reached, so no button is offered. An unmeasurable one cannot
                    be completed by the server at all, so the only honest control
                    is the confirmation below - offering "Mark as Complete" there
                    is what produced a button that always returned "you must
                    watch 80%".
                  */}
                  {!isVideoActivity && currentActivity?.status !== 'completed' && (
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mint-accent text-white hover:bg-opacity-90 transition text-sm disabled:opacity-50"
                    >
                      {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                      Mark as Complete
                    </button>
                  )}
                  {isVideoActivity &&
                    !isMeasurableVideo &&
                    currentActivity?.status !== 'completed' &&
                    !videoAlreadyWatched && (
                      <button
                        onClick={handleAttestVideo}
                        disabled={attesting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mint-accent text-white hover:bg-opacity-90 transition text-sm disabled:opacity-50"
                      >
                        {attesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        I watched this video
                      </button>
                    )}
                  <button
                    onClick={goNext}
                    disabled={!canNext}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg transition text-sm font-semibold
                      ${canNext
                        ? 'bg-mint-primary text-white hover:bg-opacity-90'
                        : 'bg-mint-border text-mint-gray cursor-not-allowed'}`}
                  >
                    {isLast
                      ? (canNext
                          ? (summary?.assessmentUnlocked ? 'Go to Assessment' : 'Finish Training')
                          : 'Complete this lesson to continue')
                      : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Completion hint */}
            {currentActivity?.status !== 'completed' && (
              <div className="mt-4 bg-mint-light border border-mint-border rounded-xl p-4 text-sm text-mint-gray flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-mint-primary shrink-0 mt-0.5" />
                {isVideoActivity ? (
                  isMeasurableVideo ? (
                    <span>
                      Watch at least {watchThresholdPercent}% of the video to mark this lesson
                      complete. Your progress is saved automatically
                      {isOnline ? '.' : ' once you reconnect.'}
                    </span>
                  ) : (
                    <span>
                      This player cannot report how much of the video you watched, so the{' '}
                      {watchThresholdPercent}% rule cannot be checked automatically. Watch the
                      video, then click <strong>I watched this video</strong> to continue. Your
                      confirmation is recorded with your name and the time.
                    </span>
                  )
                ) : (
                  <span>This activity counts toward your training progress. Review the material, then click <strong>Mark as Complete</strong> to continue.</span>
                )}
              </div>
            )}

            {/* Assessment / certificate banner */}
            <div className="mt-4 bg-white rounded-xl shadow-card border border-mint-border p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {summary?.assessmentUnlocked ? (
                    <CheckCircle className="w-6 h-6 text-mint-accent" />
                  ) : (
                    <Lock className="w-6 h-6 text-mint-gray" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">
                      {summary?.assessmentUnlocked ? 'Final Assessment Available' : 'Final Assessment Locked'}
                    </p>
                    <p className="text-sm text-mint-gray">
                      {summary?.assessmentUnlocked
                        ? 'You have unlocked the final assessment.'
                        : `Complete at least ${summary?.minProgressForAssessment || 75}% of the training to unlock the final assessment.`}
                    </p>
                  </div>
                </div>
                {summary?.assessmentUnlocked && (
                  <Link
                    to={`/trainee/assessment/${trainingId}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
                  >
                    Start Assessment <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              {summary?.certificate && (
                <div className="mt-3 pt-3 border-t border-mint-border flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-mint-gold" />
                    <div>
                      <p className="font-semibold text-gray-800">Training Completed</p>
                      <p className="text-sm text-mint-gray">Certificate {summary.certificate.certificate_number} is available.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCertificateDownload}
                    className="flex items-center gap-2 px-5 py-2.5 bg-mint-accent text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
                  >
                    <Award className="w-4 h-4" /> View Certificate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg max-w-md text-center">
            {toast}
          </div>
        )}

        {/* AI Training Assistant */}
        {assistantOpen && (
          <TrainingAssistant
            onClose={() => setAssistantOpen(false)}
            trainingId={trainingId}
            trainingTitle={course.training?.training_title || 'Training'}
            lessonId={currentActivity?.id}
            lessonTitle={currentActivity?.title}
          />
        )}
      </div>
    </AppLayout>
  );
};

// ---------- Lesson body by type ----------
const LessonBody = ({ lesson, type, videoProgress, onVideoProgress, onPlayerApi }) => {
  if (!lesson) return null;
  const fileUrl = learningService.getLessonFileUrl(lesson.file_path);

  switch (type) {
    case 'video':
      return (
        <div>
          <VideoPlayer
            videoUrl={lesson.video_url}
            fileUrl={fileUrl}
            savedFraction={videoProgress || 0}
            onProgress={onVideoProgress}
            onApi={onPlayerApi}
          />
          {lesson.content && <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>}
        </div>
      );
    case 'pdf':
      return (
        <div>
          {fileUrl && (
            <iframe src={fileUrl} title={lesson.title} className="w-full h-[60vh] rounded-xl border border-mint-border"></iframe>
          )}
          {lesson.content && <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm"
          >
            <FileText className="w-4 h-4" /> Open / Download PDF
          </a>
        </div>
      );
    case 'document':
      return (
        <div className="py-6">
          {fileUrl && (
            <div className="bg-mint-light border border-mint-border rounded-xl p-6 text-center">
              <File className="w-12 h-12 text-mint-primary mx-auto mb-3" />
              <p className="font-semibold text-gray-800">{lesson.file_name}</p>
              <p className="text-sm text-mint-gray mt-1">
                {lesson.file_size ? `${(lesson.file_size / (1024 * 1024)).toFixed(1)} MB` : 'Document'}
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
              >
                <FileText className="w-4 h-4" /> Open / Download Document
              </a>
            </div>
          )}
          {lesson.content && <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>}
        </div>
      );
    case 'link':
      /* A link lesson the server classified as a video (e.g. a YouTube /
         Vimeo link) is rendered as the player so its watch progress can be
         measured - the 80% rule is enforced exactly like a `video` lesson
         instead of being bypassed by opening the link in another tab. */
      if (lesson.video_trackable !== undefined) {
        return (
          <div>
            <VideoPlayer
              videoUrl={lesson.external_url}
              savedFraction={videoProgress || 0}
              onProgress={onVideoProgress}
              onApi={onPlayerApi}
            />
            <a
              href={lesson.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm"
            >
              <ExternalLink className="w-4 h-4" /> Open Video in New Tab
            </a>
            {lesson.content && <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>}
          </div>
        );
      }
      return (
        <div className="py-6">
          <div className="bg-mint-light border border-mint-border rounded-xl p-6 text-center">
            <ExternalLink className="w-12 h-12 text-mint-primary mx-auto mb-3" />
            <p className="font-semibold text-gray-800">{lesson.title}</p>
            <p className="text-sm text-mint-gray mt-1 break-all">{lesson.external_url}</p>
            <a
              href={lesson.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" /> Open External Link
            </a>
          </div>
          {lesson.content && <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.content}</p>}
        </div>
      );
    case 'text':
    default:
      return <p className="text-gray-800 leading-8 whitespace-pre-wrap text-base">{lesson.content || 'No content provided for this lesson.'}</p>;
  }
};

export default Learn;
