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
  FolderOpen,
  XCircle,
  Video
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, participantService, authService, materialService, meetingService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';
import { useLanguage } from '../../i18n/LanguageContext';

const TraineeTrainingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myStatus, setMyStatus] = useState(null);
  const [myRequestId, setMyRequestId] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);

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
        setMyRequestId(record?.id || null);
        if (status === 'approved' || status === 'completed') {
          fetchMaterials();
          // Meetings are only requested once an enrollment is approved.
          // The server refuses this call (403) for pending / rejected /
          // cancelled trainees, so we never even ask on their behalf.
          fetchMeetings();
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

  // Upcoming Zoom meetings for this approved enrollment.
  // Note there is NO learning-progress condition here or on the server:
  // an approved trainee at 0% sees exactly what one at 100% sees.
  const fetchMeetings = async () => {
    try {
      setMeetingsLoading(true);
      const res = await meetingService.getForTraining(id);
      setMeetings(res.data?.meetings || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
    } finally {
      setMeetingsLoading(false);
    }
  };

  const formatMeetingDate = (value) => {
    // meeting_date is a plain YYYY-MM-DD string, so build the Date from
    // its parts instead of letting the browser read it as UTC midnight
    // and shift the day backwards.
    const [y, m, d] = String(value).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime12h = (value) => {
    const [hh, mm] = String(value || '').split(':').map(Number);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${hour12}:${String(mm || 0).padStart(2, '0')} ${suffix}`;
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

  const handleCancelRequest = async () => {
    if (!myRequestId) return;

    if (!(await confirm('Delete your enrollment request? You can request enrollment again later.', { title: 'Delete Request', confirmText: 'Delete Request', variant: 'danger' }))) {
      return;
    }

    try {
      setCancelling(true);
      await participantService.cancelRequest(myRequestId);
      toast.success('Enrollment request deleted.');
      setMyStatus(null);
      setMyRequestId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete request.');
    } finally {
      setCancelling(false);
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
                <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-700">Enrollment request pending approval</p>
                  <p className="text-sm text-yellow-600">Once an admin approves your request, you will be officially enrolled. You can delete your request while it is pending.</p>
                </div>
                <button
                  onClick={handleCancelRequest}
                  disabled={cancelling}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50 shrink-0"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'Deleting...' : 'Delete Request'}
                </button>
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

            {/* Upcoming Live Meetings (approved participants only) */}
            {(myStatus === 'approved' || myStatus === 'completed') && (
              <div className="border-t border-mint-border pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="w-5 h-5 text-mint-primary" />
                  <h3 className="text-base font-semibold text-gray-800">{t('Upcoming Live Meeting')}</h3>
                </div>
                <p className="text-xs text-mint-gray mb-4">{t('Live sessions are open to every approved participant. Completing the course is not required to join.')}</p>

                {meetingsLoading ? (
                  <p className="text-sm text-mint-gray">{t('Loading meetings...')}</p>
                ) : meetings.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-mint-gray">{t('No upcoming live meetings scheduled yet.')}</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {meetings.map((meeting) => (
                      <li
                        key={meeting.id}
                        className={`rounded-xl border p-4 ${
                          meeting.is_live
                            ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-800">{meeting.title}</p>
                              {meeting.is_live && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                                  {t('LIVE NOW')}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-mint-primary" />
                                {formatMeetingDate(meeting.meeting_date)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-mint-primary" />
                                {formatTime12h(meeting.start_time)} &ndash; {formatTime12h(meeting.end_time)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Video className="w-4 h-4 text-mint-primary" />
                                {t('Platform')}: {meeting.platform === 'zoom' ? 'Zoom' : meeting.platform}
                              </span>
                            </div>
                            {meeting.my_attendance_status && (
                              <p className="mt-1.5 text-xs text-mint-gray">
                                {t('Your attendance')}: {t(
                                  String(meeting.my_attendance_status).charAt(0).toUpperCase() +
                                  String(meeting.my_attendance_status).slice(1)
                                )}
                              </p>
                            )}
                          </div>

                          {/* Zoom runs in its own tab; MinT never embeds or proxies it. */}
                          <a
                            href={meeting.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white transition text-sm font-semibold shrink-0 ${
                              meeting.is_live
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            <Video className="w-4 h-4" />
                            {t('Join Zoom Meeting')}
                          </a>
                        </div>
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
