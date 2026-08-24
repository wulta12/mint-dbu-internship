import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Users, ArrowLeft, Clock, Building2 } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, participantService, authService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const TraineeTrainings = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [departmentName, setDepartmentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [noDepartment, setNoDepartment] = useState(false);
  const [requestingId, setRequestingId] = useState(null);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.department_id) {
        setNoDepartment(true);
        setTrainings([]);
        return;
      }

      const res = await trainingService.getDepartmentTrainings();
      setTrainings(res.data?.trainings || []);
      setDepartmentName(res.data?.department || '');
    } catch (error) {
      if (error.response?.status === 400) {
        setNoDepartment(true);
      }
      console.error('Error fetching department trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (trainingId) => {
    if (requestingId) return;

    if (!(await confirm('Submit an enrollment request for this training? Your request will need admin approval.', { title: 'Request Enrollment', confirmText: 'Submit Request', variant: 'info' }))) {
      return;
    }

    try {
      setRequestingId(trainingId);
      await participantService.requestTraining(trainingId);
      toast.success('Enrollment request submitted! Your request is pending admin approval.');
      fetchTrainings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Request failed');
    } finally {
      setRequestingId(null);
    }
  };

  const getStatusBadge = (training) => {
    switch (training.my_status) {
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending Approval</span>;
      case 'approved':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Enrolled</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>;
      default:
        return null;
    }
  };

  const renderAction = (training) => {
    if (training.my_status === 'pending') {
      return (
        <button
          disabled
          className="mt-4 w-full bg-yellow-100 text-yellow-700 py-2 rounded-lg font-medium disabled:opacity-60 cursor-not-allowed"
        >
          Pending Approval
        </button>
      );
    }

    if (training.my_status === 'approved') {
      return (
        <button
          onClick={() => navigate(`/trainee/trainings/${training.id}`)}
          className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          View My Enrollment
        </button>
      );
    }

    if (training.my_status === 'rejected') {
      return (
        <button
          disabled
          className="mt-4 w-full bg-red-100 text-red-700 py-2 rounded-lg font-medium disabled:opacity-60 cursor-not-allowed"
        >
          Request Rejected
        </button>
      );
    }

    return (
      <button
        onClick={() => handleRequest(training.id)}
        disabled={requestingId === training.id}
        className="mt-4 w-full bg-mint-primary text-white py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
      >
        {requestingId === training.id ? 'Submitting...' : 'Request Enrollment'}
      </button>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading trainings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (noDepartment) {
    return (
      <AppLayout>
        <div className="bg-white rounded-xl shadow-card p-10 text-center max-w-xl mx-auto">
          <Building2 className="w-16 h-16 text-mint-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-mint-primary mb-2">Select Your Department</h2>
          <p className="text-mint-gray mb-6">
            You need to select your department first so we can show you the trainings assigned to your department.
          </p>
          <button
            onClick={() => navigate('/trainee/profile')}
            className="px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition"
          >
            Go to Profile
          </button>
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-mint-primary">Department Trainings</h1>
          {departmentName && (
            <span className="flex items-center gap-1 px-3 py-1 bg-mint-light rounded-full text-xs font-medium text-mint-primary">
              <Building2 className="w-3 h-3" />
              {departmentName}
            </span>
          )}
        </div>
        <p className="text-mint-gray">Trainings assigned to your department. Request enrollment — admin approval required.</p>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <BookOpen className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">No Trainings for Your Department</h3>
          <p className="text-mint-gray">No open trainings are assigned to your department yet. Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trainings.map((training) => (
            <div key={training.id} className="bg-white rounded-xl shadow-card p-6 hover:shadow-card-hover transition">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-mint-primary">{training.training_title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  training.training_type === 'Online' ? 'bg-blue-100 text-blue-700' :
                  training.training_type === 'Offline' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {training.training_type}
                </span>
                {training.is_all_departments && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    All Departments
                  </span>
                )}
              </div>

              <p className="text-mint-gray text-sm mt-2 line-clamp-2">{training.training_description}</p>

              <div className="flex items-center gap-4 mt-3 text-sm text-mint-gray">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(training.start_date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(training.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {training.approved_count || 0}/{training.capacity} enrolled
                </span>
              </div>

              <div className="mt-3">{getStatusBadge(training)}</div>

              {renderAction(training)}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default TraineeTrainings;

