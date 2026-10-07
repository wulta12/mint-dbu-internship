import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaCalendarAlt, 
  FaMapPin, 
  FaUsers, 
  FaArrowLeft, 
  FaClock,
  FaUserTie,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaBookOpen
} from 'react-icons/fa';
import api from '../services/api';
import { toast } from '../components/Toast';
import PublicLayout from '../components/PublicLayout';
import { useLanguage } from '../i18n/LanguageContext';

const TrainingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fetchTraining = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/trainings/${id}`);

        if (response.data.success) {
          setTraining(response.data.data?.training);
        } else {
          setError('Training not found');
        }
      } catch (err) {
        console.error('Error fetching training:', err);
        setError('Failed to load training details');
      } finally {
        setLoading(false);
      }
    };

    // Training details are public. Guests are only asked to login when they
    // try to request enrollment (see handleRegister).
    fetchTraining();
  }, [id]);

  const handleRegister = async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // If not logged in, redirect to login page
    if (!token || !user.id) {
      // Store the training ID to redirect back after login
      localStorage.setItem('redirectAfterLogin', `/trainings/${id}`);
      navigate('/login', { state: { from: `/trainings/${id}`, message: 'Please login to request enrollment for this training' } });
      return;
    }

    if (user.is_active === false) {
      toast.warning('Your account is inactive. Please contact the administrator.');
      return;
    }

    try {
      setRegistering(true);
      const response = await api.post(`/training-requests/${id}/request`);
      
      if (response.data.success) {
        setPending(true);
        toast.success(response.data.message || 'Enrollment request submitted! Your request is pending admin approval.');
      }
    } catch (err) {
      console.error('Request error:', err);
      if (err.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { state: { from: `/trainings/${id}`, message: 'Session expired. Please login again.' } });
      } else {
        toast.error(err.response?.data?.message || 'Failed to submit enrollment request');
      }
    } finally {
      setRegistering(false);
    }
  };

  // Loading Spinner Component
  const LoadingSpinner = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading training details...</p>
        </div>
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-700">{error || 'Training not found'}</h2>
          <Link to="/trainings" className="inline-block mt-4 text-mint-primary hover:underline">
            ← Back to Trainings
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'text-green-600 bg-green-50 border-green-200';
      case 'closed': return 'text-red-600 bg-red-50 border-red-200';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'completed': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'open': return <FaCheckCircle className="text-green-500" />;
      case 'closed': return <FaTimesCircle className="text-red-500" />;
      case 'in_progress': return <FaClock className="text-yellow-500" />;
      case 'completed': return <FaCheckCircle className="text-blue-500" />;
      default: return <FaInfoCircle className="text-gray-500" />;
    }
  };

  return (
    <PublicLayout>
      <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <Link to="/trainings" className="inline-flex items-center gap-2 text-mint-primary hover:underline text-sm mb-4">
          <FaArrowLeft /> {t('Back to Trainings')}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-mint-primary px-6 py-4">
            <h1 className="text-xl font-bold text-white">{training.training_title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border ${getStatusColor(training.status)}`}>
                {getStatusIcon(training.status)}
                {training.status?.toUpperCase() || 'OPEN'}
              </span>
              <span className="text-white/70 text-sm">
                {training.training_type || 'Online'}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Description */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaBookOpen className="text-mint-primary" /> {t('Description')}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {training.training_description || 'No description available.'}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <FaCalendarAlt className="text-mint-primary" />
                  <span className="font-medium">{t('Date')}</span>
                </div>
                <p className="text-sm text-gray-800">
                  {training.start_date ? new Date(training.start_date).toLocaleDateString() : 'TBD'}
                  {training.end_date && ` - ${new Date(training.end_date).toLocaleDateString()}`}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <FaMapPin className="text-mint-primary" />
                  <span className="font-medium">{t('Location')}</span>
                </div>
                <p className="text-sm text-gray-800">
                  {training.location_or_meeting_link || 'Location TBD'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <FaUsers className="text-mint-primary" />
                  <span className="font-medium">{t('Capacity')}</span>
                </div>
                <p className="text-sm text-gray-800">{training.capacity || 0} Seats</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <FaUserTie className="text-mint-primary" />
                  <span className="font-medium">{t('Trainer')}</span>
                </div>
                <p className="text-sm text-gray-800">{training.trainer_name || 'Not assigned'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleRegister}
                disabled={registering || training.status !== 'open' || pending}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  pending
                    ? 'bg-yellow-100 text-yellow-700 cursor-default'
                    : training.status === 'open'
                      ? 'bg-mint-primary text-white hover:bg-opacity-90'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {registering ? (
                  <>
                    <LoadingSpinner />
                    {t('Submitting...')}
                  </>
                ) : pending ? (
                  t('Pending Approval')
                ) : (
                  t('Request Enrollment')
                )}
              </button>

              {pending && (
                <span className="text-xs text-yellow-600 self-center">
                  Your request is waiting for admin approval
                </span>
              )}

              {training.status !== 'open' && !pending && (
                <span className="text-xs text-gray-500 self-center">
                  This training is no longer open for registration
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      </div>
    </PublicLayout>
  );
};

export default TrainingDetails;