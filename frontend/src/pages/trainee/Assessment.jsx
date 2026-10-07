import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Award,
  CheckCircle,
  ClipboardList,
  XCircle,
  Lock,
  Loader2,
  HelpCircle,
  Timer,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { assessmentService, certificateService, triggerDownload } from '../../services/api';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const WARNING_AT_SECONDS = 300; // 5 minutes

// mm:ss (or h:mm:ss when the limit is over an hour).
const formatTime = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// The configured limit, written out for the trainee. A null / zero limit
// means the trainer set no time limit.
const timeLimitLabel = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return 'No Time Limit';
  return `${n} Minute${n === 1 ? '' : 's'}`;
};

const Assessment = () => {
  const { trainingId } = useParams();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [phase, setPhase] = useState('landing'); // 'landing' | 'exam' | 'result'
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Countdown. `secondsLeft` is null when the trainer set no time limit.
  // The deadline is anchored to performance.now(), which cannot be altered by
  // changing the system clock, so the displayed countdown stays honest.
  const [secondsLeft, setSecondsLeft] = useState(null);
  const deadlineRef = useRef(null);
  const answersRef = useRef({});
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    assessmentService.getStatus(trainingId)
      .then((res) => setStatus(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load assessment'))
      .finally(() => setLoading(false));
  }, [trainingId]);

  // Starting (or resuming) an attempt. The server decides whether this is a
  // fresh paper or a resumed one, and returns the authoritative time left.
  const startAssessment = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await assessmentService.start(trainingId);

      // The previous attempt had already hit its deadline while the trainee
      // was away: the backend graded it and returns the result directly.
      if (res.data.expired) {
        setResult(res.data);
        setAttempt(res.data.attempt || null);
        setPhase('result');
        return;
      }

      const remaining = typeof res.data.seconds_remaining === 'number' ? res.data.seconds_remaining : null;
      setAttempt(res.data.attempt);
      setQuestions(res.data.questions || []);
      setAnswers({});
      answersRef.current = {};
      autoSubmittedRef.current = false;
      setCurrentQ(0);
      setQuestionError('');
      setSecondsLeft(remaining);
      // Anchor the countdown to a monotonic clock.
      deadlineRef.current = remaining === null ? null : { baseSeconds: remaining, perfBase: performance.now() };
      setPhase('exam');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start assessment');
    } finally {
      setStarting(false);
    }
  };

  const handleSelect = (questionId, answer) => {
    setAnswers((prev) => {
      const next = { ...prev, [String(questionId)]: answer };
      answersRef.current = next;
      return next;
    });
    setQuestionError('');
  };

  const submitAttempt = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = Object.entries(answersRef.current).map(([question_id, answer]) => ({ question_id, answer }));
      const res = await assessmentService.submit(attempt.id, payload);
      setResult(res.data);
      deadlineRef.current = null;
      setPhase('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assessment');
      // A failed auto-submit must not leave the trainee stuck on a dead
      // countdown, so allow a manual retry.
      autoSubmittedRef.current = false;
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  }, [attempt, submitting]);

  // Tick the countdown while the paper is open.
  useEffect(() => {
    if (phase !== 'exam' || !deadlineRef.current) return undefined;
    const id = setInterval(() => {
      const { baseSeconds, perfBase } = deadlineRef.current;
      const elapsed = (performance.now() - perfBase) / 1000;
      setSecondsLeft(Math.max(0, Math.ceil(baseSeconds - elapsed)));
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  // Submit automatically the moment the countdown reaches zero. The server
  // re-checks the real deadline, so this can never be used to gain time.
  useEffect(() => {
    if (phase !== 'exam' || secondsLeft !== 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    submitAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  // Warn before losing an in-progress attempt to an accidental reload.
  useEffect(() => {
    if (phase !== 'exam') return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  // Copy protection: while a paper is open the questions and options must not
  // be selectable or copyable. This is a deterrent against casual copying
  // only - anyone determined can still read the text in devtools or from the
  // network response, so the real protection is that the answer key is never
  // sent to the browser (see the backend respondWithPaper).
  useEffect(() => {
    if (phase !== 'exam') return undefined;
    const block = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    const events = ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'selectstart'];
    events.forEach((name) => document.addEventListener(name, block, true));
    return () => events.forEach((name) => document.removeEventListener(name, block, true));
  }, [phase]);

  const answeredCount = Object.keys(answers).length;

  // Turns the header red inside the last 5 minutes (or the last 30 seconds
  // for a very short limit) so the trainee is warned before time runs out.
  const warningWindow = Math.min(WARNING_AT_SECONDS, Math.max(30, (attempt?.time_limit_minutes || 1) * 60 * 0.1));
  const timerIsUrgent = secondsLeft !== null && secondsLeft <= warningWindow;

  const isAnswered = (q) => !!answers[String(q.id)];

  // First question (index) that still needs an answer; -1 if all answered.
  const firstUnansweredIndex = questions.findIndex((q) => !isAnswered(q));

  const requireAnswer = () => {
    setQuestionError('Please select an answer before continuing to the next question.');
  };

  const goNext = () => {
    const current = questions[currentQ];
    if (current && !isAnswered(current)) {
      requireAnswer();
      return;
    }
    setQuestionError('');
    setCurrentQ((q) => Math.min(questions.length - 1, q + 1));
  };

  const goPrevious = () => {
    setQuestionError('');
    setCurrentQ((q) => Math.max(0, q - 1));
  };

  const goToQuestion = (index) => {
    // Going back is always allowed; going forward only up to the first unanswered question.
    if (index > currentQ && index > firstUnansweredIndex) {
      requireAnswer();
      return;
    }
    setQuestionError('');
    setCurrentQ(index);
  };

  const handleCertificateDownload = async () => {
    try {
      const blob = await certificateService.download(result.certificate.id);
      triggerDownload(blob, `certificate-${result.certificate.certificate_number || result.certificate.id}.html`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download certificate');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  const assessment = status?.assessment;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Link to={`/trainee/trainings/${trainingId}`} className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Training Details
        </Link>

        {/* ---------- Landing ---------- */}
        {phase === 'landing' && (
          <>
            <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
              <div className="bg-gradient-to-r from-mint-primary to-mint-secondary p-6 text-white">
                <h1 className="text-2xl font-bold">{assessment ? 'Final Assessment' : 'Assessment'}</h1>
                {assessment && <p className="text-white/80 mt-1">{assessment.title}</p>}
              </div>
              <div className="p-6">
                {error && <ErrorBox message={error} />}

                {!assessment ? (
                  <div className="text-center py-10">
                    <ClipboardList className="w-16 h-16 text-mint-gray mx-auto mb-4" />
                    <p className="text-gray-700">No final assessment has been set up for this training yet.</p>
                    <p className="text-sm text-mint-gray mt-2">Please check back later or contact your trainer.</p>
                  </div>
                ) : (
                  <>
                    {status.passed && (
                      <div className="mb-6 bg-mint-accent/10 border border-mint-accent/30 rounded-xl p-4 flex items-center gap-3">
                        <Award className="w-8 h-8 text-mint-accent shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-800">You have already passed this assessment.</p>
                          <p className="text-sm text-mint-gray">You may retake it to improve your score.</p>
                        </div>
                      </div>
                    )}

                    {/* An attempt is already open: resuming keeps the ORIGINAL
                        deadline, so the trainee cannot gain time by reloading. */}
                    {status.openAttempt && (
                      <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                        <RotateCcw className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800">You have an attempt in progress</p>
                          <p className="text-sm text-mint-gray">
                            Attempt #{status.openAttempt.attempt_number} started{' '}
                            {status.openAttempt.started_at ? new Date(status.openAttempt.started_at).toLocaleString() : ''}
                            {status.openAttempt.expires_at
                              ? ` and must be submitted by ${new Date(status.openAttempt.expires_at).toLocaleTimeString()}.`
                              : '.'}
                            {' '}The timer is still running and your answers so far were not saved, so
                            please continue and submit before the deadline.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <StatCard icon={HelpCircle} label="Questions" value={assessment.total_questions} />
                      <StatCard icon={Award} label="Pass Score" value={`${assessment.pass_score}%`} />
                      <StatCard
                        icon={Timer}
                        label="Time Limit"
                        value={timeLimitLabel(assessment.time_limit_minutes)}
                      />
                    </div>

                    <p className="text-gray-700 leading-relaxed">{assessment.description || 'Complete the final assessment to earn your certificate of completion.'}</p>

                    <div className="mt-4 bg-mint-light border border-mint-border rounded-xl p-4 text-sm text-mint-gray">
                      <p className="font-semibold text-gray-800 mb-2">Before you start, please note:</p>
                      <ul className="space-y-1.5 list-disc list-inside">
                        {assessment.time_limit_minutes ? (
                          <li>
                            <strong>Time Limit: {timeLimitLabel(assessment.time_limit_minutes)}</strong>. The
                            countdown starts the moment you press start and <strong>cannot be paused</strong>.
                            When it reaches zero your answers are submitted automatically.
                          </li>
                        ) : (
                          <li>
                            <strong>No Time Limit</strong> is set for this assessment, so there is no
                            countdown. Take as long as you need.
                          </li>
                        )}
                        <li>
                          You may take this assessment <strong>as many times as you need</strong>. There is no
                          attempt limit.
                        </li>
                        {assessment.shuffle_questions && (
                          <li>Questions are shown in a different order on every attempt.</li>
                        )}
                        {assessment.shuffle_options && (
                          <li>Answer options are shuffled on every attempt.</li>
                        )}
                        <li>Correct answers are never sent to your browser, and the timer runs on the server.</li>
                        <li>Copying, pasting and right-click are disabled while the assessment is open, so the questions cannot be copied out.</li>
                      </ul>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      {!status.assessmentUnlocked && (
                        <div className="bg-mint-light border border-mint-border rounded-xl p-4 flex items-start gap-3">
                          <Lock className="w-5 h-5 text-mint-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-800">Assessment Locked</p>
                            <p className="text-sm text-mint-gray">
                              Complete at least {status.minProgressForAssessment || 75}% of the training to unlock the final assessment.
                              Your current progress is {status.progress?.percent || 0}%.
                            </p>
                          </div>
                        </div>
                      )}
                      {!assessment.is_published && (
                        <div className="bg-mint-light border border-mint-border rounded-xl p-4 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-mint-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-800">Not Available Yet</p>
                            <p className="text-sm text-mint-gray">The assessment has not been published by your trainer yet.</p>
                          </div>
                        </div>
                      )}
                      {status.assessmentUnlocked && assessment.is_published && (
                        <button
                          onClick={startAssessment}
                          disabled={starting}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-mint-accent text-white rounded-xl hover:bg-opacity-90 transition font-semibold disabled:opacity-60"
                        >
                          {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
                          {status.openAttempt
                            ? 'Resume Assessment'
                            : status.attempts?.length
                              ? 'Start New Attempt'
                              : 'Start Assessment'}
                        </button>
                      )}
                    </div>

                    {status.attempts?.length > 0 && (
                      <div className="mt-8">
                        <h3 className="font-semibold text-gray-800 mb-3">Attempt History</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-mint-gray border-b border-mint-border">
                                <th className="py-2 pr-4">Attempt</th>
                                <th className="py-2 pr-4">Score</th>
                                <th className="py-2 pr-4">Result</th>
                                <th className="py-2">Submitted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {status.attempts.map((a) => (
                                <tr key={a.id} className="border-b border-mint-border/60">
                                  <td className="py-2 pr-4 font-medium text-gray-800">#{a.attempt_number}</td>
                                  <td className="py-2 pr-4">
                                    <span className={`font-bold ${a.passed ? 'text-mint-accent' : 'text-red-500'}`}>{a.score}%</span>
                                    <span className="text-mint-gray text-xs"> ({a.correct_count}/{a.total_questions})</span>
                                  </td>
                                  <td className="py-2 pr-4">
                                    {a.passed ? (
                                      <span className="inline-flex items-center gap-1 text-mint-accent font-medium"><CheckCircle className="w-4 h-4" /> Passed</span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-red-500 font-medium"><XCircle className="w-4 h-4" /> Failed</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-mint-gray">{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ---------- Exam ---------- */}
        {phase === 'exam' && (
          <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
            <div className={`p-5 text-white ${timerIsUrgent ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-mint-primary to-mint-secondary'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-bold">{assessment?.title || 'Final Assessment'}</h1>
                  <p className="text-white/80 text-sm mt-1">
                    Attempt #{attempt?.attempt_number}
                    {status?.openAttempt ? ' \u00b7 resumed with the original time limit' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Countdown. The server owns the real deadline; this is a
                      display of it that also drives the auto-submit. */}
                  {secondsLeft !== null ? (
                    <span
                      role="timer"
                      aria-live={timerIsUrgent ? 'assertive' : 'off'}
                      aria-label="Time remaining"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold tabular-nums ${
                        timerIsUrgent ? 'bg-white text-red-700 animate-pulse' : 'bg-white/20 text-white'
                      }`}
                    >
                      <Timer className="w-4 h-4" />
                      Time Remaining: {formatTime(secondsLeft)}
                    </span>
                  ) : (
                    <span
                      role="timer"
                      aria-label="No time limit"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold bg-white/20 text-white"
                    >
                      <Timer className="w-4 h-4" />
                      No Time Limit
                    </span>
                  )}
                  <span className="px-3 py-1 bg-white/15 rounded-full text-sm">
                    {answeredCount} / {questions.length} answered
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-mint-gold rounded-full transition-all duration-300" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}></div>
              </div>
              {secondsLeft !== null ? (
                <p className="text-white/80 text-xs mt-2">
                  <strong>Time Limit: {timeLimitLabel(attempt?.time_limit_minutes)}</strong>. This
                  countdown runs on the server from the moment the attempt started, so refreshing
                  the page or leaving and returning will not reset it. It cannot be paused. At zero
                  your answers are submitted automatically.
                </p>
              ) : (
                <p className="text-white/80 text-xs mt-2">
                  <strong>No Time Limit</strong> is set for this assessment, so no countdown is
                  running. You may take as long as you need.
                </p>
              )}
              <p className="text-white/80 text-xs mt-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                Copying, pasting and right-click are disabled for this assessment.
              </p>
            </div>

            <div className="p-6">
              {error && <ErrorBox message={error} />}

              {secondsLeft === 0 && submitting && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  Time is up. Submitting your assessment automatically&hellip;
                </div>
              )}

              {questions.length === 0 ? (
                <p className="text-center text-mint-gray py-10">No questions available.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-mint-gray">Question {currentQ + 1} of {questions.length}</p>
                    <div className="flex gap-1">
                      {questions.map((q, i) => (
                        <button
                          key={q.id}
                          onClick={() => goToQuestion(i)}
                          className={`w-7 h-7 rounded-md text-xs font-semibold transition
                            ${i === currentQ ? 'bg-mint-primary text-white'
                              : answers[String(q.id)] ? 'bg-mint-accent text-white'
                              : 'bg-mint-light text-mint-gray'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {questionError && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {questionError}
                    </div>
                  )}

                  <div key={currentQ} className="bg-mint-light border border-mint-border rounded-xl p-5 select-none" onContextMenu={(e) => e.preventDefault()}>
                    <p className="font-semibold text-gray-800 leading-relaxed mb-4">{questions[currentQ].question_text}</p>
                    <div className="grid gap-2.5">
                      {OPTION_LABELS.map((label) => {
                        const value = questions[currentQ][`option_${label.toLowerCase()}`];
                        if (!value) return null;
                        const selected = answers[String(questions[currentQ].id)] === label;
                        return (
                          <button
                            key={label}
                            onClick={() => handleSelect(questions[currentQ].id, label)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition
                              ${selected
                                ? 'border-mint-primary bg-mint-primary/10 text-mint-primary font-semibold'
                                : 'border-mint-border bg-white hover:border-mint-primary/50 text-gray-700'}`}
                          >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                              ${selected ? 'bg-mint-primary text-white' : 'bg-mint-light text-mint-gray'}`}>
                              {label}
                            </span>
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={goPrevious}
                      disabled={currentQ === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-mint-border text-gray-700 hover:bg-mint-light transition text-sm disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ArrowLeft className="w-4 h-4" /> Previous
                    </button>

                    {currentQ < questions.length - 1 ? (
                      <button
                        onClick={goNext}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mint-primary text-white hover:bg-opacity-90 transition text-sm font-semibold"
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmSubmit(true)}
                        disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-mint-accent text-white hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                        Submit Assessment
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ---------- Result ---------- */}
        {phase === 'result' && result && (
          <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
            <div className={`p-8 text-center ${result.passed ? 'bg-mint-accent' : 'bg-red-500'} text-white`}>
              {result.passed ? (
                <Award className="w-20 h-20 mx-auto mb-4" />
              ) : (
                <XCircle className="w-20 h-20 mx-auto mb-4" />
              )}
              <h1 className="text-3xl font-bold">{result.passed ? 'Congratulations!' : 'Not Quite'}</h1>
              <p className="mt-2 text-white/90">{result.passed ? 'You passed the final assessment.' : 'You did not reach the passing score. Review and try again.'}</p>
            </div>

            <div className="p-6">
              {result.timed_out && (
                <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                  <Timer className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-800">Time ran out &mdash; submitted automatically</p>
                    <p className="text-sm text-mint-gray">
                      The time limit for this attempt reached zero, so the system submitted your
                      answers for you. Any question you had not answered was marked incorrect.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard icon={Award} label="Your Score" value={`${result.attempt.score}%`} accent={result.passed} />
                <StatCard icon={HelpCircle} label="Correct" value={`${result.attempt.correct_count} / ${result.attempt.total_questions}`} />
                <StatCard icon={Award} label="Pass Score" value={`${result.pass_score}%`} />
              </div>

              {result.passed && (
                <div className="mb-6 bg-mint-accent/10 border border-mint-accent/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-10 h-10 text-mint-accent" />
                    <div>
                      <p className="font-semibold text-gray-800">Certificate Earned</p>
                      {result.certificate ? (
                        <p className="text-sm text-mint-gray">Certificate #{result.certificate.certificate_number}</p>
                      ) : (
                        <p className="text-sm text-mint-gray">You are now eligible for your certificate.</p>
                      )}
                    </div>
                  </div>
                  {result.certificate && (
                    <button
                      onClick={handleCertificateDownload}
                      className="flex items-center gap-2 px-5 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
                    >
                      <Award className="w-4 h-4" /> Download Certificate
                    </button>
                  )}
                </div>
              )}

              {!result.passed && (
                <Link
                  to={`/trainee/learn/${trainingId}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-mint-primary text-white rounded-xl hover:bg-opacity-90 transition font-semibold w-full sm:w-auto"
                >
                  Review Training <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={startAssessment}
                  className="px-5 py-2.5 rounded-lg border border-mint-primary text-mint-primary hover:bg-mint-light transition text-sm font-semibold"
                >
                  {result.passed ? 'Retake Assessment' : 'Try Again'}
                </button>
                <Link
                  to={`/trainee/trainings/${trainingId}`}
                  className="px-5 py-2.5 rounded-lg border border-mint-border text-gray-700 hover:bg-mint-light transition text-sm font-semibold text-center"
                >
                  Back to Training
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Confirm submit modal */}
        {confirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmSubmit(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <ClipboardList className="w-8 h-8 text-mint-primary" />
                <h3 className="text-lg font-bold text-gray-800">Submit Assessment?</h3>
              </div>
              <p className="text-sm text-mint-gray mb-4">
                You have answered {answeredCount} of {questions.length} questions.
                {answeredCount < questions.length ? ' Unanswered questions will be marked incorrect.' : ''} You cannot change your answers after submitting.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmSubmit(false)}
                  className="px-4 py-2 rounded-lg border border-mint-border text-gray-700 hover:bg-mint-light transition text-sm"
                >
                  Keep Working
                </button>
                <button
                  onClick={submitAttempt}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-mint-accent text-white hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-mint-light border border-mint-border rounded-xl p-4 text-center">
    <Icon className={`w-6 h-6 mx-auto mb-2 ${accent === undefined ? 'text-mint-primary' : accent ? 'text-mint-accent' : 'text-red-500'}`} />
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    <p className="text-xs text-mint-gray mt-1">{label}</p>
  </div>
);

const ErrorBox = ({ message }) => (
  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
    <p className="text-sm text-red-700">{message}</p>
  </div>
);

export default Assessment;
