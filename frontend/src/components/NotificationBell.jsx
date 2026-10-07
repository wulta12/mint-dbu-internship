import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, Loader2 } from 'lucide-react';
import { notificationService } from '../services/api';

// Keeps "3m ago" style stamps from going stale while the panel sits open.
const relativeTime = (value) => {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString();
};

// Icon tint per notification type, so the feed is scannable at a glance.
const typeStyles = {
  enrollment_request: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  enrollment_approved: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  enrollment_rejected: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  certificate_issued: 'bg-mint-gold/20 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400',
  certificate_revoked: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  contact_message: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
};

// Messages now carry full bodies (a contact form submission, the whole
// enrollment request), so long ones need an expand toggle. The row is a div
// rather than a button so the toggle is not nested inside a button.
const LONG_MESSAGE_CHARS = 180;

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const containerRef = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await notificationService.getAll(20);
      setNotifications(response?.data?.notifications || []);
      setUnreadCount(response?.data?.unread_count || 0);
      setError(null);
    } catch (err) {
      setError('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the badge so enrollment decisions and new certificates surface
  // without a manual refresh. Slow enough to stay cheap.
  useEffect(() => {
    load({ silent: true });
    const timer = setInterval(() => load({ silent: true }), 60000);
    return () => clearInterval(timer);
  }, [load]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  // Optimistic: flip locally, reconcile with the server response.
  const handleMarkRead = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationService.markRead(id);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch {
      load();
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await notificationService.clearAll();
    } catch {
      load();
    }
  };

  const handleToggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mark read, then follow the notification's in-app link when it has one.
  const handleOpenItem = async (item) => {
    await handleMarkRead(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-lg text-gray-500 hover:text-mint-primary hover:bg-mint-light transition-colors"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-mint-border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-mint-primary hover:bg-mint-light transition-colors"
                >
                  <CheckCheck className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  title="Clear all"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Loading...
              </div>
            )}

            {!loading && error && (
              <p className="px-4 py-10 text-center text-sm text-red-500">{error}</p>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" aria-hidden="true" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Enrollment updates and certificates will appear here.
                </p>
              </div>
            )}

            {notifications.map((item) => {
              const isExpanded = expanded.has(item.id);
              const hasMessage = Boolean(item.message);
              const isLong = hasMessage && item.message.length > LONG_MESSAGE_CHARS;

              return (
                <div
                  key={item.id}
                  className={`border-b border-gray-100 dark:border-slate-700 last:border-b-0 transition-colors ${
                    item.is_read
                      ? 'hover:bg-mint-light dark:hover:bg-slate-800'
                      : 'bg-mint-light/40 dark:bg-slate-800/50 hover:bg-mint-light dark:hover:bg-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenItem(item)}
                    className="w-full text-left flex gap-3 px-4 pt-3 pb-2"
                  >
                    <span
                      className={`mt-0.5 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                        typeStyles[item.type] || typeStyles.contact_message
                      }`}
                    >
                      {item.is_read ? (
                        <Check className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Bell className="w-4 h-4" aria-hidden="true" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
                          {relativeTime(item.created_at)}
                        </span>
                      </span>
                    </span>

                    {!item.is_read && (
                      <span
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-mint-primary"
                        aria-label="Unread"
                      />
                    )}
                  </button>

                  {hasMessage && (
                    <div className="pl-11 pr-4 pb-3">
                      <p
                        className={`text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words ${
                          isLong && !isExpanded ? 'line-clamp-3' : ''
                        }`}
                      >
                        {item.message}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(item.id)}
                          aria-expanded={isExpanded}
                          className="mt-1 text-xs font-semibold text-mint-primary dark:text-blue-300 hover:underline"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
