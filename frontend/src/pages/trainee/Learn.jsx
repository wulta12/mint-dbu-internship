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
  ClipboardCheck
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { learningService, certificateService, triggerDownload } from '../../services/api';

const TYPE_META = {
  text: { icon: BookOpen, label: 'Reading' },
  video: { icon: PlayCircle, label: 'Video' },
  pdf: { icon: FileText, label: 'PDF' },
  document: { icon: File, label: 'Document' },
  link: { icon: ExternalLink, label: 'External Link' }
};

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
  const [videoProgress, setVideoProgress] = useState(null);
  const [toast, setToast] = useState('');
  const videoRef = useRef(null);
  const lastSavedRef = useRef(-1);
  const thresholdReportedRef = useRef(false);

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
    thresholdReportedRef.current = false;
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
  const summary = course?.summary;

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
      goNext();
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to mark lesson complete');
    } finally {
      setCompleting(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const pos = video.currentTime / video.duration;
    const position = Math.round(pos * 100) / 100;
    const bucket = Math.floor(position * 20);
    const pastThreshold = position >= 0.8;
    if (pastThreshold && thresholdReportedRef.current) return;
    if (bucket !== lastSavedRef.current || pastThreshold) {
      lastSavedRef.current = bucket;
      if (pastThreshold) thresholdReportedRef.current = true;
      saveVideoPosition(position);
    }
  };

  const saveVideoPosition = async (position) => {
    try {
      const res = await learningService.saveVideoPosition(currentActivity.id, position);
      if (res.data?.completed) {
        setCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activities: prev.activities.map((a) =>
              String(a.id) === String(currentActivity.id) ? { ...a, status: 'completed' } : a
            ),
            nextIncompleteLessonId: res.data.nextIncompleteLessonId,
            summary: res.data.summary
          };
        });
      }
    } catch (err) {
      // Ignore transient video save errors
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

  const goTo = (index) => {
    if (index < 0 || index >= activities.length) return;
    const target = activities[index];
    if (!unlockedMap[target.id]) {
      setToast('Complete the previous lessons to unlock this activity.');
      return;
    }
    setCurrentIndex(index);
    navigate(`/trainee/learn/${trainingId}/${target.id}`, { replace: true });
  };

  const goNext = () => {
    if (currentIndex + 1 < activities.length) {
      goTo(currentIndex + 1);
    } else {
      // Last activity -> go to assessment
      if (summary?.assessmentUnlocked) {
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
  const canNext = currentActivity?.status === 'completed';

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

            <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-mint-primary to-mint-secondary p-5 text-white">
                <p className="text-xs text-white/70 font-medium">{course.training.training_title}</p>
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
                    videoRef={videoRef}
                    onTimeUpdate={handleVideoTimeUpdate}
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
                  {currentActivity?.type !== 'video' && currentActivity?.status !== 'completed' && (
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mint-accent text-white hover:bg-opacity-90 transition text-sm disabled:opacity-50"
                    >
                      {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                      Mark as Complete
                    </button>
                  )}
                  <button
                    onClick={goNext}
                    disabled={!canNext && !isLast}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg transition text-sm font-semibold
                      ${canNext || isLast
                        ? 'bg-mint-primary text-white hover:bg-opacity-90'
                        : 'bg-mint-border text-mint-gray cursor-not-allowed'}`}
                  >
                    {isLast
                      ? (summary?.assessmentUnlocked ? 'Go to Assessment' : 'Finish Training')
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
                {currentActivity?.type === 'video' ? (
                  <span>Watch at least 80% of the video to mark this lesson complete. Your progress is saved automatically.</span>
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
      </div>
    </AppLayout>
  );
};

// ---------- Lesson body by type ----------
const LessonBody = ({ lesson, type, videoProgress, videoRef, onTimeUpdate }) => {
  if (!lesson) return null;
  const fileUrl = learningService.getLessonFileUrl(lesson.file_path);

  switch (type) {
    case 'video':
      return (
        <div>
          {lesson.video_url ? (
            <video
              ref={videoRef}
              controls
              className="w-full rounded-xl bg-black aspect-video"
              src={lesson.video_url}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={(e) => {
                if (videoProgress > 0) e.currentTarget.currentTime = videoProgress * e.currentTarget.duration;
              }}
            ></video>
          ) : fileUrl ? (
            <video
              ref={videoRef}
              controls
              className="w-full rounded-xl bg-black aspect-video"
              src={fileUrl}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={(e) => {
                if (videoProgress > 0) e.currentTarget.currentTime = videoProgress * e.currentTarget.duration;
              }}
            ></video>
          ) : (
            <p className="text-mint-gray text-center py-8">No video URL configured for this lesson.</p>
          )}
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
