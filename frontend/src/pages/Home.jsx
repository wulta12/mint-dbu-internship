import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaCertificate,
  FaLaptopCode,
  FaShieldAlt,
  FaChartLine,
  FaUsers,
  FaAward,
  FaCalendarAlt,
  FaGlobeAfrica,
  FaArrowRight,
  FaUserPlus,
  FaBookOpen,
  FaChalkboardTeacher
} from 'react-icons/fa';
import api from '../services/api';
import PublicLayout from '../components/PublicLayout';
import { useLanguage } from '../i18n/LanguageContext';
import heroImage from '../images/gg.png';

const Home = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    trainers: 0,
    trainees: 0,
    trainings: 0,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch statistics from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        if (response.data?.success && response.data?.data) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Fallback to default values if API fails
        setStats({
          trainers: 2,
          trainees: 10,
          trainings: 5,
          certificates: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <PublicLayout>
      {/* ========== FULL PAGE HERO SECTION ========== */}
      <section className="relative h-[calc(100vh-80px)] overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Training Management System" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-mint-primary/20 to-mint-primary/10"></div>
        </div>

        <div className="relative h-full flex items-center justify-center text-center">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-2 tracking-tight">
                {t('Online Training Management')}
                <span className="text-white block">{t('System')}</span>
              </h1>

              <p className="text-mint-gold text-sm md:text-base lg:text-lg font-medium tracking-wider mb-6">
                {t('Ministry of Innovation and Technology, Ethiopia')}
              </p>

              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto leading-relaxed tracking-wide">
                High-quality training, modern technology, and online learning delivered by certified trainers.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/trainings" className="px-8 py-3 bg-mint-gold text-mint-primary rounded-lg hover:bg-opacity-90 transition-all font-semibold inline-flex items-center gap-2 tracking-wide">
                  {t('Explore Courses')} <FaArrowRight />
                </Link>
                <Link to="/register" className="px-8 py-3 border-2 border-white/40 text-white rounded-lg hover:bg-white/10 transition-all font-semibold inline-flex items-center gap-2 tracking-wide">
                  <FaUserPlus /> {t('Get Started')}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== STATISTICS SECTION - LIVE DATA FROM DATABASE ========== */}
      <section className="py-16 bg-mint-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { 
                icon: FaUsers, 
                key: 'trainers',
                label: t('Registered Trainers'),
                suffix: '+'
              },
              { 
                icon: FaChalkboardTeacher, 
                key: 'trainees',
                label: t('Trainees'),
                suffix: '+'
              },
              { 
                icon: FaBookOpen, 
                key: 'trainings',
                label: t('Training Courses'),
                suffix: '+'
              },
              { 
                icon: FaCertificate, 
                key: 'certificates',
                label: t('Certification Users'),
                suffix: ''
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 text-center hover:bg-white/20 transition-all border border-white/20"
              >
                <stat.icon className="text-4xl mx-auto mb-3 text-mint-gold" />
                <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  {loading ? '...' : stats[stat.key] !== undefined ? stats[stat.key] + stat.suffix : '0' + stat.suffix}
                </div>
                <div className="text-white/70 text-sm mt-1 tracking-wide">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== WHY CHOOSE OUR PLATFORM ========== */}
      <section className="py-16 bg-mint-light">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-mint-primary tracking-tight">{t('Why Choose Our Platform?')}</h2>
            <p className="text-mint-gray mt-3 max-w-2xl mx-auto tracking-wide text-lg">
              Modern digital learning platform designed by the Ministry of Innovation and Technology.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FaLaptopCode, title: 'Online Courses', desc: 'Access training from anywhere, anytime.' },
              { icon: FaChalkboardTeacher, title: 'Live Training', desc: 'Interactive sessions with expert trainers.' },
              { icon: FaAward, title: 'Digital Certificate', desc: 'Earn verified certificates upon completion.' },
              { icon: FaChartLine, title: 'Track Progress', desc: 'Monitor your learning journey and achievements.' }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-card p-6 text-center hover:shadow-card-hover transition-all border border-mint-border"
              >
                <div className="flex items-center justify-center mx-auto mb-4">
                  <item.icon className="text-mint-gold text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-mint-primary tracking-wide">{item.title}</h3>
                <p className="text-mint-gray text-sm mt-2 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURED TRAININGS ========== */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-mint-primary tracking-tight">{t('Featured Training Programs')}</h2>
            <p className="text-mint-gray mt-2 tracking-wide">Start your learning journey with our most popular programs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Cybersecurity', icon: FaShieldAlt, spots: '20 Seats', duration: '3 Weeks' },
              { title: 'Artificial Intelligence', icon: FaLaptopCode, spots: '15 Seats', duration: '4 Weeks' },
              { title: 'Cloud Computing', icon: FaGlobeAfrica, spots: '25 Seats', duration: '3 Weeks' }
            ].map((training, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-mint-light rounded-xl shadow-card p-6 hover:shadow-card-hover transition-all border border-mint-border"
              >
                <training.icon className="text-mint-primary text-4xl mb-4" />
                <h3 className="text-xl font-bold text-mint-primary tracking-wide">{training.title}</h3>
                <div className="flex items-center gap-4 mt-3 text-sm text-mint-gray">
                  <span className="flex items-center gap-1">
                    <FaUsers className="w-4 h-4 text-mint-gray" /> {training.spots}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaCalendarAlt className="w-4 h-4 text-mint-gray" /> {training.duration}
                  </span>
                </div>
                <Link to="/register" className="mt-4 w-full block text-center px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium tracking-wide">
                  {t('Register Now')}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== OUR SERVICES SECTION ========== */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{t('Our Services')}</h2>
            <p className="text-gray-500 mt-2">Comprehensive training management solutions</p>
            <div className="w-20 h-1 bg-mint-primary mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Service 1: Training Management */}
            <div className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-mint-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-mint-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Training Management</h3>
              <p className="text-gray-500 text-sm">Create, manage, and deliver professional training programs</p>
            </div>

            {/* Service 2: Trainer Management */}
            <div className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-mint-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-mint-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Trainer Management</h3>
              <p className="text-gray-500 text-sm">Connect with expert trainers and manage your training team</p>
            </div>

            {/* Service 3: Online Learning */}
            <div className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-mint-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-mint-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Online Learning</h3>
              <p className="text-gray-500 text-sm">Access training materials anytime, anywhere with our LMS</p>
            </div>

            {/* Service 4: Certificate Generation */}
            <div className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-mint-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-mint-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Certificate Generation</h3>
              <p className="text-gray-500 text-sm">Issue verified certificates upon successful completion</p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Home;