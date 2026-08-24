import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Award,
  CheckCircle,
  ClipboardList,
  Clock,
  XCircle,
  Lock,
  Loader2,
  HelpCircle
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { assessmentService, certificateService, triggerDownload } from '../../services/api';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const Assessment = () => {
  const { trainingId } = useParams();
  const navigate = useNavigate();

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

  useEffect(() => {
    assessmentService.getStatus(trainingId)
      .then((res) => setStatus(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load assessment'))
      .finally(() => setLoading(false));
  }, [trainingId]);

  const startAssessment = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await assessmentService.start(trainingId);
      setAttempt(res.data.attempt);
      setQuestions(res.data.questions);
      setAnswers({});
      setCurrentQ(0);
      setQuestionError('');
      setPhase('exam');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start assessment');
    } finally {
      setStarting(false);
    }
  };

  const handleSelect = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: answer }));
    setQuestionError('');
  };

  const submitAttempt = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await assessmentService.submit(attempt.id, Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer })));
      setResult(res.data);
      setPhase('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  };

  const answeredCount = Object.keys(answers).length;

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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <StatCard icon={HelpCircle} label="Questions" value={assessment.total_questions} />
                      <StatCard icon={Award} label="Pass Score" value={`${assessment.pass_score}%`} />
                      <StatCard icon={Clock} label="Your Progress" value={`${status.progress?.percent || 0}%`} />
                      <StatCard icon={ClipboardList} label="Attempts" value={status.attempts?.length || 0} />
                    </div>

                    <p className="text-gray-700 leading-relaxed">{assessment.description || 'Complete the final assessment to earn your certificate of completion.'}</p>

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
                          {status.attempts?.length ? 'Start New Attempt' : 'Start Assessment'}
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
            <div className="bg-gradient-to-r from-mint-primary to-mint-secondary p-5 text-white">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-bold">{assessment?.title || 'Final Assessment'}</h1>
                  <p className="text-white/80 text-sm mt-1">Attempt #{attempt?.attempt_number}</p>
                </div>
                <span className="px-3 py-1 bg-white/15 rounded-full text-sm">
                  {answeredCount} / {questions.length} answered
                </span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-mint-gold rounded-full transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }}></div>
              </div>
            </div>

            <div className="p-6">
              {error && <ErrorBox message={error} />}

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

                  <div key={currentQ} className="bg-mint-light border border-mint-border rounded-xl p-5">
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
