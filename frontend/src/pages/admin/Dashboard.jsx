import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaBookOpen, 
  FaCertificate, 
  FaCalendarCheck,
  FaArrowRight,
  FaRegCalendarAlt
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import AppLayout from '../../components/AppLayout';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrainings: 0,
    certificates: 0,
    activeTrainings: 0,
    trainers: 0,
    trainees: 0,
    traineesByDepartment: []
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all stats from dashboard API
      const response = await api.get('/dashboard/stats');
      
      if (response.data.success) {
        setStats(response.data.data);
      }
      
      // Also fetch trainings count
      const trainingsResponse = await api.get('/trainings');
      if (trainingsResponse.data.success) {
        const trainings = trainingsResponse.data.data?.trainings || [];
        const activeCount = trainings.filter(t => t.status === 'open').length;
        setStats(prev => ({
          ...prev,
          totalTrainings: trainings.length,
          activeTrainings: activeCount
        }));
      }
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Professional dashboard cards - Only 4 key metrics
  const dashboardCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      icon: FaUsers,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/admin/users',
      description: 'Registered users'
    },
    {
      title: 'Total Trainings',
      value: stats.totalTrainings || 0,
      icon: FaBookOpen,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      link: '/admin/trainings',
      description: 'All programs'
    },
    {
      title: 'Active Trainings',
      value: stats.activeTrainings || 0,
      icon: FaCalendarCheck,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/admin/trainings',
      description: 'Open for registration',
      nowrap: true
    },
    {
      title: 'Certificates',
      value: stats.certificates || 0,
      icon: FaCertificate,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      link: '/admin/certificates',
      description: 'Issued certificates'
    }
  ];

  // Quick actions for admin
  const quickActions = [
    { title: 'Create Training', icon: FaBookOpen, link: '/admin/trainings/create', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Add Trainer', icon: FaUsers, link: '/admin/trainers/add', bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'View Users', icon: FaUsers, link: '/admin/users', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Generate Reports', icon: FaCertificate, link: '/admin/reports', bgColor: 'bg-orange-50', textColor: 'text-orange-600' }
  ];

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
              Welcome back, {user?.full_name || 'Admin'}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Here's what's happening with your training platform today
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <FaRegCalendarAlt className="w-4 h-4 text-mint-primary" />
            <span className="capitalize">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </motion.div>

        {/* Stats Cards - Only 4 Professional Cards */}
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
                      {loading ? '—' : card.value}
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
                <div className={`${action.bgColor} ${action.textColor} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{action.title}</span>
                <FaArrowRight className="text-xs text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Registered Trainees by Department */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">Registered Trainees by Department</h2>
              <p className="text-sm text-gray-400 mt-0.5">Distribution of active trainees across departments</p>
            </div>
            <Link to="/admin/users" className="text-sm font-medium text-mint-primary hover:underline">
              View all users
            </Link>
          </div>

          {stats.traineesByDepartment && stats.traineesByDepartment.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.traineesByDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="department_name"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                  />
                  <Bar dataKey="trainee_count" name="Trainees" fill="#0B3D91" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-gray-400">
              No trainee data available yet
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(stats.traineesByDepartment || []).map((dept) => (
              <div key={dept.department_id} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate">{dept.department_name}</span>
                <span className="text-base font-bold text-mint-primary ml-2">{dept.trainee_count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Recent Activity</h2>
            <Link to="/admin/reports" className="text-sm font-medium text-mint-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { text: 'New training "Digital Marketing" created', time: '2 hours ago' },
              { text: '5 new trainees registered', time: '5 hours ago' },
              { text: '3 certificates issued', time: '1 day ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-700">{activity.text}</span>
                <span className="text-[13px] text-gray-400 ml-4 shrink-0">{activity.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;