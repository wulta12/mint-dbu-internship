import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaBookOpen, 
  FaUsers, 
  FaCheckCircle, 
  FaCalendarCheck,
  FaUserGraduate,
  FaArrowRight,
  FaRegCalendarAlt
} from 'react-icons/fa';
import AppLayout from '../../components/AppLayout';
import api from '../../services/api';

const TrainerDashboard = () => {
  const [stats, setStats] = useState({
    totalTrainings: 0,
    activeTrainings: 0,
    completedTrainings: 0,
    totalParticipants: 0,
    recentTrainings: []
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchTrainerStats(parsedUser.id);
    }
  }, []);

  const fetchTrainerStats = async (trainerId) => {
    try {
      setLoading(true);
      const trainingsResponse = await api.get('/trainings/my-trainings');
      
      if (trainingsResponse.data.success) {
        const trainerTrainings = trainingsResponse.data.data?.trainings || [];
        
        const total = trainerTrainings.length;
        const active = trainerTrainings.filter(t => t.status === 'open' || t.status === 'in_progress').length;
        
        let totalParticipants = 0;
        for (const training of trainerTrainings) {
          try {
            const participantsResponse = await api.get(`/training-requests/training/${training.id}`);
            if (participantsResponse.data.success) {
              const enrolled = (participantsResponse.data.data?.participants || [])
                .filter(p => p.status === 'approved' || p.status === 'completed');
              totalParticipants += enrolled.length;
            }
          } catch (err) {}
        }

        // The Completed card and its drill-down list read the exact same
        // endpoint, so the number here can never disagree with the list.
        let completedParticipants = 0;
        try {
          const completedResponse = await api.get('/training-requests/trainer/completed');
          completedParticipants = completedResponse.data?.data?.participants?.length || 0;
        } catch (err) {}

        setStats({
          totalTrainings: total,
          activeTrainings: active,
          completedTrainings: completedParticipants,
          totalParticipants: totalParticipants,
          recentTrainings: trainerTrainings.slice(0, 4)
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const primaryTraining = stats.recentTrainings[0];
  const participantsLink = primaryTraining ? `/trainer/participants/${primaryTraining.id}` : '/trainer/trainings';
  const attendanceLink = primaryTraining ? `/trainer/attendance/${primaryTraining.id}` : '/trainer/trainings';

  const dashboardCards = [
    {
      title: 'Total Trainings',
      value: stats.totalTrainings,
      icon: FaBookOpen,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      description: 'Assigned to you',
      link: '/trainer/trainings'
    },
    {
      title: 'Active Trainings',
      value: stats.activeTrainings,
      icon: FaCalendarCheck,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      description: 'Currently running',
      link: '/trainer/trainings'
    },
    {
      title: 'Total Participants',
      value: stats.totalParticipants,
      icon: FaUsers,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      description: 'Enrolled in your trainings',
      link: participantsLink
    },
    {
      title: 'Completed',
      value: stats.completedTrainings,
      icon: FaCheckCircle,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      description: 'Participants finished',
      link: '/trainer/completed'
    }
  ];

  const quickActions = [
    { title: 'View Trainings', icon: FaBookOpen, link: '/trainer/trainings' },
    { title: 'Participants', icon: FaUsers, link: participantsLink },
    { title: 'Attendance', icon: FaCheckCircle, link: attendanceLink },
    { title: 'My Profile', icon: FaUserGraduate, link: '/trainer/profile' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Welcome back, {user?.full_name || 'Trainer'}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Here's what's happening with your training programs today
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <FaRegCalendarAlt className="w-4 h-4 text-mint-primary" />
            <span className="capitalize">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {dashboardCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all overflow-hidden"
            >
              <Link to={card.link} className="block p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-gray-500">{card.title}</p>
                    <p className="mt-1.5 text-4xl font-bold tracking-tight text-gray-900 leading-none">
                      {card.value}
                    </p>
                    <p className={`mt-1.5 text-sm text-gray-400 ${card.nowrap ? 'whitespace-nowrap' : ''}`}>{card.description}</p>
                  </div>
                  <div className={`${card.bgColor} ${card.textColor} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Quick Actions</h2>
            <span className="hidden sm:block text-sm text-gray-400">Common tasks</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-card transition-all"
              >
                <div className="bg-mint-primary w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0">
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{action.title}</span>
                <FaArrowRight className="text-xs text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Trainings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">Recent Trainings</h2>
              <p className="text-sm text-gray-400 mt-0.5">Your latest assigned programs</p>
            </div>
            <Link to="/trainer/trainings" className="text-sm font-medium text-mint-primary hover:underline">
              View All
            </Link>
          </div>

          {stats.recentTrainings.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recentTrainings.map((training, index) => (
                <div key={index} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{training.training_title}</p>
                    <div className="flex items-center gap-3 text-[13px] text-gray-500 mt-0.5">
                      <span>{training.training_type || 'Online'}</span>
                      <span>•</span>
                      <span>{training.start_date ? new Date(training.start_date).toLocaleDateString() : 'TBD'}</span>
                    </div>
                  </div>
                  <span className={`ml-4 shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    training.status === 'open' ? 'bg-green-50 text-green-700' :
                    training.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                    training.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {training.status || 'Open'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              No trainings assigned yet
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default TrainerDashboard;