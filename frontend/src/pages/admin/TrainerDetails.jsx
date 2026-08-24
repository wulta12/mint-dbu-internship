import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  GraduationCap,
  Award,
  FileText,
  BookOpen,
  Calendar
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Avatar from '../../components/Avatar';
import { userService, trainingService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const TrainerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, trainingsRes] = await Promise.all([
        userService.getById(id),
        trainingService.getAll()
      ]);
      const user = userRes.data?.user;
      if (!user || user.role !== 'trainer') {
        toast.warning('Trainer not found');
        navigate('/admin/trainers');
        return;
      }
      setTrainer(user);
      setTrainings((trainingsRes.data?.trainings || []).filter(t => String(t.trainer_id) === String(id)));
    } catch (error) {
      console.error('Failed to fetch trainer:', error);
      toast.warning('Trainer not found');
      navigate('/admin/trainers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm(`Delete trainer "${trainer?.full_name}"? This will also remove their account and cannot be undone.`, { title: 'Delete Trainer', confirmText: 'Delete' }))) {
      return;
    }
    try {
      await userService.delete(id);
      toast.success('Trainer deleted successfully!');
      navigate('/admin/trainers');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete trainer');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading trainer details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <Link to="/admin/trainers" className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Trainers
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 text-center">
              <div className="mx-auto w-fit">
                <Avatar user={trainer} size="xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-4">{trainer?.full_name}</h2>
              <p className="text-sm text-gray-500">Trainer</p>
              <p className="text-sm text-mint-primary mt-1">{trainer?.email}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-mint-light rounded-full">
                <Building2 className="w-4 h-4 text-mint-primary" />
                <span className="text-sm font-medium text-mint-primary">
                  {trainer?.department_name || 'No department assigned'}
                </span>
              </div>
              <div className="mt-4 flex justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  trainer?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {trainer?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2 mt-6">
                <Link
                  to={`/admin/trainers/${id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-mint-gray" />
                  <span className="text-sm text-gray-600">{trainer?.email || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-mint-gray" />
                  <span className="text-sm text-gray-600">{trainer?.phone || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-mint-gray" />
                  <span className="text-sm text-gray-600">
                    {trainer?.created_at ? `Member since ${new Date(trainer.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'Not available'}
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Professional Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-mint-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-mint-gray">Specialization</p>
                    <p className="text-sm font-medium text-gray-800">{trainer?.specialization || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-mint-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-mint-gray">Qualification</p>
                    <p className="text-sm font-medium text-gray-800">{trainer?.qualification || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-mint-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-mint-gray">Biography</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{trainer?.biography || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Trainings */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800">Assigned Trainings</h3>
                <span className="px-2 py-0.5 rounded-full bg-mint-light text-mint-primary text-xs font-medium">
                  {trainings.length} training{trainings.length !== 1 ? 's' : ''}
                </span>
              </div>
              {trainings.length === 0 ? (
                <div className="text-center py-6">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-mint-gray">No trainings assigned to this trainer yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {trainings.map((training) => (
                    <li key={training.id} className="py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{training.training_title}</p>
                        <p className="text-xs text-mint-gray">
                          {training.training_type} • {training.start_date ? new Date(training.start_date).toLocaleDateString() : 'TBD'}
                        </p>
                      </div>
                      <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        training.status === 'open' ? 'bg-green-100 text-green-700' :
                        training.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        training.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {training.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TrainerDetails;
