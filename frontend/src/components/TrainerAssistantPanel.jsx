import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  X,
  Sparkles,
  Loader2,
  Lock,
  AlertTriangle,
  FileText,
  ListTree,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  Check
} from 'lucide-react';
import { trainerAssistantService } from '../services/api';
import { toast } from './Toast';

const CONTENT_OPTIONS = [
  {
    value: 'lesson',
    label: 'Lesson draft',
    icon: FileText,
    hint: 'A single reading lesson you can review and edit before saving.'
  },
  {
    value: 'module',
    label: 'Module outline',
    icon: ListTree,
    hint: 'A module containing four structured lessons.'
  },
  {
    value: 'assessment',
    label: 'Assessment questions',
    icon: ClipboardList,
    hint: 'Reviewable questions and marked answers, ready to paste into the assessment builder.'
  }
];

const OPTION_META = CONTENT_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

// Renders a draft as readable text. The drafts use simple markdown
// (## headings, ### headings, numbered and bulleted lists), so we convert the
// handful of tokens we understand instead of pulling in a markdown library.
const DraftBody = ({ text }) => {
  if (!text) return null;
  return (
    <div className="space-y-2">
      {String(text)
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line, index) => {
          if (line.startsWith('### ')) {
            return (
              <p key={index} className="text-sm font-semibold text-gray-900 pt-2">
                {line.slice(4)}
              </p>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <p key={index} className="text-base font-bold text-mint-primary">
                {line.slice(3)}
              </p>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <p key={index} className="text-sm text-gray-700 pl-4 flex gap-2">
                <span className="font-semibold text-mint-primary shrink-0">
                  {line.match(/^(\d+\.)/)[1]}
                </span>
                <span>{line.replace(/^\d+\.\s/, '')}</span>
              </p>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <p key={index} className="text-sm text-gray-700 pl-4 flex gap-2">
                <span className="text-mint-primary shrink-0">&bull;</span>
                <span>{line.slice(2)}</span>
              </p>
            );
          }
          return (
            <p key={index} className="text-sm text-gray-700">
              {line}
            </p>
          );
        })}
    </div>
  );
};

const TrainerAssistantPanel = ({ trainingId, trainingTitle, onUseLessonDraft, onUseModuleDraft, onClose }) => {
  const [status, setStatus] = useState('loading'); // loading | enabled | disabled
  const [contentType, setContentType] = useState('lesson');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await trainerAssistantService.status();
      setStatus(res.data?.enabled ? 'enabled' : 'disabled');
    } catch (err) {
      // If we cannot read the status we must assume the feature is off rather
      // than offering a control the server will reject.
      setStatus('disabled');
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const generate = async () => {
    const cleanTopic = topic.trim();
    if (cleanTopic.length < 3) {
      setError('Please enter a topic of at least 3 characters.');
      return;
    }
    setError('');
    setGenerating(true);
    setResult(null);
    try {
      const res = await trainerAssistantService.generate(
        trainingId,
        cleanTopic,
        contentType,
        contentType === 'assessment' ? questionCount : undefined
      );
      setResult(res.data);
    } catch (err) {
      // 403 here means the admin turned the feature off mid-session.
      if (err.response?.status === 403) {
        setStatus('disabled');
      }
      setError(err.response?.data?.message || 'Could not generate a draft. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const useLessonDraft = () => {
    if (!result?.draft || !onUseLessonDraft) return;
    onUseLessonDraft(result.draft);
    toast.success('Draft added to a new lesson. Review it, then save.');
  };

  const useModuleDraft = () => {
    if (!result?.draft || !onUseModuleDraft) return;
    onUseModuleDraft(result.draft);
    toast.success('Module draft opened. Review it, then save.');
  };

  const copyAssessmentDraft = async () => {
    if (!result?.draft) return;
    const questions = (result.draft.questions || [])
      .map(
        (q, i) =>
          `${i + 1}. ${q.question_text}\n` +
          `   A) ${q.option_a}\n   B) ${q.option_b}\n   C) ${q.option_c}\n   D) ${q.option_d}\n` +
          `   Correct answer: ${q.correct_answer}`
      )
      .join('\n\n');
    const text = `${result.draft.title}\n\n${questions}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Questions copied. Paste them into the assessment builder.');
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  };

  const draft = result?.draft;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={() => !generating && onClose()}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-mint-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-mint-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900">Trainer AI Assistant</h3>
              <p className="text-sm text-mint-gray truncate">
                {trainingTitle || 'This training'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition shrink-0"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'loading' && (
          <div className="py-10 flex items-center justify-center gap-2 text-mint-gray text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking availability&hellip;
          </div>
        )}

        {status === 'disabled' && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-red-500" />
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-1">
              Trainer AI Assistant is disabled
            </h4>
            <p className="text-sm text-mint-gray max-w-md mx-auto">
              An administrator has turned this feature off. The server rejects every Trainer AI
              request while it is disabled, so drafting is unavailable. Ask an administrator to
              enable it from Settings &rarr; AI Assistants.
            </p>
            <button
              onClick={loadStatus}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-mint-primary hover:underline"
            >
              <RefreshCw className="w-4 h-4" /> Check again
            </button>
          </div>
        )}

        {status === 'enabled' && (
          <>
            <div className="bg-mint-light border border-mint-border rounded-lg px-4 py-3 text-xs text-mint-gray flex items-start gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-mint-primary shrink-0 mt-0.5" />
              <span>
                Everything produced here is an <strong>unpublished draft</strong>. Nothing is saved,
                sent to trainees, or derived from trainee results &mdash; you stay responsible for
                reviewing and correcting the content.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {CONTENT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = contentType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setContentType(option.value);
                      setResult(null);
                      setError('');
                    }}
                    title={option.hint}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition ${
                      active
                        ? 'border-mint-primary bg-mint-light ring-1 ring-mint-primary'
                        : 'border-mint-border hover:border-mint-primary/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-mint-primary' : 'text-mint-gray'}`} />
                    <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                    <span className="text-[11px] text-mint-gray leading-tight">{option.hint}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-mint-primary mb-1.5">
                  Topic *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setError('');
                  }}
                  maxLength={200}
                  placeholder="e.g. Workplace safety responsibilities"
                  className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                />
              </div>

              {contentType === 'assessment' && (
                <div>
                  <label className="block text-sm font-semibold text-mint-primary mb-1.5">
                    Number of questions ({questionCount})
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-mint-primary"
                  />
                  <p className="text-xs text-mint-gray mt-1">
                    Draft questions are generic templates. You must verify every question and its
                    marked answer yourself before publishing.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                onClick={generate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating draft&hellip;
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate{' '}
                    {(OPTION_META[contentType]?.label || '').toLowerCase()}
                  </>
                )}
              </button>
            </div>

            {result && draft && (
              <div className="mt-5 border border-mint-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-mint-light/60 border-b border-mint-border flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 truncate">{draft.title}</p>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">
                    DRAFT &mdash; NOT SAVED
                  </span>
                </div>

                <div className="p-4 max-h-80 overflow-y-auto">
                  {result.contentType === 'assessment' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-mint-gray">{draft.description}</p>
                      {(draft.questions || []).map((q, i) => (
                        <div key={i} className="border border-mint-border rounded-lg p-3">
                          <p className="text-sm font-semibold text-gray-900 mb-2">
                            {i + 1}. {q.question_text}
                          </p>
                          <ul className="space-y-1">
                            {['A', 'B', 'C', 'D'].map((letter, li) => {
                              const isCorrect = q.correct_answer === letter;
                              return (
                                <li
                                  key={letter}
                                  className={`text-sm flex gap-2 rounded px-2 py-1 ${
                                    isCorrect
                                      ? 'bg-green-50 text-green-800 font-semibold'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  <span className="shrink-0">{letter})</span>
                                  <span>{q[`option_${letter.toLowerCase()}`]}</span>
                                  {isCorrect && <Check className="w-4 h-4 shrink-0" />}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : result.contentType === 'module' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-mint-gray">{draft.description}</p>
                      {(draft.lessons || []).map((lesson, i) => (
                        <div key={i} className="border border-mint-border rounded-lg p-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {i + 1}. {lesson.title}
                          </p>
                          <div className="mt-2">
                            <DraftBody text={lesson.content} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DraftBody text={draft.content} />
                  )}
                </div>

                {result.note && (
                  <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    {result.note}
                  </div>
                )}

                <div className="px-4 py-3 bg-mint-light/40 border-t border-mint-border flex flex-wrap gap-2">
                  {result.contentType === 'lesson' && onUseLessonDraft && (
                    <button
                      onClick={useLessonDraft}
                      className="px-4 py-2 bg-mint-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition"
                    >
                      Use in a new lesson
                    </button>
                  )}
                  {result.contentType === 'module' && onUseModuleDraft && (
                    <button
                      onClick={useModuleDraft}
                      className="px-4 py-2 bg-mint-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition"
                    >
                      Use as a new module
                    </button>
                  )}
                  {result.contentType === 'assessment' && (
                    <button
                      onClick={copyAssessmentDraft}
                      className="px-4 py-2 bg-mint-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition"
                    >
                      Copy questions
                    </button>
                  )}
                  <button
                    onClick={() => setResult(null)}
                    className="px-4 py-2 border border-mint-border text-mint-gray rounded-lg text-sm font-semibold hover:bg-white transition"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrainerAssistantPanel;
