import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaBuilding } from 'react-icons/fa';
import { authService, departmentService } from '../services/api';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department_id: ''
  });
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let retries = 0;
    const maxRetries = 3;

    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const res = await departmentService.getAll();
        const depts = res.data?.departments || (Array.isArray(res.data) ? res.data : []);
        if (isMounted) {
          if (depts && depts.length > 0) {
            setDepartments(depts);
            setLoadingDepartments(false);
          } else if (retries < maxRetries) {
            retries++;
            setTimeout(loadDepartments, 2500);
          } else {
            setDepartments([]);
            setLoadingDepartments(false);
          }
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
        if (isMounted) {
          if (retries < maxRetries) {
            retries++;
            setTimeout(loadDepartments, 2500);
          } else {
            setDepartments([]);
            setLoadingDepartments(false);
          }
        }
      }
    };
    loadDepartments();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.department_id) {
      setError('Please select your department');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authService.register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: 'trainee',
        department_id: formData.department_id
      });
      
      if (response.success) {
        // ✅ ONLY REGISTRATION REDIRECTS TO LOGIN
        toast.success('Registration successful! Please login to continue.');
        navigate('/login', { 
          state: { 
            message: 'Account created successfully! Please login with your credentials.' 
          } 
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-primary via-mint-navy to-mint-primary flex items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LanguageSwitcher dark={false} />
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-mint-primary">MinT</h1>
            <p className="text-mint-gray text-sm font-medium">{t('Ministry of Innovation and Technology')}</p>
            <p className="text-gray-400 text-xs mt-1">Ethiopia</p>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{t('Create Account')}</h2>
          <p className="text-gray-500 text-sm mt-1">{t('Register as a trainee')}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">{t('Full Name')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">{t('Email Address')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('Enter your email')}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">{t('Password')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder={t('Create a password (min 6 characters)')}
                autoComplete="new-password"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-mint-primary transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <FaEyeSlash className="h-5 w-5" />
                ) : (
                  <FaEye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">{t('Confirm Password')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('Confirm your password')}
                autoComplete="new-password"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
                required
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-mint-primary transition-colors focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <FaEyeSlash className="h-5 w-5" />
                ) : (
                  <FaEye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">{t('Department')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaBuilding className="h-5 w-5 text-gray-400" />
              </div>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                disabled={loadingDepartments && departments.length === 0}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800 bg-white disabled:bg-gray-100 disabled:cursor-wait"
                required
              >
                <option value="">
                  {loadingDepartments && departments.length === 0
                    ? t('Loading departments...')
                    : t('Select your department')}
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              You will only see and enroll in trainings assigned to your department.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mint-primary text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-semibold text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                {t('Creating account...')}
              </>
            ) : (
              t('Create Account')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('Already have an account?')}{' '}
            <Link to="/login" className="text-mint-primary font-semibold hover:underline transition-all">
              {t('Sign In')}
            </Link>
          </p>
          <Link 
            to="/" 
            className="text-sm text-mint-primary hover:text-mint-primary/80 hover:underline transition-all inline-block mt-3"
          >
            ← {t('Back to Home')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;