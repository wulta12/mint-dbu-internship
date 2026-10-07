import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  FileText,
  Video,
  Link2,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Layers,
  Star,
  X,
  UploadCloud,
  Bot
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import api, { learningService, trainingService } from '../../services/api';
import { confirm } from '../../components/ConfirmDialog';
import TrainerAssistantPanel from '../../components/TrainerAssistantPanel';

const LESSON_TYPES = [
  { value: 'text', label: 'Text / Reading', icon: BookOpen },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'pdf', label: 'PDF File', icon: FileText },
  { value: 'document', label: 'Document / PPT', icon: FileText },
  { value: 'link', label: 'External Link', icon: Link2 }
];

const TYPE_META = {
  text: { icon: BookOpen, label: 'Reading' },
  video: { icon: Video, label: 'Video' },
  pdf: { icon: FileText, label: 'PDF' },
  document: { icon: FileText, label: 'Document' },
  link: { icon: Link2, label: 'Link' }
};

const FILE_ACCEPT = {
  pdf: '.pdf',
  document: '.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.mp4,.webm,.ogg,.jpg,.jpeg,.png'
};

const emptyLessonForm = (moduleId) => ({
  title: '',
  type: 'text',
  module_id: moduleId || '',
  is_required: true,
  is_published: true,
  content: '',
  video_url: '',
  video_progress_threshold: 80,
  external_url: ''
});

const CourseBuilder = () => {
  const { trainingId } = useParams();
  const [training, setTraining] = useState(null);
  const [tree, setTree] = useState({ modules: [], unassigned: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Module modal
  const [moduleModal, setModuleModal] = useState(null); // { editing } | null
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');

  // Lesson modal
  const [lessonModal, setLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm(''));
  const [lessonFile, setLessonFile] = useState(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const fileInputRef = useRef(null);

  const fetchTree = async () => {
    try {
      const [trainingRes, treeRes] = await Promise.all([
        trainingService.getById(trainingId),
        learningService.getCourseTree(trainingId)
      ]);
      setTraining(trainingRes.data?.training || trainingRes.training || null);
      setTree(treeRes.data || { modules: [], unassigned: [] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId]);

  const showError = (msg) => setError(msg);
  const clearError = () => setError('');

  // ---------------- Module actions ----------------

  const openCreateModule = () => {
    setModuleModal({ editing: null });
    setModuleTitle('');
    setModuleDescription('');
  };

  const openEditModule = (module) => {
    setModuleModal({ editing: module });
    setModuleTitle(module.title);
    setModuleDescription(module.description || '');
  };

  const saveModule = async () => {
    if (!moduleTitle.trim()) {
      showError('Module title is required');
      return;
    }
    setSaving(true);
    clearError();
    try {
      if (moduleModal.editing) {
        await learningService.updateModule(moduleModal.editing.id, {
          title: moduleTitle.trim(),
          description: moduleDescription.trim()
        });
      } else {
        await learningService.createModule(trainingId, {
          title: moduleTitle.trim(),
          description: moduleDescription.trim()
        });
      }
      setModuleModal(null);
      await fetchTree();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (module) => {
    const hasLessons = module.lessons && module.lessons.length > 0;
    const msg = hasLessons
      ? `Delete module "${module.title}"? Its lessons will be moved to unassigned.`
      : `Delete module "${module.title}"?`;
    if (!(await confirm(msg, { title: 'Delete Module', confirmText: 'Delete' }))) return;
    setSaving(true);
    clearError();
    try {
      await learningService.deleteModule(module.id);
      await fetchTree();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete module');
    } finally {
      setSaving(false);
    }
  };

  const moveModule = async (module, dir) => {
    const idx = tree.modules.findIndex((m) => Number(m.id) === Number(module.id));
    const target = idx + dir;
    if (target < 0 || target >= tree.modules.length) return;
    const next = [...tree.modules];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSaving(true);
    clearError();
    try {
      await learningService.reorderModules(trainingId, next.map((m) => m.id));
      await fetchTree();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reorder modules');
    } finally {
      setSaving(false);
    }
  };

  // ---------------- Lesson actions ----------------

  const openCreateLesson = (moduleId) => {
    setEditingLesson(null);
    setLessonForm(emptyLessonForm(moduleId));
    setLessonFile(null);
    setLessonModal(true);
  };

  const openEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title || '',
      type: lesson.type || 'text',
      module_id: lesson.module_id ? String(lesson.module_id) : '',
      is_required: lesson.is_required,
      is_published: lesson.is_published,
      content: lesson.content || '',
      video_url: lesson.video_url || '',
      video_progress_threshold: lesson.video_progress_threshold || 80,
      external_url: lesson.external_url || ''
    });
    setLessonFile(null);
    setLessonModal(true);
  };

  const setLessonField = (field, value) => {
    setLessonForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---------------- Trainer AI draft handlers ----------------
  // A draft is only a starting point: it lands in the normal editing form so the
  // trainer reviews and edits it before anything is saved.

  const useAiLessonDraft = (draft) => {
    setEditingLesson(null);
    setLessonForm({
      ...emptyLessonForm(''),
      title: draft.title || '',
      type: 'text',
      content: draft.content || ''
    });
    setLessonFile(null);
    setLessonModal(true);
    setAiPanelOpen(false);
  };

  const useAiModuleDraft = (draft) => {
    setModuleModal({ editing: null });
    setModuleTitle(draft.title || '');
    setModuleDescription(draft.description || '');
    setAiPanelOpen(false);
  };

  const toggleLessonPublish = async (lesson) => {
    setSaving(true);
    clearError();
    try {
      await learningService.updateLesson(lesson.id, { is_published: !lesson.is_published });
      await fetchTree();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update lesson');
    } finally {
      setSaving(false);
    }
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) {
      showError('Lesson title is required');
      return;
    }
    if (lessonForm.type === 'text' && !lessonForm.content.trim()) {
      showError('Please write some lesson content');
      return;
    }
    if (lessonForm.type === 'video' && !lessonForm.video_url.trim()) {
      showError('Please provide a video URL (YouTube / MP4 link)');
      return;
    }
    if (lessonForm.type === 'link' && !lessonForm.external_url.trim()) {
      showError('Please provide the external link URL');
      return;
    }
    if ((lessonForm.type === 'pdf' || lessonForm.type === 'document') && !editingLesson && !lessonFile) {
      showError('Please choose a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('title', lessonForm.title.trim());
    formData.append('type', lessonForm.type);
    if (lessonForm.module_id) {
      formData.append('module_id', lessonForm.module_id);
    } else {
      formData.append('module_id', '');
    }
    formData.append('is_required', lessonForm.is_required ? 'true' : 'false');
    formData.append('is_published', lessonForm.is_published ? 'true' : 'false');

    if (lessonForm.type === 'text') {
      formData.append('content', lessonForm.content);
    }
    if (lessonForm.type === 'video') {
      formData.append('video_url', lessonForm.video_url.trim());
      formData.append('video_progress_threshold', lessonForm.video_progress_threshold || 80);
    }
    if (lessonForm.type === 'link') {
      formData.append('external_url', lessonForm.external_url.trim());
    }
    if (lessonFile) {
      formData.append('file', lessonFile);
    }

    setSaving(true);
    clearError();
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingLesson) {
        await api.put(`/learning/lessons/${editingLesson.id}`, formData, config);
      } else {
        await api.post(`/learning/trainings/${trainingId}/lessons`, formData, config);
      }
      setLessonModal(false);
      setEditingLesson(null);
      await fetchTree();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lesson) => {
    if (!(await confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`, { title: 'Delete Lesson', confirmText: 'Delete' }))) return;
    setSaving(true);
    clearError();
    try {
      await learningService.deleteLesson(lesson.id);
      await fetchTree();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete lesson');
    } finally {
      setSaving(false);
    }
  };

  const moveLesson = async (lesson, dir) => {
    const containerOf = (l) => (l.module_id ? `m-${l.module_id}` : 'unassigned');
    const ordered = [];
    tree.modules.forEach((m) => ordered.push(...m.lessons));
    ordered.push(...tree.unassigned);
    const idx = ordered.findIndex((l) => Number(l.id) === Number(lesson.id));
    const target = idx + dir;
    if (target < 0 || target >= ordered.length) return;
    if (containerOf(ordered[idx]) !== containerOf(ordered[target])) return;
    [ordered[idx], ordered[target]] = [ordered[target], ordered[idx]];
    setSaving(true);
    clearError();
    try {
      await learningService.reorderLessons(trainingId, ordered.map((l) => l.id));
      await fetchTree();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reorder lessons');
    } finally {
      setSaving(false);
    }
  };

  // ---------------- Render helpers ----------------

  const renderLesson = (lesson, index, list) => {
    const meta = TYPE_META[lesson.type] || TYPE_META.text;
    const Icon = meta.icon;
    return (
      <div
        key={lesson.id}
        className={`flex items-center gap-3 px-4 py-3 border rounded-lg transition ${
          lesson.is_published
            ? 'bg-white border-mint-border'
            : 'bg-yellow-50 border-yellow-200'
        }`}
      >
        <span className="w-6 h-6 rounded-full bg-mint-light text-mint-gray text-xs flex items-center justify-center font-semibold shrink-0">
          {index + 1}
        </span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${lesson.is_published ? 'bg-mint-primary/10 text-mint-primary' : 'bg-yellow-100 text-yellow-700'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{lesson.title}</p>
          <p className="text-xs text-mint-gray flex items-center gap-2">
            <span className="capitalize">{meta.label}</span>
            {lesson.is_required && (
              <span className="inline-flex items-center gap-0.5 text-mint-primary">
                <Star className="w-3 h-3" /> Required
              </span>
            )}
            {!lesson.is_published && (
              <span className="inline-flex items-center gap-0.5 text-yellow-700">
                <EyeOff className="w-3 h-3" /> Unpublished
              </span>
            )}
            {lesson.file_name && <span className="truncate max-w-[180px]">{lesson.file_name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => moveLesson(lesson, -1)} disabled={index === 0} title="Move up" className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition disabled:opacity-30 disabled:pointer-events-none">
            <ArrowUp className="w-4 h-4" />
          </button>
          <button onClick={() => moveLesson(lesson, 1)} disabled={index === list.length - 1} title="Move down" className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition disabled:opacity-30 disabled:pointer-events-none">
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleLessonPublish(lesson)}
            title={lesson.is_published ? 'Unpublish' : 'Publish'}
            className={`p-1.5 rounded-lg transition ${lesson.is_published ? 'text-mint-primary hover:bg-mint-light' : 'text-yellow-700 hover:bg-yellow-100'}`}
          >
            {lesson.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button onClick={() => openEditLesson(lesson)} title="Edit" className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => deleteLesson(lesson)} title="Delete" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading course content...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Course Builder</h1>
              <p className="text-mint-gray">{training?.training_title || 'Training'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAiPanelOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-mint-primary text-mint-primary rounded-lg hover:bg-mint-light transition text-sm font-semibold"
              >
                <Bot className="w-4 h-4" /> AI Assistant
              </button>
              <button
                onClick={openCreateModule}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> New Module
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-mint-gray bg-mint-light border border-mint-border rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-mint-primary shrink-0 mt-0.5" />
            <span>
              Build your course with modules and lessons. Lessons only become visible to enrolled trainees after they are{' '}
              <strong className="text-mint-primary">published</strong> (eye icon). Only published lessons count toward trainee progress.
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {tree.modules.length === 0 && tree.unassigned.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-12 text-center">
            <Layers className="w-16 h-16 text-mint-gray mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-mint-primary">No Learning Activities Yet</h3>
            <p className="text-mint-gray text-sm mt-1">
              Create a module, then add lessons inside it. Don't forget to publish them so trainees can see them.
            </p>
            <button
              onClick={openCreateModule}
              className="mt-4 px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition"
            >
              Create First Module
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {tree.modules.map((module, moduleIndex) => (
              <div key={module.id} className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 bg-mint-light/60 border-b border-mint-border">
                  <div className="w-10 h-10 bg-mint-primary text-white rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-mint-primary truncate">{module.title}</p>
                    <p className="text-xs text-mint-gray truncate">
                      {module.lessons?.length || 0} lesson{(module.lessons?.length || 0) === 1 ? '' : 's'}
                      {module.description ? ` - ${module.description}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveModule(module, -1)} disabled={moduleIndex === 0} title="Move module up" className="p-1.5 text-mint-gray hover:bg-white rounded-lg transition disabled:opacity-30 disabled:pointer-events-none">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveModule(module, 1)} disabled={moduleIndex === tree.modules.length - 1} title="Move module down" className="p-1.5 text-mint-gray hover:bg-white rounded-lg transition disabled:opacity-30 disabled:pointer-events-none">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditModule(module)} title="Edit module" className="p-1.5 text-mint-gray hover:bg-white rounded-lg transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteModule(module)} title="Delete module" className="p-1.5 text-red-500 hover:bg-white rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {(module.lessons || []).length === 0 ? (
                    <p className="text-sm text-mint-gray text-center py-4">No lessons in this module yet.</p>
                  ) : (
                    (module.lessons || []).map((lesson, i) => renderLesson(lesson, i, module.lessons))
                  )}
                  <button
                    onClick={() => openCreateLesson(module.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-mint-border text-mint-primary rounded-lg hover:border-mint-primary hover:bg-mint-light/40 transition text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Add Lesson
                  </button>
                </div>
              </div>
            ))}

            {tree.unassigned.length > 0 && (
              <div className="bg-white rounded-xl shadow-card border border-mint-border overflow-hidden">
                <div className="px-5 py-4 bg-yellow-50 border-b border-yellow-200">
                  <p className="font-bold text-yellow-800">Unassigned Lessons</p>
                  <p className="text-xs text-yellow-700">Lessons without a module</p>
                </div>
                <div className="p-4 space-y-2">
                  {tree.unassigned.map((lesson, i) => renderLesson(lesson, i, tree.unassigned))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- Trainer AI assistant (gated by the admin switch) ---------- */}
        {aiPanelOpen && (
          <TrainerAssistantPanel
            trainingId={trainingId}
            trainingTitle={training?.training_title}
            onUseLessonDraft={useAiLessonDraft}
            onUseModuleDraft={useAiModuleDraft}
            onClose={() => setAiPanelOpen(false)}
          />
        )}

        {/* ---------- Module modal ---------- */}
        {moduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setModuleModal(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {moduleModal.editing ? 'Edit Module' : 'New Module'}
                </h3>
                <button onClick={() => setModuleModal(null)} className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-mint-primary mb-1.5">Module Title *</label>
                  <input
                    type="text"
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="e.g. Introduction to Web Development"
                    className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-mint-primary mb-1.5">Description</label>
                  <textarea
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    rows={3}
                    placeholder="What will trainees learn in this module?"
                    className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setModuleModal(null)}
                  className="px-4 py-2 rounded-lg border border-mint-border text-gray-700 hover:bg-mint-light transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveModule}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-mint-primary text-white hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {moduleModal.editing ? 'Save Changes' : 'Create Module'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Lesson modal ---------- */}
        {lessonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setLessonModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingLesson ? 'Edit Lesson' : 'New Lesson'}
                </h3>
                <button onClick={() => setLessonModal(false)} className="p-1.5 text-mint-gray hover:bg-mint-light rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-mint-primary mb-1.5">Lesson Title *</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonField('title', e.target.value)}
                    placeholder="e.g. HTML Basics"
                    className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-mint-primary mb-1.5">Lesson Type *</label>
                    <select
                      value={lessonForm.type}
                      onChange={(e) => setLessonField('type', e.target.value)}
                      className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                    >
                      {LESSON_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-mint-primary mb-1.5">Module</label>
                    <select
                      value={lessonForm.module_id}
                      onChange={(e) => setLessonField('module_id', e.target.value)}
                      className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                    >
                      <option value="">Unassigned</option>
                      {tree.modules.map((m) => (
                        <option key={m.id} value={String(m.id)}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {lessonForm.type === 'text' && (
                  <div>
                    <label className="block text-sm font-semibold text-mint-primary mb-1.5">Content *</label>
                    <textarea
                      value={lessonForm.content}
                      onChange={(e) => setLessonField('content', e.target.value)}
                      rows={6}
                      placeholder="Write the lesson content here..."
                      className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary resize-y"
                    />
                  </div>
                )}

                {lessonForm.type === 'video' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-mint-primary mb-1.5">Video URL *</label>
                      <input
                        type="text"
                        value={lessonForm.video_url}
                        onChange={(e) => setLessonField('video_url', e.target.value)}
                        placeholder="https://youtube.com/... or .mp4 link"
                        className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-mint-primary mb-1.5">Auto-complete at % (default 80)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={lessonForm.video_progress_threshold}
                        onChange={(e) => setLessonField('video_progress_threshold', Number(e.target.value))}
                        className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                      />
                    </div>
                  </div>
                )}

                {(lessonForm.type === 'pdf' || lessonForm.type === 'document') && (
                  <div>
                    <label className="block text-sm font-semibold text-mint-primary mb-1.5">
                      {lessonForm.type === 'pdf' ? 'PDF File' : 'File (Word / PPT / Excel / etc.)'}
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-mint-border rounded-xl p-6 text-center hover:border-mint-primary hover:bg-mint-light/40 transition cursor-pointer"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={FILE_ACCEPT[lessonForm.type]}
                        onChange={(e) => {
                          setLessonFile(e.target.files?.[0] || null);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                      {lessonFile ? (
                        <p className="text-sm font-medium text-mint-primary">{lessonFile.name}</p>
                      ) : editingLesson && editingLesson.file_name ? (
                        <p className="text-sm text-mint-gray">
                          Current file: <span className="text-mint-primary">{editingLesson.file_name}</span>
                          <span className="block text-xs mt-1">Click to replace</span>
                        </p>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <UploadCloud className="w-8 h-8 text-mint-primary" />
                          <p className="text-sm text-mint-gray">Click to choose a file</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {lessonForm.type === 'link' && (
                  <div>
                    <label className="block text-sm font-semibold text-mint-primary mb-1.5">External URL *</label>
                    <input
                      type="text"
                      value={lessonForm.external_url}
                      onChange={(e) => setLessonField('external_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lessonForm.is_required}
                      onChange={(e) => setLessonField('is_required', e.target.checked)}
                      className="w-4 h-4 text-mint-primary rounded"
                    />
                    Required (counts toward progress)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lessonForm.is_published}
                      onChange={(e) => setLessonField('is_published', e.target.checked)}
                      className="w-4 h-4 text-mint-primary rounded"
                    />
                    Publish (visible to trainees)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setLessonModal(false)}
                  className="px-4 py-2 rounded-lg border border-mint-border text-gray-700 hover:bg-mint-light transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveLesson}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-mint-primary text-white hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingLesson ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </div>
          </div>
        )}

        {saving && (
          <div className="fixed bottom-6 right-6 z-50 bg-mint-primary text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Saving...
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CourseBuilder;
