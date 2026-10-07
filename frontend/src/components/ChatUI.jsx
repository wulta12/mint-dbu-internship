import React, { useEffect, useRef } from 'react';
import { ArrowLeft, BadgeCheck, GraduationCap, Send, ShieldCheck, UserRound } from 'lucide-react';

// One place for how a sender's role reads in a conversation: a short chip next
// to the name, colour-coded and icon-coded so admin, trainer and trainee are
// never told apart by the text of the message alone.
const ROLE_META = {
  admin: {
    label: 'Admin',
    Icon: ShieldCheck,
    chip: 'bg-blue-50 text-blue-700 ring-blue-600/25'
  },
  trainer: {
    label: 'Trainer',
    Icon: GraduationCap,
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/25'
  },
  trainee: {
    label: 'Trainee',
    Icon: BadgeCheck,
    chip: 'bg-violet-50 text-violet-700 ring-violet-600/25'
  }
};

export const roleMeta = (role) =>
  ROLE_META[role] || {
    label: role ? `${role}`.charAt(0).toUpperCase() + `${role}`.slice(1) : '',
    Icon: UserRound,
    chip: 'bg-gray-100 text-gray-700 ring-gray-500/25'
  };

export const RoleBadge = ({ role, className = '' }) => {
  if (!role) return null;
  const { label, Icon, chip } = roleMeta(role);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${chip} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

export const formatWhen = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const initialsOf = (name = '') => {
  const parts = `${name}`.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export const ChatAvatar = ({ name, className = '' }) => (
  <span
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint-light text-xs font-semibold text-mint-primary ring-1 ring-inset ring-mint-border ${className}`}
  >
    {initialsOf(name)}
  </span>
);

// A conversation as it reads in the thread: the other side on the left, your
// own lines on the right, both carrying the sender's name and role.
export const ChatBubble = ({ side = 'in', name, avatar, role, text, time, isSelf = false }) => {
  const mine = side === 'out';
  return (
    <div className={`flex items-start gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
      <ChatAvatar name={avatar || name} />
      <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
        <div className={`mb-1 flex flex-wrap items-center gap-2 ${mine ? 'justify-end' : ''}`}>
          <span className="text-xs font-semibold text-mint-primary">{isSelf ? 'You' : name}</span>
          <RoleBadge role={role} />
          <span className="text-[11px] text-mint-gray">{time}</span>
        </div>
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl border px-4 py-2.5 text-sm ${
            mine
              ? 'rounded-tr-sm border-mint-primary bg-mint-primary text-white'
              : 'rounded-tl-sm border-mint-border bg-mint-light text-mint-text'
          }`}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

// The scroll area of a thread. It follows the conversation to the newest line
// whenever the thread or its length changes, so a reply is never sent off-screen.
export const ChatMessages = ({ syncKey, children }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [syncKey]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-4 py-4">
      {children}
    </div>
  );
};

// The message input itself: a rounded field with the Send button carrying an
// icon inside it. Enter sends, Shift+Enter starts a new line.
export const ChatComposer = ({
  id,
  value,
  onChange,
  onSend,
  sending = false,
  disabled = false,
  label,
  placeholder = 'Write a message...',
  hint
}) => {
  const canSend = !sending && !disabled && Boolean(`${value || ''}`.trim());

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="border-t border-mint-border bg-white px-4 py-3">
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mint-gray">{label}</p>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-mint-border bg-mint-light px-3 py-2 transition focus-within:border-mint-primary focus-within:ring-2 focus-within:ring-mint-primary/20">
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={2000}
          placeholder={placeholder}
          className="min-h-[42px] max-h-40 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-mint-text placeholder:text-mint-gray focus:outline-none"
        />
        <button
          type="button"
          onClick={() => canSend && onSend()}
          disabled={!canSend}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-mint-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-mint-gray">{hint}</p>}
    </div>
  );
};

export const ChatHeader = ({ name, avatar, role, subtitle, onBack, right }) => (
  <div className="flex items-center gap-3 border-b border-mint-border bg-white px-4 py-3">
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to conversations"
        className="rounded-lg p-1.5 text-mint-gray transition hover:bg-mint-light hover:text-mint-primary lg:hidden"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
    )}
    <ChatAvatar name={avatar || name} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-sm font-semibold text-mint-primary">{name}</p>
        <RoleBadge role={role} />
      </div>
      {subtitle && <p className="truncate text-xs text-mint-gray">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const ChatListItem = ({
  active = false,
  unreadCount = 0,
  name,
  role,
  subject,
  snippet,
  time,
  trailing,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full border-b border-mint-border px-4 py-3 text-left transition ${
      active
        ? 'bg-mint-light/80'
        : unreadCount > 0
          ? 'bg-mint-light/40 hover:bg-mint-light/70'
          : 'hover:bg-mint-light/60'
    }`}
  >
    <span className="flex items-start gap-3">
      <ChatAvatar name={name} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`truncate text-sm text-mint-primary ${
              unreadCount > 0 ? 'font-semibold' : 'font-medium'
            }`}
          >
            {name}
          </span>
          <RoleBadge role={role} />
        </span>
        {subject && <span className="mt-0.5 block truncate text-xs font-medium text-mint-gray">{subject}</span>}
        {snippet && (
          <span className="mt-1 block truncate text-xs text-mint-gray">{snippet}</span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="whitespace-nowrap text-[11px] text-mint-gray">{time}</span>
        {unreadCount > 0 && (
          <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount}
          </span>
        )}
        {trailing}
      </span>
    </span>
  </button>
);

export const ChatEmpty = ({ icon: Icon, title, message }) => (
  <div className="bg-white rounded-xl shadow-card p-10 text-center">
    <Icon className="w-16 h-16 text-mint-gray mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-mint-primary">{title}</h3>
    <p className="text-mint-gray mt-1">{message}</p>
  </div>
);
