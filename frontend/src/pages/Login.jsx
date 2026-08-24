import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { authService } from '../services/api';
import Spinner from '../components/Spinner';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get message from location state (from registration or training redirect)
  const redirectMessage = location.state?.message || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login for:', email);
      
      const response = await authService.login(email, password);
      
      console.log('✅ Login response:', response);
      
      // Check if response has user data
      if (!response || !response.user) {
        console.error('❌ No user data in response');
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('👤 User:', response.user);
      console.log('📋 Role:', response.user.role);
      
      // Save token and user
      if (response.token) {
        localStorage.setItem('token', response.token);
        console.log('✅ Token saved');
      }
      
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        console.log('✅ User saved');
      }
      
      // Verify data was saved
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      console.log('💾 Token exists?', savedToken ? 'Yes' : 'No');
      console.log('💾 User exists?', savedUser ? 'Yes' : 'No');
      
      if (!savedToken || !savedUser) {
        console.error('❌ Failed to save to localStorage');
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }
      
      // Check if there's a redirect URL (from training registration)
      const redirectUrl = localStorage.getItem('redirectAfterLogin');
      
      // Determine dashboard path based on role
      let dashboardPath = '/';
      if (response.user.role === 'admin') {
        dashboardPath = '/admin/dashboard';
      } else if (response.user.role === 'trainer') {
        dashboardPath = '/trainer/dashboard';
      } else if (response.user.role === 'trainee') {
        dashboardPath = '/trainee/dashboard';
      }
      
      // Use redirect URL if exists, otherwise use dashboard path
      const finalPath = redirectUrl || dashboardPath;
      console.log('🚀 Navigating to:', finalPath);
      
      // Clear redirect after use
      localStorage.removeItem('redirectAfterLogin');
      
      // Navigate with replace to prevent going back to login
      navigate(finalPath, { replace: true });
      
    } catch (err) {
      console.error('❌ Login error:', err);
      
      // Show specific error message
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-mint-primary">MinT</h1>
            <p className="text-mint-gray text-sm font-medium">Ministry of Innovation and Technology</p>
            <p className="text-gray-400 text-xs mt-1">Ethiopia</p>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Show success message from registration */}
        {redirectMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
            {redirectMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
              autoComplete="off"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800 pr-12"
                autoComplete="new-password"
                required
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mint-primary text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-semibold text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                Logging in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-center text-gray-500 font-semibold mb-2">Demo Credentials</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><span className="font-semibold">Admin:</span> admin@mint.gov.et</p>
            <p><span className="font-semibold">Trainer:</span> samuel@mint.gov.et</p>
            <p><span className="font-semibold">Trainee:</span> abebe@test.com</p>
            <p className="text-gray-400 mt-1">Password for all: <span className="font-mono">password123</span></p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-mint-primary font-semibold hover:underline transition-all">
              Register
            </Link>
          </p>
          <Link 
            to="/" 
            className="text-sm text-mint-primary hover:text-mint-primary/80 hover:underline transition-all inline-block mt-3"
          >
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;