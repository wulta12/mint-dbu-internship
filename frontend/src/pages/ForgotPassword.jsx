import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, Send, KeyRound } from 'lucide-react';
import { authService } from '../services/api';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

const ForgotPassword = () => {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // The backend always returns the same message whether or not the address is
  // registered, so the UI must not imply either outcome.
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('Email is required'));
      return;
    }

    setLoading(true);
    try {
      const response = await authService.requestPasswordReset(email.trim(), lang);
      if (response?.success) {
        setSent(true);
        toast.success(t('Reset code and link sent! Please check your email.'));
      } else {
        // Pass through t() so a server-side message is translated when we have
        // a translation, and shown in English when we do not.
        const msg = response?.message || 'Something went wrong. Please try again.';
        setError(t(msg));
        toast.error(t(msg));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong. Please try again.';
      setError(t(msg));
      toast.error(t(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-primary via-mint-navy to-mint-primary flex items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LanguageSwitcher dark={false} />
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-mint-primary dark:text-blue-300">MinT</h1>
            <p className="text-mint-gray dark:text-gray-400 text-sm font-medium">
              {t('Ministry of Innovation and Technology')}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Ethiopia</p>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t('Forgot Password?')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {t('Enter your email and we will send you a reset link')}
          </p>
        </div>

        {sent ? (
          <div>
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-4 mb-6 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                {t('If an account exists for that email address, a password reset link has been sent. Please check your inbox.')}
              </p>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {t("Didn't get the email? Check your spam folder, or try another address.")}
            </p>

            {/* The same email carries a 6-digit code as well as the link, so
                offer the code route prominently. The address is handed over in router
                state rather than the query string. */}
            <Link
              to="/verify-otp"
              state={{ email: email.trim() }}
              className="w-full bg-mint-primary hover:bg-opacity-90 text-white py-3.5 rounded-lg transition-all font-semibold mb-3 flex items-center justify-center gap-2 text-center shadow-md hover:shadow-lg"
            >
              <KeyRound className="h-5 w-5" />
              {t('Enter 6-Digit Code from Email')}
            </Link>

            <button
              type="button"
              onClick={() => setSent(false)}
              className="w-full border border-mint-primary dark:border-slate-600 text-mint-primary dark:text-blue-300 py-3 rounded-lg hover:bg-mint-light dark:hover:bg-slate-700 transition-all font-semibold"
            >
              {t('Send to a different email')}
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
                  {t('Email Address')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('Enter your email')}
                    className="w-full pl-11 py-3 pr-4 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
                    autoComplete="email"
                    required
                  />
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
                    {t('Sending...')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t('Send Reset Link')}
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('Remembered your password?')}{' '}
            <Link
              to="/login"
              className="text-mint-primary dark:text-blue-300 font-semibold hover:underline transition-all"
            >
              {t('Sign In')}
            </Link>
          </p>
          <Link
            to="/login"
            className="text-sm text-mint-primary dark:text-blue-300 hover:underline transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('Back to Sign In')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
