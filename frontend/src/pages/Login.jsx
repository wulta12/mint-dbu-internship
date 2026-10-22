import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Mail, Lock } from 'lucide-react';
import { authService, API_URL } from '../services/api';
import Spinner from '../components/Spinner';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.1A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l3.99-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.1C6.22 6.87 8.87 4.76 12 4.76z"
    />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Get message from location state (from registration or training redirect)
  const redirectMessage = location.state?.message || '';

  // Store the session and send the user where they were headed. Shared by the
  // password form and the Google callback so both resolve the role dashboard,
  // the pending redirect and the token/user writes in exactly one place.
  const completeSignIn = useCallback(
    (token, user) => {
      if (!token || !user) {
        setError(t('Login failed. Please try again.'));
        return false;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (!savedToken || !savedUser) {
        console.error('Failed to save session to localStorage');
        setError(t('Login failed. Please try again.'));
        return false;
      }

      // A redirect saved before sign-in (from training registration) wins.
      const redirectUrl = localStorage.getItem('redirectAfterLogin');

      let dashboardPath = '/';
      if (user.role === 'admin') {
        dashboardPath = '/admin/dashboard';
      } else if (user.role === 'trainer') {
        dashboardPath = '/trainer/dashboard';
      } else if (user.role === 'trainee') {
        dashboardPath = '/trainee/dashboard';
      }

      localStorage.removeItem('redirectAfterLogin');

      navigate(redirectUrl || dashboardPath, { replace: true });
      return true;
    },
    [navigate, t]
  );

  // Land here straight out of the Google redirect. The outcome arrives in the
  // URL fragment (never sent to the server, never in a Referer header).
  useEffect(() => {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#')) return;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('token');
    const failure = params.get('error');
    const message = params.get('message');

    if (!token && !failure) return;

    // Drop the fragment before doing anything else, so a refresh cannot
    // replay the token and it never lingers in the address bar or history.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (failure) {
      setError(message || t('Sign in with Google failed. Please try again.'));
      return;
    }

    // The callback sends only the token. Fetch the profile so the user object
    // has a single source of truth instead of a second copy in the URL.
    let cancelled = false;
    setLoading(true);
    authService
      .getProfile()
      .then((response) => {
        if (cancelled) return;
        const user = response?.data?.user || response?.user;
        if (!completeSignIn(token, user)) return;
      })
      .catch((err) => {
        if (cancelled) return;
        localStorage.removeItem('token');
        console.error('Google sign-in failed:', err);
        setError(
          err.response?.data?.message ||
            t('Sign in with Google failed. Please try again.')
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [completeSignIn, t]);

  // Hide the Google button on a deployment with no OAuth client configured,
  // rather than showing a button that can only ever fail.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/auth/google/status`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setGoogleEnabled(Boolean(body?.data?.enabled));
      })
      .catch(() => {
        if (!cancelled) setGoogleEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoogleSignIn = () => {
    // A full navigation, not fetch: the browser has to leave for Google and
    // come back through the backend callback.
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response?.token && response?.user) {
        completeSignIn(response.token, response.user);
      } else {
        setError(t('Login failed. Please try again.'));
      }
    } catch (err) {
      console.error('Login error:', err);

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
          <div className="flex justify-center mb-4">
            <LanguageSwitcher dark={false} />
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-mint-primary">MinT</h1>
            <p className="text-mint-gray text-sm font-medium">{t('Ministry of Innovation and Technology')}</p>
            <p className="text-gray-400 text-xs mt-1">Ethiopia</p>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{t('Welcome Back')}</h2>
          <p className="text-gray-500 text-sm mt-1">{t('Sign in to your account')}</p>
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
            <label className="block text-gray-700 text-sm font-semibold mb-2">{t('Email Address')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('Enter your email')}
                className="w-full pl-11 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">{t('Password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('Enter your password')}
                className="w-full pl-11 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
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
                {t('Logging in...')}
              </>
            ) : (
              t('Sign In')
            )}
          </button>

          {/* Google is an additional way into an account that already exists.
              It never creates one, so the hint points people with no account
              at registration rather than letting them hit a dead end. */}
          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {t('or')}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                {t('Continue with Google')}
              </button>

              <p className="mt-3 text-xs text-gray-500 text-center leading-relaxed">
                {t(
                  'Google sign-in requires an existing MinT account. Register with your email and password first if you do not have one.'
                )}
              </p>
            </>
          )}
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-mint-primary font-semibold hover:underline transition-all"
          >
            {t('Forgot Password?')}
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t("Don't have an account?")}{' '}
            <Link to="/register" className="text-mint-primary font-semibold hover:underline transition-all">
              {t('Register')}
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

export default Login;