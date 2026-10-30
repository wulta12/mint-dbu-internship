import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { authService } from '../services/api';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

const VerifyOtp = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // The address the code was requested for. Carried in router state, not the
  // URL, so a shared or bookmarked link does not carry an email address. Empty
  // when the user arrives directly, in which case they type it in.
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResent(false);

    if (!email.trim()) {
      setError(t('Email is required'));
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError(t('Verification code must be 6 digits'));
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyPasswordOtp(email.trim(), otp.trim());
      if (response?.verified && response?.resetToken) {
        toast.success(t('Code verified! Please set your new password.'));
        // Hand straight over to the existing reset page, which already knows
        // how to consume a token. The code is never kept in the URL.
        navigate(`/reset-password?token=${encodeURIComponent(response.resetToken)}`, {
          replace: true
        });
      } else {
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

  const handleResend = async () => {
    setError('');
    setResent(false);

    if (!email.trim()) {
      setError(t('Email is required'));
      return;
    }

    setResending(true);
    try {
      const response = await authService.resendPasswordOtp(email.trim(), lang);
      if (response?.success) {
        // The backend always answers with the same generic message, so this
        // must not imply the address definitely exists.
        setResent(true);
        setOtp('');
        toast.success(t('A new code has been sent if the email is registered.'));
      } else {
        const msg = response?.message || 'Something went wrong. Please try again.';
        setError(t(msg));
        toast.error(t(msg));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong. Please try again.';
      setError(t(msg));
      toast.error(t(msg));
    } finally {
      setResending(false);
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
            {t('Enter Verification Code')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {t('Enter the 6-digit code we emailed you')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {resent && (
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-3 mb-4 text-sm text-green-700 dark:text-green-300 flex gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              {t('If an account exists for that email address, a new verification code has been sent. Please check your inbox.')}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
              {t('Email Address')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('Enter your email')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800"
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
              {t('Verification Code')}
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full pl-11 py-3 pr-4 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800 tracking-[0.4em] font-mono text-lg"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('The code expires in 10 minutes and can only be used once.')}
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
                {t('Verifying...')}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                {t('Verify Code')}
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-4 w-full border border-mint-primary dark:border-slate-600 text-mint-primary dark:text-blue-300 py-3 rounded-lg hover:bg-mint-light dark:hover:bg-slate-700 transition-all font-semibold disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {resending ? (
            <>
              <Spinner size="sm" />
              {t('Sending...')}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              {t('Resend Code')}
            </>
          )}
        </button>

        <div className="mt-6 text-center space-y-3">
          <Link
            to="/forgot-password"
            className="text-sm text-mint-primary dark:text-blue-300 hover:underline transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('Back')}
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('Prefer the link?')}
            <Link
              to="/forgot-password"
              className="text-mint-primary dark:text-blue-300 font-semibold hover:underline transition-all ml-1"
            >
              {t('Request a new one')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOtp;
