import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Clock } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { participantService } from '../../services/api';

const MyTrainings = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

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
                  'bg-gray-100 text-gray-700'
                }`}>
                  {training.participation_status === 'pending' ? 'Pending Approval' :
                   training.participation_status === 'approved' ? 'Enrolled' :
                   training.participation_status === 'rejected' ? 'Rejected' :
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

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => navigate(`/trainee/trainings/${training.training_id}`)}
                  className="text-sm text-mint-accent hover:underline"
                >
                  View Details
                </button>
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
