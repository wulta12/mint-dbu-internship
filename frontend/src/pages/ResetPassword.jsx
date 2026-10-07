import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Lock, ShieldCheck, CheckCircle2, AlertTriangle, Check } from 'lucide-react';
import { authService } from '../services/api';
import Spinner from '../components/Spinner';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  show,
  onToggle,
  autoComplete
}) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
      {label}
    </label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full pl-11 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition-all text-gray-800 dark:text-gray-100 dark:bg-slate-900 dark:border-slate-600 ${
          error
            ? 'border-red-400 dark:border-red-500'
            : 'border-gray-300 dark:border-slate-600'
        }`}
        required
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-mint-primary transition-colors focus:outline-none"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
      </button>
    </div>
    {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // 'checking' | 'valid' | 'invalid' | 'done'
  const [linkState, setLinkState] = useState('checking');
  const [linkMessage, setLinkMessage] = useState('');

  // The link is validated up front so the user is told immediately if their
  // link is expired or already spent, rather than after filling the form.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!token) {
        if (!cancelled) {
          setLinkState('invalid');
          setLinkMessage(t('This password reset link is invalid. Please request a new one.'));
        }
        return;
      }
      try {
        const response = await authService.verifyResetToken(token);
        if (cancelled) return;
        if (response?.valid) {
          setLinkState('valid');
        } else {
          setLinkState('invalid');
          setLinkMessage(
            response?.message || t('This password reset link is invalid. Please request a new one.')
          );
        }
      } catch {
        if (!cancelled) {
          setLinkState('invalid');
          setLinkMessage(t('This password reset link is invalid. Please request a new one.'));
        }
      }
    };

    check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validate = () => {
    const next = {};
    if (!password) {
      next.password = t('New password is required');
    } else if (password.length < 6) {
      next.password = t('New password must be at least 6 characters');
    }
    if (!confirmPassword) {
      next.confirm_password = t('Please confirm your new password');
    } else if (password && password !== confirmPassword) {
      next.confirm_password = t('Passwords do not match');
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.resetPassword({
        token,
        password,
        confirm_password: confirmPassword
      });
      if (response?.success) {
        setLinkState('done');
        // Clear the token from the address bar so the spent link is not
        // re-shown if the user hits back or refreshes.
        window.history.replaceState({}, '', '/reset-password');
      } else {
        setError(t(response?.message || 'Something went wrong. Please try again.'));
      }
    } catch (err) {
      const message = err.response?.data?.message;
      setError(t(message || 'Something went wrong. Please try again.'));
      // A rejected token is now spent or expired; stop offering the form.
      if (err.response?.status === 400 && /invalid|used|expired/i.test(message || '')) {
        setLinkState('invalid');
        setLinkMessage(t(message));
      }
    } finally {
      setLoading(false);
    }
  };

  const renderCard = () => {
    if (linkState === 'checking') {
      return (
        <div className="text-center py-10">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('Checking your link...')}</p>
        </div>
      );
    }

    if (linkState === 'done') {
      return (
        <>
          <div className="text-center mb-6">
            <CheckCircle2 className="w-14 h-14 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Password Reset')}</h2>
          </div>
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-4 mb-6 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
              {t('Your password has been reset successfully. You can now sign in with your new password.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full bg-mint-primary text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-semibold"
          >
            {t('Continue to Sign In')}
          </button>
        </>
      );
    }

    if (linkState === 'invalid') {
      return (
        <>
          <div className="text-center mb-6">
            <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Link Not Valid')}</h2>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4 mb-6 flex gap-3">
            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
              {linkMessage || t('This password reset link is invalid. Please request a new one.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/forgot-password', { replace: true })}
            className="w-full bg-mint-primary text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-semibold"
          >
            {t('Request a New Link')}
          </button>
        </>
      );
    }

    return (
      <>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Set New Password')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('Choose a new password for your account')}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 mb-5 flex gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            {t('This link can only be used once. Use at least 6 characters.')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <PasswordField
            id="new-password"
            label={t('New Password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('Enter new password')}
            error={fieldErrors.password}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label={t('Confirm New Password')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('Re-enter new password')}
            error={fieldErrors.confirm_password}
            show={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mint-primary text-white py-3 rounded-lg hover:bg-opacity-90 transition-all font-semibold text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                {t('Updating...')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {t('Reset Password')}
              </>
            )}
          </button>
        </form>
      </>
    );
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
        </div>

        {renderCard()}

        {linkState !== 'done' && (
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-mint-primary dark:text-blue-300 hover:underline transition-all"
            >
              {t('Back to Sign In')}
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
