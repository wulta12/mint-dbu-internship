import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Clock } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { participantService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const MyTrainings = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchMyTrainings();
  }, []);

  const fetchMyTrainings = async () => {
    try {
      setLoading(true);
      const res = await participantService.getMyTrainings();
      setTrainings(res.data?.trainings || []);
    } catch (error) {
      console.error('Error fetching my trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!(await confirm('Delete this enrollment request? You can request enrollment again later.', { title: 'Delete Request', confirmText: 'Delete Request' }))) {
      return;
    }
    try {
      setCancellingId(requestId);
      await participantService.cancelRequest(requestId);
      toast.success('Enrollment request deleted');
      fetchMyTrainings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete request');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading your trainings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <button 
          onClick={() => navigate('/trainee')}
          className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-mint-primary">My Trainings</h1>
        <p className="text-mint-gray">View all your registered trainings</p>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <Calendar className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">No Requests Yet</h3>
          <p className="text-mint-gray">You haven't requested enrollment for any trainings yet.</p>
          <button
            onClick={() => navigate('/trainee/trainings')}
            className="mt-4 px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition"
          >
            Browse Department Trainings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {trainings.map((training) => (
            <div key={training.id} className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-mint-primary">{training.training_title}</h3>
                  <p className="text-sm text-mint-gray mt-1">{training.training_type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  training.participation_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  training.participation_status === 'approved' ? 'bg-green-100 text-green-700' :
                  training.participation_status === 'rejected' ? 'bg-red-100 text-red-700' :
                  training.participation_status === 'attended' ? 'bg-blue-100 text-blue-700' :
                  training.participation_status === 'completed' ? 'bg-purple-100 text-purple-700' :
                  training.participation_status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {training.participation_status === 'pending' ? 'Pending Approval' :
                   training.participation_status === 'approved' ? 'Enrolled' :
                   training.participation_status === 'rejected' ? 'Rejected' :
                   training.participation_status === 'cancelled' ? 'Cancelled' :
                   training.participation_status || 'Requested'}
                </span>
              </div>
              
              <div className="flex items-center gap-6 mt-3 text-sm text-mint-gray">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(training.start_date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(training.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Progress from real lesson completion, so the card here agrees
                  with the dashboard's "Completed" count. A training whose
                  content was never built has nothing to show. */}
              {(training.participation_status === 'approved' || training.participation_status === 'completed') &&
                training.required_lessons > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-mint-gray mb-1">
                      <span>
                        {training.done_lessons} of {training.required_lessons} lessons
                      </span>
                      <span>{training.progress_percent}%</span>
                    </div>
                    <div className="h-2 bg-mint-light rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          training.progress_percent === 100 ? 'bg-green-500' : 'bg-mint-primary'
                        }`}
                        style={{ width: `${training.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => navigate(`/trainee/trainings/${training.training_id}`)}
                  className="text-sm text-mint-accent hover:underline"
                >
                  View Details
                </button>
                {training.participation_status === 'pending' && (
                  <button
                    onClick={() => handleCancel(training.id)}
                    disabled={cancellingId === training.id}
                    className="text-sm text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                  >
                    {cancellingId === training.id ? 'Deleting...' : 'Delete Request'}
                  </button>
                )}
                {(training.participation_status === 'approved' || training.participation_status === 'completed') && (
                  <button
                    onClick={() => navigate(`/trainee/learn/${training.training_id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {training.participation_status === 'completed' ? 'Review' : 'Start Learning'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default MyTrainings;
