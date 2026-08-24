import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Clock, 
  MapPin, 
  BookOpen, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Award,
  FileText,
  Download,
  FolderOpen
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, participantService, authService, materialService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const TraineeTrainingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myStatus, setMyStatus] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  useEffect(() => {
    fetchTrainingDetails();
  }, [id]);

  const fetchTrainingDetails = async () => {
    try {
      setLoading(true);
      const res = await trainingService.getById(id);
      setTraining(res.data?.training);

      // Check the user's request status for this training
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const myTrainings = await participantService.getMyTrainings();
        const record = myTrainings.data?.trainings?.find(t => t.training_id === parseInt(id));
        const status = record?.participation_status || null;
        setMyStatus(status);
        if (status === 'approved' || status === 'completed') {
          fetchMaterials();
        }
      }
    } catch (error) {
      console.error('Error fetching training details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const res = await materialService.getByTraining(id);
      setMaterials(res.data?.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!authService.isAuthenticated()) {
      toast.warning('Please login to register for this training');
      navigate('/login');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser?.role !== 'trainee') {
      toast.warning('Only trainees can request enrollment for trainings');
      return;
    }

    if (requesting) return;

    if (!(await confirm('Submit an enrollment request for this training? Your request will need admin approval.', { title: 'Request Enrollment', confirmText: 'Submit Request', variant: 'info' }))) {
      return;
    }

    try {
      setRequesting(true);
      await participantService.requestTraining(id);
      toast.success('Enrollment request submitted! Your request is pending admin approval.');
      setMyStatus('pending');
      fetchTrainingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading training details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!training) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Training Not Found</h2>
          <p className="text-gray-500 mt-2">The training you're looking for doesn't exist.</p>
          <Link to="/trainee/trainings" className="inline-block mt-4 text-mint-primary hover:underline">
            Back to Trainings
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link to="/trainee/trainings" className="flex items-center gap-2 text-gray-500 hover:text-mint-primary transition mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Available Trainings
        </Link>

        {/* Training Card */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-mint-border">
          {/* Header */}
          <div className="bg-gradient-to-r from-mint-primary to-mint-navy p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{training.training_title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    training.status === 'open' ? 'bg-green-500' :
                    training.status === 'in_progress' ? 'bg-blue-500' :
                    training.status === 'completed' ? 'bg-gray-500' :
                    'bg-yellow-500'
                  }`}>
                    {training.status}
                  </span>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                    {training.training_type}
                  </span>
                  {training.is_all_departments && (
                    <span className="px-3 py-1 bg-purple-500/40 rounded-full text-xs font-medium">
                      All Departments
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/70">Capacity</p>
                <p className="text-xl font-bold">{training.capacity} seats</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{training.training_description}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-mint-primary" />
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-800">
                      {new Date(training.start_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(training.start_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-mint-primary" />
                  <div>
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="font-medium text-gray-800">
                      {new Date(training.end_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(training.end_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-mint-primary" />
                  <div>
                    <p className="text-xs text-gray-500">Location / Meeting Link</p>
                    <p className="font-medium text-gray-800">
                      {training.location_or_meeting_link || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-mint-primary" />
                  <div>
                    <p className="text-xs text-gray-500">Available Spots</p>
                    <p className="font-medium text-gray-800">
                      {training.capacity} spots available
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollment Status */}
            {myStatus === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="font-semibold text-yellow-700">Enrollment request pending approval</p>
                  <p className="text-sm text-yellow-600">Once an admin approves your request, you will be officially enrolled.</p>
                </div>
              </div>
            )}

            {myStatus === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-700">You are officially enrolled in this training!</p>
                  <p className="text-sm text-green-600">Begin the learning content and unlock your final assessment.</p>
                </div>
                <button
                  onClick={() => navigate(`/trainee/learn/${id}`)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-mint-accent text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold shrink-0"
                >
                  <BookOpen className="w-4 h-4" />
                  Start Learning
                </button>
              </div>
            )}

            {myStatus === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <Award className="w-6 h-6 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-700">Training completed. Congratulations!</p>
                  <p className="text-sm text-green-600">Continue to your certificate or review the training content.</p>
                </div>
                <button
                  onClick={() => navigate(`/trainee/learn/${id}`)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-semibold shrink-0"
                >
                  <BookOpen className="w-4 h-4" />
                  Review Training
                </button>
              </div>
            )}

            {myStatus === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700">Your enrollment request was rejected</p>
                  <p className="text-sm text-red-600">Please contact the administrator for more information.</p>
                </div>
              </div>
            )}

            {!myStatus && (
              <button
                onClick={handleRequest}
                disabled={requesting}
                className="w-full bg-mint-primary text-white py-3 rounded-xl hover:bg-opacity-90 transition font-semibold disabled:opacity-50"
              >
                {requesting ? 'Submitting...' : 'Request Enrollment'}
              </button>
            )}

            {/* Training Materials */}
            {(myStatus === 'approved' || myStatus === 'completed') && (
              <div className="border-t border-mint-border pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="w-5 h-5 text-mint-primary" />
                  <h3 className="text-base font-semibold text-gray-800">Training Materials</h3>
                </div>

                {materialsLoading ? (
                  <p className="text-sm text-mint-gray">Loading materials...</p>
                ) : materials.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-mint-gray">No materials uploaded for this training yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {materials.map((material) => (
                      <li key={material.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-mint-light transition">
                        <div className="w-9 h-9 bg-mint-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-mint-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{material.file_name}</p>
                          <p className="text-xs text-mint-gray">
                            {material.file_size ? `${(material.file_size / (1024 * 1024)).toFixed(1)} MB` : ''}
                          </p>
                        </div>
                        <a
                          href={materialService.getDownloadUrl(material.file_path)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="border-t border-mint-border pt-4">
              <p className="text-xs text-gray-400">
                Training ID: {training.id} • Created: {new Date(training.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TraineeTrainingDetails;
