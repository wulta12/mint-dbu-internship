import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Loader2,
  BookOpen,
  FolderOpen
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { materialService, trainingService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.mp4,.jpg,.jpeg,.png';

const TrainerMaterials = () => {
  const { trainingId } = useParams();
  const [training, setTraining] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [trainingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trainingRes, materialsRes] = await Promise.all([
        trainingService.getById(trainingId),
        materialService.getByTraining(trainingId)
      ]);
      setTraining(trainingRes.data?.training || trainingRes.training || null);
      setMaterials(materialsRes.data?.materials || materialsRes.materials || []);
    } catch (err) {
      console.error('Error fetching materials data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
    e.target.value = '';
  };

  const uploadFile = async (file) => {
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      await materialService.upload(trainingId, file, (p) => setProgress(p));
      toast.success('Material uploaded successfully!');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (material) => {
    if (!(await confirm(`Delete "${material.file_name}"? This cannot be undone.`, { title: 'Delete Material', confirmText: 'Delete' }))) {
      return;
    }
    try {
      await materialService.remove(material.id);
      setMaterials(prev => prev.filter(m => m.id !== material.id));
      toast.success('Material deleted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete material');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading materials...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Training Materials</h1>
              <p className="text-mint-gray">Training: {training?.training_title || 'Not found'}</p>
            </div>
            <Link
              to={`/trainer/course-builder/${trainingId}`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-mint-gold text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold"
            >
              <BookOpen className="w-4 h-4" />
              Build Course & Publish Lessons
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-4 bg-mint-light border border-mint-border rounded-lg px-4 py-3 text-sm text-mint-gray flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-mint-primary shrink-0 mt-0.5" />
          <span>
            Note: Files uploaded here are downloadable materials only. To make trainees see them as learning activities
            (and count toward their progress), use the <Link to={`/trainer/course-builder/${trainingId}`} className="text-mint-primary font-semibold hover:underline">Course Builder</Link> instead.
          </span>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Upload New Material</h3>
          <div
            className="border-2 border-dashed border-mint-border rounded-xl p-8 text-center hover:border-mint-primary hover:bg-mint-light/40 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileSelect}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-mint-primary animate-spin" />
                <p className="text-sm font-medium text-mint-primary">Uploading... {progress}%</p>
                <div className="w-full max-w-md h-2 bg-mint-light rounded-full overflow-hidden">
                  <div className="h-full bg-mint-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <UploadCloud className="w-10 h-10 text-mint-primary" />
                <p className="text-sm font-medium text-gray-700">
                  Click to choose a file or drag & drop
                </p>
                <p className="text-xs text-mint-gray">
                  PDF, Word, PowerPoint, Excel, text, ZIP, MP4 or images (max 25 MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Materials List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-mint-primary" />
              Uploaded Materials ({materials.length})
            </h3>
          </div>

          {materials.length === 0 ? (
            <div className="p-10 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-mint-gray">No materials uploaded yet.</p>
              <p className="text-xs text-mint-gray mt-1">
                Upload PDFs and documents so enrolled trainees can download them.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {materials.map((material) => (
                <li key={material.id} className="px-6 py-4 flex items-center gap-4 hover:bg-mint-light/40 transition">
                  <div className="w-10 h-10 bg-mint-light rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-mint-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{material.file_name}</p>
                    <p className="text-xs text-mint-gray">
                      {formatSize(material.file_size)} • {material.file_type || 'document'} • Uploaded {formatDate(material.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={materialService.getDownloadUrl(material.file_path)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-mint-primary hover:bg-mint-light rounded-lg transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(material)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default TrainerMaterials;
