import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const TOAST_EVENT = 'app-toast';
const DEFAULT_DURATION = 5000;

const TOAST_THEMES = {
  success: {
    title: 'Success',
    accent: '#138A36',
    icon: CheckCircle2,
    iconClass: 'bg-emerald-100 text-emerald-600'
  },
  error: {
    title: 'Error',
    accent: '#DC2626',
    icon: XCircle,
    iconClass: 'bg-red-100 text-red-600'
  },
  warning: {
    title: 'Warning',
    accent: '#D97706',
    icon: AlertTriangle,
    iconClass: 'bg-amber-100 text-amber-700'
  },
  info: {
    title: 'Information',
    accent: '#0B3D91',
    icon: Info,
    iconClass: 'bg-blue-100 text-blue-700'
  }
};

let toastCounter = 0;

export function showToast({ type = 'info', message = '', title }) {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        id: ++toastCounter,
        type,
        message,
        title
      }
    })
  );
}

export const toast = {
  success: (message, options) => showToast({ type: 'success', message, ...options }),
  error: (message, options) => showToast({ type: 'error', message, ...options }),
  warning: (message, options) => showToast({ type: 'warning', message, ...options }),
  info: (message, options) => showToast({ type: 'info', message, ...options })
};

const ToastItem = ({ toastItem, onDismiss }) => {
  const theme = TOAST_THEMES[toastItem.type] || TOAST_THEMES.info;
  const Icon = theme.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-full max-w-sm relative overflow-hidden bg-white rounded-xl shadow-lg border border-mint-border pl-4 pr-3 py-3.5"
      style={{ boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)' }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: theme.accent }}
      />
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${theme.iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {toastItem.title || theme.title}
          </p>
          {toastItem.message && (
            <p className="text-[13px] text-gray-600 leading-relaxed mt-0.5 break-words">
              {toastItem.message}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toastItem.id)}
          className="p-1 rounded-md text-mint-gray hover:bg-mint-light hover:text-gray-700 transition shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 toast-progress"
        style={{
          backgroundColor: theme.accent,
          animationDuration: `${DEFAULT_DURATION}ms`
        }}
      />
    </motion.div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toastItem={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      const id = detail.id || Date.now();
      setToasts((prev) => [...prev.slice(-4), { id, type: detail.type, message: detail.message, title: detail.title }]);
      window.setTimeout(() => dismiss(id), DEFAULT_DURATION);
    };

    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, [dismiss]);

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};

export default ToastProvider;
