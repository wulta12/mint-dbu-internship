import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ClipboardList,
  HelpCircle,
  X,
  Star
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { assessmentService, trainingService } from '../../services/api';
import { confirm } from '../../components/ConfirmDialog';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const emptyQuestionForm = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A'
};

const AssessmentBuilder = () => {
  const { trainingId } = useParams();
  const [training, setTraining] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Assessment settings
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passScore, setPassScore] = useState(70);
  const [isPublished, setIsPublished] = useState(false);

  // Question modal
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);

  const fetchData = async () => {
    try {
      const [trainingRes, manageRes] = await Promise.all([
        trainingService.getById(trainingId),
        assessmentService.manage(trainingId)
      ]);
      setTraining(trainingRes.data?.training || trainingRes.training || null);
      const a = manageRes.data?.assessment || null;
      const qs = manageRes.data?.questions || [];
      setAssessment(a);
      setQuestions(qs);
      setTitle(a?.title || 'Final Assessment');
      setDescription(a?.description || '');
      setPassScore(a?.pass_score || 70);
      setIsPublished(a?.is_published === true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId]);

  const showError = (msg) => setError(msg);
  const clearError = () => setError('');

  // ---------------- Assessment settings ----------------

  const saveSettings = async () => {
    if (!title.trim()) {
      showError('Assessment title is required');
      return;
    }
    const score = Number(passScore);
    if (isNaN(score) || score < 1 || score > 100) {
      showError('Pass score must be between 1 and 100');
      return;
    }
    setSaving(true);
    clearError();
    try {
      const res = await assessmentService.upsert(trainingId, {
        title: title.trim(),
        description: description.trim(),
        pass_score: score,
        is_published: isPublished
      });
      setAssessment(res.data?.assessment || assessment);
      await fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setSaving(true);
    clearError();
    try {
      await assessmentService.upsert(trainingId, {
        title: (title || 'Final Assessment').trim(),
        description: description.trim(),
        pass_score: Number(passScore) || 70,
        is_published: !isPublished
      });
      setIsPublished(!isPublished);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update assessment');
    } finally {
      setSaving(false);
    }
  };

  // ---------------- Questions ----------------

  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm(emptyQuestionForm);
    setQuestionModal(true);
  };

  const openEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text || '',
      option_a: question.option_a || '',
      option_b: question.option_b || '',
      option_c: question.option_c || '',
      option_d: question.option_d || '',
      correct_answer: question.correct_answer || 'A'
    });
    setQuestionModal(true);
  };

  const setQuestionField = (field, value) => {
    setQuestionForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveQuestion = async () => {
    if (!assessment) {
      showError('Please save the assessment settings first');
      return;
    }
    if (!questionForm.question_text.trim()) {
      showError('Question text is required');
      return;
    }
    const options = OPTION_LABELS.filter((label) => questionForm[`option_${label.toLowerCase()}`].trim());
    if (options.length < 2) {
      showError('Please provide at least two answer options');
      return;
    }
    if (!options.includes(questionForm.correct_answer)) {
      showError('The correct answer must be one of the provided options');
      return;
    }

    const payload = {
      question_text: questionForm.question_text.trim(),
      option_a: questionForm.option_a.trim(),
      option_b: questionForm.option_b.trim(),
      option_c: questionForm.option_c.trim(),
      option_d: questionForm.option_d.trim(),
      correct_answer: questionForm.correct_answer
    };

    setSaving(true);
    clearError();
    try {
      if (editingQuestion) {
        await assessmentService.updateQuestion(editingQuestion.id, payload);
      } else {
        await assessmentService.addQuestion(assessment.id, payload);
      }
      setQuestionModal(false);
      setEditingQuestion(null);
      await fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (question) => {
    if (!(await confirm(`Delete this question? This cannot be undone.`, { title: 'Delete Question', confirmText: 'Delete' }))) return;
    setSaving(true);
    clearError();
    try {
      await assessmentService.deleteQuestion(question.id);
      await fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete question');
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = async (question, dir) => {
    const idx = questions.findIndex((q) => Number(q.id) === Number(question.id));
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSaving(true);
    clearError();
    try {
      await assessmentService.reorderQuestions(assessment.id, next.map((q) => q.id));
      await fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reorder questions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading assessment...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to="/trainer/trainings" className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to My Trainings
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assessment Builder</h1>
              <p className="text-mint-gray">{training?.training_title || 'Training'}</p>
            </div>
            <button
              onClick={togglePublish}
              disabled={saving || !assessment}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition text-sm font-semibold disabled:opacity-50 ${
                isPublished ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-mint-accent text-white hover:bg-opacity-90'
              }`}
            >
              {isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isPublished ? 'Unpublish Assessment' : 'Publish Assessment'}
            </button>
          </div>
          <div className="mt-2 text-sm text-mint-gray bg-mint-light border border-mint-border rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-mint-primary shrink-0 mt-0.5" />
            <span>
              After a trainee completes at least 75% of the published lessons and{' '}
              <strong className="text-mint-primary">passes this assessment</strong>, their certificate is issued automatically.
              Only publish the assessment once its questions are ready.
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Assessment settings */}
        <div className="bg-white rounded-xl shadow-card border border-mint-border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-mint-primary" />
            <h2 className="text-lg font-bold text-gray-900">Assessment Settings</h2>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {isPublished ? 'Published' : 'Not published'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-mint-primary mb-1.5">Assessment Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Web Development Final Assessment"
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1.5">Pass Score (%) *</label>
              <input
                type="number"
                min="1"
                max="100"
                value={passScore}
                onChange={(e) => setPassScore(e.target.value)}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-mint-primary mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Instructions shown to trainees before they start."
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary resize-none"
            />
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-mint-primary text-white hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Settings
            </button>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-mint-border bg-mint-light/60">
            <HelpCircle className="w-5 h-5 text-mint-primary" />
            <h2 className="font-bold text-gray-900">Questions ({questions.length})</h2>
            <button
              onClick={openCreateQuestion}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="p-10 text-center">
              <HelpCircle className="w-12 h-12 text-mint-gray mx-auto mb-3" />
              <p className="text-mint-gray">No questions yet.</p>
              <p className="text-xs text-mint-gray mt-1">Add questions, then publish the assessment when ready.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {questions.map((question, index) => (
                <div key={question.id} className="flex items-start gap-3 p-4 border border-mint-border rounded-xl">
                  <span className="w-7 h-7 rounded-full bg-mint-primary text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{question.question_text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {OPTION_LABELS.map((label) => {
                        const value = question[`option_${label.toLowerCase()}`];
                        if (!value) return null;
                        const correct = String(question.correct_answer).toUpperCase() === label;
                        return (
                          <span
                            key={label}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
                              correct ? 'bg-green-100 text-green-700 font-semibold' : 'bg-mint-light text-mint-gray'
                            }`}
                          >
                            {label}. {value}
                            {correct && <Star className="w-3 h-3" />}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveQuestion(question, -1)} disabled={index === 0} title="Move up" className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition disabled:opacity-30 disabled:pointer-events-none">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveQuestion(question, 1)} disabled={index === questions.length - 1} title="Move down" className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition disabled:opacity-30 disabled:pointer-events-none">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditQuestion(question)} title="Edit" className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteQuestion(question)} title="Delete" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question modal */}
        {questionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setQuestionModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingQuestion ? 'Edit Question' : 'New Question'}
                </h3>
                <button onClick={() => setQuestionModal(false)} className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-mint-primary mb-1.5">Question *</label>
                  <textarea
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionField('question_text', e.target.value)}
                    rows={3}
                    placeholder="Type the question here..."
                    className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {OPTION_LABELS.map((label) => (
                    <div key={label}>
                      <label className="block text-sm font-semibold text-mint-primary mb-1.5">Option {label}</label>
                      <input
                        type="text"
                        value={questionForm[`option_${label.toLowerCase()}`]}
                        onChange={(e) => setQuestionField(`option_${label.toLowerCase()}`, e.target.value)}
                        placeholder={`Option ${label}`}
                        className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-mint-primary mb-1.5">Correct Answer *</label>
                  <select
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionField('correct_answer', e.target.value)}
                    className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                  >
                    {OPTION_LABELS.map((label) => (
                      <option key={label} value={label}>Option {label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setQuestionModal(false)}
                  className="px-4 py-2 rounded-lg border border-mint-border text-gray-700 hover:bg-mint-light transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveQuestion}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-mint-primary text-white hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingQuestion ? 'Save Changes' : 'Add Question'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AssessmentBuilder;
