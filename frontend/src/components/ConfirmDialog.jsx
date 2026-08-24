import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const CONFIRM_EVENT = 'app-confirm';

let confirmId = 0;
let activeResolver = null;

export function confirm(message, { title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', variant = 'danger' } = {}) {
  return new Promise((resolve) => {
    if (activeResolver) {
      activeResolver(false);
    }
    activeResolver = resolve;
    window.dispatchEvent(
      new CustomEvent(CONFIRM_EVENT, {
        detail: {
          id: ++confirmId,
          title,
          message,
          confirmText,
          cancelText,
          variant,
          resolve
        }
      })
    );
  });
}

const ConfirmDialog = () => {
  const [dialog, setDialog] = useState(null);

  const handleClose = useCallback((result) => {
    if (dialog?.resolve) {
      dialog.resolve(result);
    }
    activeResolver = null;
    setDialog(null);
  }, [dialog]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      setDialog(detail);
    };
    window.addEventListener(CONFIRM_EVENT, handler);
    return () => window.removeEventListener(CONFIRM_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose(false);
      if (e.key === 'Enter') handleClose(true);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dialog, handleClose]);

  if (!dialog) return null;

  const isDanger = dialog.variant === 'danger';
  const Icon = isDanger ? AlertTriangle : Info;

  return createPortal(
    <AnimatePresence>
      {dialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={() => handleClose(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 p-6 pb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-gray-900">{dialog.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{dialog.message}</p>
              </div>
              <button
                onClick={() => handleClose(false)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => handleClose(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
              >
                {dialog.cancelText}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white transition text-sm font-semibold ${
                  isDanger
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-mint-primary hover:bg-opacity-90'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const ConfirmDialogProvider = ({ children }) => {
  return (
    <>
      {children}
      <ConfirmDialog />
    </>
  );
};

export default ConfirmDialogProvider;
