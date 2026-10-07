import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaMapPin, FaUsers, FaSearch } from 'react-icons/fa';
import api from '../services/api';
import PublicLayout from '../components/PublicLayout';
import { useLanguage } from '../i18n/LanguageContext';

const Trainings = () => {
  const { t } = useLanguage();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Fetch trainings from database
  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/trainings');
        
        if (response.data.success) {
          setTrainings(response.data.data?.trainings || []);
        } else {
          setTrainings([]);
        }
      } catch (error) {
        console.error('Error fetching trainings:', error);
        setTrainings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainings();
  }, []);

  // Filter trainings
  const filteredTrainings = trainings.filter(training => {
    const matchesSearch = training.training_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         training.training_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || training.training_type === filterType;
    return matchesSearch && matchesType;
  });

  // Get unique training types
  const trainingTypes = ['all', ...new Set(trainings.map(t => t.training_type).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trainings...</p>
        </div>
      </div>
    );
  }

  return (
    <PublicLayout>
      <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="text-mint-primary hover:underline text-sm inline-block mb-2">
            ← {t('Back to Home')}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('Available Training Programs')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Explore our comprehensive training programs designed to equip you with in-demand skills.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder={t('Search trainings...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary bg-white text-sm min-w-[140px]"
            >
              {trainingTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? t('All Types') : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trainings Grid */}
        {filteredTrainings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrainings.map((training, index) => (
              <motion.div
                key={training.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-100"
              >
                <div className="p-4">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      training.status === 'open' ? 'bg-green-100 text-green-700' :
                      training.status === 'closed' ? 'bg-red-100 text-red-700' :
                      training.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {training.status?.toUpperCase() || 'OPEN'}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      {training.training_type || 'Online'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-800 mb-1 line-clamp-1">
                    {training.training_title || 'Untitled Training'}
                  </h3>
                  
                  <p className="text-gray-500 text-xs mb-3 line-clamp-2">
                    {training.training_description || 'No description available.'}
                  </p>

                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <FaCalendarAlt className="text-mint-primary text-xs" />
                      <span>
                        {training.start_date ? new Date(training.start_date).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaMapPin className="text-mint-primary text-xs" />
                      <span className="truncate">{training.location_or_meeting_link || 'Location TBD'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaUsers className="text-mint-primary text-xs" />
                      <span>{training.capacity || 0} Seats</span>
                    </div>
                  </div>

                  <Link
                    to={`/trainings/${training.id}`}
                    className="mt-3 w-full block text-center px-3 py-1.5 bg-mint-primary text-white rounded-md hover:bg-opacity-90 transition-colors text-xs font-medium"
                  >
                    {t('View Details')}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="text-5xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-gray-700">{t('No Trainings Available')}</h3>
            <p className="text-gray-500 text-sm mt-1">Check back later for new training programs.</p>
            <Link to="/" className="inline-block mt-3 text-mint-primary hover:underline text-sm">
              {t('Return to Home')}
            </Link>
          </div>
        )}
      </div>
      </div>
    </PublicLayout>
  );
};

export default Trainings;