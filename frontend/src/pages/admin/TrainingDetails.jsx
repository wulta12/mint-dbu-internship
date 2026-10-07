import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Video } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService } from '../../services/api';
import MeetingsManager from '../../components/MeetingsManager';
import mintLogo from '../../images/mint-logo.png';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';
import { useLanguage } from '../../i18n/LanguageContext';

const TrainingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMeetings, setShowMeetings] = useState(false);

  useEffect(() => {
    fetchTraining();
  }, [id]);

  const fetchTraining = async () => {
    try {
      const res = await trainingService.getById(id);
      setTraining(res.data?.training);
    } catch (error) {
      console.error('Failed to fetch training:', error);
      toast.warning('Training not found');
      navigate('/admin/trainings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm('Are you sure you want to delete this training?', { title: 'Delete Training', confirmText: 'Delete' })) {
      try {
        await trainingService.delete(id);
        toast.success('Training deleted successfully!');
        navigate('/admin/trainings');
      } catch (error) {
        toast.error('Failed to delete training');
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading training details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!training) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-mint-primary">Training Not Found</h2>
          <Link to="/admin/trainings" className="text-mint-accent hover:underline mt-4 inline-block">
            Back to Trainings
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <img 
          src={mintLogo} 
          alt="MinT Logo" 
          className="h-10 w-auto object-contain"
        />
        <div>
          <h1 className="text-2xl font-bold text-mint-primary">Training Details</h1>
          <p className="text-mint-gray">View complete training information</p>
        </div>
      </div>

      {/* Back Button */}
      <Link to="/admin/trainings" className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Trainings
      </Link>

      {/* Training Card */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-mint-border">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-mint-primary">{training.training_title}</h2>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                training.status === 'open' ? 'bg-green-100 text-green-700' :
                training.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                training.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {training.status}
              </span>
              {training.is_all_departments && (
                <span className="inline-block mt-2 ml-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                  All Departments
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Link 
                to={`/admin/trainings/${training.id}/edit`}
                className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button 
                onClick={handleDelete}
                className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-mint-gray mb-1">Description</h3>
            <p className="text-mint-primary">{training.training_description || 'No description provided'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-mint-gray mb-1">Training Type</h3>
              <p className="text-mint-primary">{training.training_type}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-mint-gray mb-1">Capacity</h3>
              <p className="text-mint-primary">{training.capacity} participants</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-mint-gray mb-1">Start Date</h3>
              <p className="text-mint-primary">{new Date(training.start_date).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-mint-gray mb-1">End Date</h3>
              <p className="text-mint-primary">{new Date(training.end_date).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-mint-gray mb-1">Location / Meeting Link</h3>
            <p className="text-mint-primary">{training.location_or_meeting_link || 'Not specified'}</p>
          </div>

          <div className="pt-4 border-t border-mint-border">
            <h3 className="text-sm font-semibold text-mint-gray mb-2">Trainer Information</h3>
            <p className="text-mint-primary">{training.trainer_name || 'No trainer assigned'}</p>
          </div>

          <div className="pt-4 border-t border-mint-border">
            <h3 className="text-sm font-semibold text-mint-gray mb-2">Participants</h3>
            <p className="text-mint-primary">{training.current_participants || 0} participants registered</p>
          </div>
        </div>
      </div>

      {/* Live meetings for this training. Collapsed by default so the
          existing training detail view is unchanged until an admin asks
          for it. Admin may manage meetings on ANY training. */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden mt-6">
        <button
          onClick={() => setShowMeetings((v) => !v)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-mint-light transition"
        >
          <span className="flex items-center gap-2">
            <Video className="w-5 h-5 text-mint-primary" />
            <span className="text-lg font-bold text-mint-primary">{t('Live Meetings')}</span>
          </span>
          <span className="text-sm text-mint-gray">{showMeetings ? t('Hide') : t('Manage')}</span>
        </button>

        {showMeetings && (
          <div className="p-6 pt-0">
            <MeetingsManager trainingId={id} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainingDetails;
