import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  Mail,
  MailOpen,
  CheckCheck,
  Send,
  X,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import {
  ChatBubble,
  ChatComposer,
  ChatEmpty,
  ChatHeader,
  ChatListItem,
  ChatMessages,
  RoleBadge,
  formatWhen
} from '../../components/ChatUI';
import { contactService, messageService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const STATUS_FILTERS = [
  { value: '', label: 'All Messages' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' }
];

const TABS = [
  { value: 'contact', label: 'Contact Form' },
  { value: 'received', label: 'Received' },
  { value: 'sent', label: 'Sent Messages' }
];

// The Received tab groups by the sender's role, so the admin can answer one
// cohort without wading through everyone else's replies.
const SENDER_ROLE_FILTERS = [
  { value: '', label: 'All Roles' },
  { value: 'trainer', label: 'Trainers' },
  { value: 'trainee', label: 'Trainees' },
  { value: 'admin', label: 'Admins' }
];

const fullName = (user) =>
  [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.email || 'Unknown';

const roleLabel = (role) => (role === 'trainer' ? 'Trainer' : role === 'trainee' ? 'Trainee' : role);

const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch (error) {
    return null;
  }
};

// The flat message lists become conversations: each thread walks up to the
// message that opened it, then collects every reply that hangs off it, oldest
// first, so a back-and-forth reads as one exchange instead of scattered rows.
const buildThreads = (roots, all) => {
  const byId = new Map(all.map((m) => [m.id, m]));
  const used = new Set();
  const threads = [];
  const sorted = [...roots].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  for (const root of sorted) {
    if (used.has(root.id)) continue;

    let start = root;
    const walked = new Set([root.id]);
    while (start.parent_id && byId.has(start.parent_id) && !used.has(start.parent_id)) {
      const parent = byId.get(start.parent_id);
      if (walked.has(parent.id)) break;
      walked.add(parent.id);
      start = parent;
    }

    const items = [start];
    const seen = new Set([start.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const message of all) {
        if (seen.has(message.id) || used.has(message.id)) continue;
        if (message.parent_id && seen.has(message.parent_id)) {
          items.push(message);
          seen.add(message.id);
          grew = true;
        }
      }
    }

    items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    items.forEach((m) => used.add(m.id));
    threads.push({ root: start, items });
  }

  return threads;
};

const threadDraftKey = (id) => `thread:${id}`;

// ---------------------------------------------------------------------------
// Compose: an admin writes one message and picks who receives it. Recipients
// are picked by role group so a large cohort does not have to be clicked
// through one at a time, with a search box for finding someone by name.
// ---------------------------------------------------------------------------
const ComposeModal = ({ open, onClose, onSent }) => {
  const [recipients, setRecipients] = useState([]);
  const [selected, setSelected] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Loaded when the modal opens rather than on page mount: the recipient list is
  // only needed while composing, and it is the heaviest call on this page.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingRecipients(true);

    messageService
      .getRecipients()
      .then((res) => {
        if (!cancelled) setRecipients(res.data?.recipients || []);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error.response?.data?.message || 'Failed to load recipients');
      })
      .finally(() => {
        if (!cancelled) setLoadingRecipients(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) =>
      `${fullName(r)} ${r.email} ${r.role}`.toLowerCase().includes(q)
    );
  }, [recipients, recipientSearch]);

  const grouped = useMemo(() => {
    const byRole = { trainer: [], trainee: [] };
    filtered.forEach((r) => {
      (byRole[r.role] = byRole[r.role] || []).push(r);
    });
    return byRole;
  }, [filtered]);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleGroup = (role) => {
    const ids = (grouped[role] || []).map((r) => r.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));

    setSelected((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  const reset = () => {
    setSelected([]);
    setRecipientSearch('');
    setSubject('');
    setMessage('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSend = async () => {
    if (!selected.length) {
      toast.error('Select at least one recipient');
      return;
    }
    if (!message.trim()) {
      toast.error('Message is required');
      return;
    }

    try {
      setSending(true);
      const res = await messageService.send({
        recipientIds: selected,
        subject: subject.trim(),
        message: message.trim()
      });

      toast.success(res.message || 'Message sent');
      reset();
      onSent();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-mint-border">
          <div>
            <h2 className="text-lg font-semibold text-mint-primary">New Message</h2>
            <p className="text-xs text-mint-gray mt-0.5">
              The message is delivered to each recipient and emailed to them.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-mint-light text-mint-gray transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-mint-primary mb-2">
              Send to{' '}
              {selected.length > 0 && (
                <span className="text-mint-gray font-normal">({selected.length} selected)</span>
              )}
            </label>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-mint-gray absolute left-3 top-2.5" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
              />
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selected.map((id) => {
                  const person = recipients.find((r) => r.id === id);
                  if (!person) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mint-light text-mint-primary text-xs"
                    >
                      {fullName(person)}
                      <button
                        onClick={() => toggle(id)}
                        className="hover:text-red-600 transition"
                        aria-label={`Remove ${fullName(person)}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="border border-mint-border rounded-lg max-h-56 overflow-y-auto">
              {loadingRecipients ? (
                <p className="p-4 text-sm text-mint-gray text-center">Loading recipients...</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-mint-gray text-center">
                  {recipients.length === 0 ? 'No active trainers or trainees found.' : 'No one matches that search.'}
                </p>
              ) : (
                Object.entries(grouped).map(([role, people]) => (
                  <div key={role}>
                    <div className="flex items-center justify-between px-3 py-2 bg-mint-light border-b border-mint-border sticky top-0">
                      <span className="text-xs font-semibold text-mint-gray uppercase tracking-wide">
                        {roleLabel(role)}s ({people.length})
                      </span>
                      <button
                        onClick={() => toggleGroup(role)}
                        className="text-xs font-medium text-mint-primary hover:underline"
                      >
                        {people.every((p) => selected.includes(p.id)) ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    {people.map((person) => (
                      <label
                        key={person.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-mint-light/60 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(person.id)}
                          onChange={() => toggle(person.id)}
                          className="w-4 h-4 text-mint-primary rounded border-mint-border focus:ring-mint-primary"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="block text-sm text-mint-primary font-medium truncate">
                              {fullName(person)}
                            </span>
                            <RoleBadge role={person.role} />
                          </span>
                          <span className="block text-xs text-mint-gray truncate">{person.email}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label htmlFor="compose-subject" className="block text-sm font-medium text-mint-primary mb-2">
              Subject <span className="text-mint-gray font-normal">(optional)</span>
            </label>
            <input
              id="compose-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="A short summary"
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
            />
          </div>

          <div>
            <label htmlFor="compose-message" className="block text-sm font-medium text-mint-primary mb-2">
              Message
            </label>
            <div className="rounded-2xl border border-mint-border bg-mint-light px-3 py-2 transition focus-within:border-mint-primary focus-within:ring-2 focus-within:ring-mint-primary/20">
              <textarea
                id="compose-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                maxLength={2000}
                placeholder="Write your message here..."
                className="w-full resize-none bg-transparent px-1 py-1.5 text-sm text-mint-text placeholder:text-mint-gray focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <p className="text-xs text-mint-gray">{message.length}/2000</p>
                <button
                  onClick={handleSend}
                  disabled={sending || !selected.length || !message.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-mint-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-mint-border">
          <button
            onClick={handleClose}
            disabled={sending}
            className="px-4 py-2 text-sm text-mint-gray hover:text-mint-primary transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The page. Two views over the same concept: messages that arrived from the
// public contact form (which may be answered by email) and messages this admin
// sent to users.
// ---------------------------------------------------------------------------
const Messages = () => {
  const [tab, setTab] = useState('contact');

  const [messages, setMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [receivedUnread, setReceivedUnread] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [senderRole, setSenderRole] = useState('');
  const [search, setSearch] = useState('');
  const [recipientRoles, setRecipientRoles] = useState({});

  const [composeOpen, setComposeOpen] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const me = useMemo(currentUser, []);
  const myName = [me?.first_name, me?.last_name].filter(Boolean).join(' ') || 'You';
  const myRole = me?.role || null;

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contactService.getMessages({
        status: statusFilter || undefined,
        search: search || undefined
      });
      const rows = res.data?.messages || [];
      setMessages(rows);
      setUnreadCount(res.data?.unread_count || 0);
      setSelectedId((prev) => (prev && rows.some((m) => m.id === prev) ? prev : null));
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchSent = useCallback(async () => {
    try {
      const res = await messageService.getSent();
      setSentMessages(res.data?.messages || []);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load sent messages');
    }
  }, []);

  const fetchReceived = useCallback(async () => {
    try {
      const res = await messageService.getInbox(senderRole || undefined);
      const rows = res.data?.messages || [];
      setReceivedMessages(rows);
      setReceivedUnread(res.data?.unread_count || 0);
    } catch (error) {
      console.error('Error fetching received messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load received messages');
    }
  }, [senderRole]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Both sides of a conversation are needed to draw it as one thread: what came
  // in and what went back out.
  useEffect(() => {
    if (tab === 'sent') fetchSent();
    if (tab === 'received') {
      fetchReceived();
      fetchSent();
    }
  }, [tab, fetchSent, fetchReceived]);

  // The Sent list carries the recipient but not their role; the picker endpoint
  // already has it, so it is looked up once for the badge next to their name.
  useEffect(() => {
    if (tab !== 'sent') return undefined;
    let cancelled = false;

    messageService
      .getRecipients()
      .then((res) => {
        if (cancelled) return;
        const map = {};
        (res.data?.recipients || []).forEach((r) => {
          map[r.id] = r.role;
        });
        setRecipientRoles(map);
      })
      .catch(() => {
        // A missing role only means no badge; the conversation still reads fine.
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    setChatId(null);
  }, [tab]);

  const handleSelectThread = async (thread) => {
    setChatId(thread.root.id);
    const unread = thread.items.filter((item) => item.side === 'in' && !item.is_read);
    if (!unread.length) return;

    try {
      await Promise.all(unread.map((m) => messageService.markRead(m.id)));
      const ids = new Set(unread.map((m) => m.id));
      setReceivedMessages((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, is_read: true } : m)));
      setReceivedUnread((c) => Math.max(0, c - unread.length));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark message as read');
    }
  };

  // A reply from the admin lands in the same thread the user started, so it
  // returns to the sender's own inbox by way of the parent message.
  const handleReplyThread = async (thread) => {
    const key = threadDraftKey(thread.root.id);
    const body = draftFor(key).trim();
    if (!body) {
      toast.error('Reply message is required');
      return;
    }

    try {
      setSendingReply(true);
      const target = thread.items[thread.items.length - 1];
      const res = await messageService.reply(target.id, body);
      setDraft(key, '');
      if (res.data?.emailed) {
        toast.success(res.message || 'Reply sent');
      } else {
        toast.warning(res.message || 'Reply saved, but it could not be emailed.');
      }
      fetchReceived();
      fetchSent();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Each message carries its own reply draft, so moving between rows does not
  // lose what was half-typed.
  const [drafts, setDrafts] = useState({});
  const draftFor = (id) => drafts[id] || '';

  const setDraft = (id, value) => setDrafts((prev) => ({ ...prev, [id]: value }));

  const handleSelect = async (message) => {
    setSelectedId(message.id);
    if (!message.is_read) {
      try {
        await contactService.markRead(message.id);
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to mark message as read');
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await contactService.markAllRead();
      toast.success('All messages marked as read');
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark all messages as read');
    }
  };

  const handleReply = async (id) => {
    const body = draftFor(id).trim();
    if (!body) {
      toast.error('Reply message is required');
      return;
    }

    try {
      setSendingReply(true);
      const res = await contactService.replyMessage(id, body);
      setDraft(id, '');

      // The reply is stored whether or not the mail went out, so the distinction
      // the admin needs is "did they receive it", not "did it save".
      if (res.data?.email_sent) {
        toast.success(res.message || 'Reply sent to the sender');
      } else {
        toast.warning(
          res.message || 'Reply saved, but it could not be emailed. Send it from your own mail client.'
        );
      }

      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !(await confirm('Are you sure you want to delete this message? This cannot be undone.', {
        title: 'Delete Message',
        confirmText: 'Delete'
      }))
    ) {
      return;
    }
    try {
      await contactService.deleteMessage(id);
      toast.success('Message deleted');
      if (selectedId === id) setSelectedId(null);
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const selected = messages.find((m) => m.id === selectedId) || null;

  // Both chat tabs draw from the same joined pool of messages.
  const allMessages = useMemo(() => {
    const byId = new Map();
    receivedMessages.forEach((m) => byId.set(m.id, { ...m, side: 'in' }));
    sentMessages.forEach((m) => byId.set(m.id, { ...m, side: 'out' }));
    return Array.from(byId.values());
  }, [receivedMessages, sentMessages]);

  const threads = useMemo(() => {
    const receivedIds = new Set(receivedMessages.map((m) => m.id));
    const roots =
      tab === 'sent'
        ? sentMessages.filter((m) => !m.parent_id)
        : receivedMessages.filter((m) => !m.parent_id || !receivedIds.has(m.parent_id));
    return buildThreads(roots, allMessages);
  }, [tab, sentMessages, receivedMessages, allMessages]);

  const sortedThreads = useMemo(
    () =>
      [...threads].sort(
        (a, b) => new Date(b.items[b.items.length - 1].created_at) - new Date(a.items[a.items.length - 1].created_at)
      ),
    [threads]
  );

  const selectedThread =
    sortedThreads.find((t) => t.root.id === chatId) ||
    sortedThreads.find((t) => t.items.some((item) => item.id === chatId)) ||
    null;

  // Who the conversation is with, and which role they hold.
  const peerOf = (thread) => {
    const root = thread.root;
    const incoming = thread.items.find((item) => item.side === 'in');

    if (root.side === 'in') {
      return { name: fullName(root), role: root.sender_role || null, email: root.sender_email };
    }

    return {
      name: fullName({
        first_name: root.recipient_first_name,
        last_name: root.recipient_last_name
      }),
      role: (incoming && incoming.sender_role) || recipientRoles[root.recipient_id] || null,
      email: root.recipient_email
    };
  };

  const listUnread = (thread) => thread.items.filter((item) => item.side === 'in' && !item.is_read).length;

  const threadTrailing = (thread) => {
    if (tab === 'received') return null;
    const replied = thread.items.some((item) => item.side === 'in');
    return replied ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        Replied
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
        <AlertCircle className="w-3 h-3" />
        No reply
      </span>
    );
  };

  // Counts for the tabs, so the admin can tell which view has something waiting.
  const tabUnread = (value) => {
    if (value === 'contact') return unreadCount;
    if (value === 'received') return receivedUnread;
    return 0;
  };

  const refreshActive = () => {
    if (tab === 'contact') fetchMessages();
    else {
      fetchReceived();
      fetchSent();
    }
  };

  const chatPane = (thread) => {
    const peerInfo = peerOf(thread);
    const unread = thread.items.filter((item) => item.side === 'in' && !item.is_read).length;

    return (
      <div
        className={`bg-white rounded-xl shadow-card overflow-hidden flex-col min-h-0 ${
          thread ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {thread ? (
          <>
            <ChatHeader
              name={peerInfo.name}
              role={peerInfo.role}
              subtitle={`${thread.root.subject || '(no subject)'} · ${peerInfo.email}`}
              onBack={() => setChatId(null)}
              right={
                <span
                  className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    unread > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {unread > 0 ? <Mail className="w-3 h-3" /> : <MailOpen className="w-3 h-3" />}
                  {unread > 0 ? `${unread} unread` : 'Read'}
                </span>
              }
            />

            <ChatMessages syncKey={`${thread.root.id}-${thread.items.length}`}>
              {thread.items.map((item) => {
                const isSelf = item.side === 'out';
                return (
                  <ChatBubble
                    key={item.id}
                    side={isSelf ? 'out' : 'in'}
                    isSelf={isSelf}
                    avatar={isSelf ? myName : fullName(item)}
                    name={isSelf ? myName : fullName(item)}
                    role={isSelf ? myRole : item.sender_role}
                    text={item.message}
                    time={formatWhen(item.created_at)}
                  />
                );
              })}
            </ChatMessages>

            <ChatComposer
              id={`thread-reply-${thread.root.id}`}
              label={`Reply to ${peerInfo.name}`}
              value={draftFor(threadDraftKey(thread.root.id))}
              onChange={(value) => setDraft(threadDraftKey(thread.root.id), value)}
              onSend={() => handleReplyThread(thread)}
              sending={sendingReply}
              placeholder="Write your reply..."
              hint={`Goes to ${peerInfo.email}. The reply is saved in-app and also emailed. Enter sends, Shift+Enter starts a new line.`}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-10 text-center">
            <div>
              <AlertCircle className="w-12 h-12 text-mint-gray mx-auto mb-3" />
              <p className="text-sm font-medium text-mint-primary">No conversation selected</p>
              <p className="text-xs text-mint-gray mt-1">
                Pick a conversation on the left to read it and reply.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading messages...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-mint-primary">Messages</h1>
          <p className="text-mint-gray">
            Contact form messages, replies from users, and messages sent to users
            {tabUnread(tab) > 0 && (
              <span className="ml-1 font-medium text-mint-primary">({tabUnread(tab)} unread)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'contact' && (
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white text-mint-primary border border-mint-border rounded-lg hover:bg-mint-light transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          <button
            onClick={refreshActive}
            className="flex items-center gap-2 px-4 py-2 bg-white text-mint-primary border border-mint-border rounded-lg hover:bg-mint-light transition text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            New Message
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-mint-light rounded-lg">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t.value ? 'bg-white text-mint-primary shadow-sm' : 'text-mint-gray hover:text-mint-primary'
              }`}
            >
              {t.label}
              {tabUnread(t.value) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                  {tabUnread(t.value)}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'received' && (
          <select
            value={senderRole}
            onChange={(e) => setSenderRole(e.target.value)}
            aria-label="Filter received messages by sender role"
            className="px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
          >
            {SENDER_ROLE_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {tab === 'contact' && (
          <>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-mint-gray absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMessages()}
                placeholder="Search name, email, subject, or message..."
                className="w-full pl-9 pr-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={fetchMessages}
              className="px-4 py-2 bg-mint-light text-mint-primary rounded-lg hover:bg-mint-primary hover:text-white transition text-sm font-medium"
            >
              Apply Filters
            </button>
          </>
        )}
      </div>

      {tab === 'contact' &&
        (messages.length === 0 ? (
          <ChatEmpty
            icon={MessageSquare}
            title="No Messages Found"
            message="No contact messages match the current filters."
          />
        ) : (
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-mint-light border-b border-mint-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">From</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Subject</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Message</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Received</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr
                      key={message.id}
                      onClick={() => handleSelect(message)}
                      className={`border-b border-mint-border transition cursor-pointer ${
                        message.is_read ? 'hover:bg-mint-light/50' : 'bg-mint-light/40 hover:bg-mint-light/70'
                      } ${selectedId === message.id ? 'ring-2 ring-inset ring-mint-primary' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <p
                          className={`text-mint-primary ${
                            message.is_read ? 'font-medium' : 'font-semibold'
                          }`}
                        >
                          {message.name}
                        </p>
                        <a
                          href={`mailto:${message.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-mint-gray hover:text-mint-primary hover:underline"
                        >
                          {message.email}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-mint-primary">{message.subject || '—'}</td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="text-mint-gray text-sm whitespace-pre-wrap break-words line-clamp-2">
                          {message.message}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-mint-gray whitespace-nowrap">
                        {new Date(message.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                              message.is_read ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {message.is_read ? <MailOpen className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                            {message.is_read ? 'Read' : 'Unread'}
                          </span>
                          {message.is_replied && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Replied
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(message.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition text-sm"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected && (
              <div className="border-t border-mint-border bg-mint-light/40 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-mint-primary">
                      {selected.subject || '(no subject)'}
                    </h3>
                    <p className="text-sm text-mint-gray">
                      From{' '}
                      <span className="font-medium text-mint-primary">{selected.name}</span>{' '}
                      &lt;
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-mint-primary hover:underline"
                      >
                        {selected.email}
                      </a>
                      &gt;
                    </p>
                    <p className="text-xs text-mint-gray mt-1">
                      {new Date(selected.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition text-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>

                <div className="space-y-4">
                  <ChatBubble
                    side="in"
                    name={selected.name}
                    text={selected.message}
                    time={formatWhen(selected.created_at)}
                  />

                  {selected.is_replied && selected.reply_message && (
                    <ChatBubble
                      side="out"
                      isSelf
                      avatar={myName}
                      role={myRole}
                      text={selected.reply_message}
                      time={formatWhen(selected.replied_at)}
                    />
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-mint-border">
                  <ChatComposer
                    id="reply-body"
                    label={`Reply to ${selected.name}`}
                    value={draftFor(selected.id)}
                    onChange={(value) => setDraft(selected.id, value)}
                    onSend={() => handleReply(selected.id)}
                    sending={sendingReply}
                    placeholder="Write your reply..."
                    hint={`Goes to ${selected.email}. ${
                      selected.is_replied
                        ? 'Sending another reply replaces the text above and emails the sender again.'
                        : 'Your reply is emailed to the sender.'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

      {tab === 'sent' &&
        (sortedThreads.length === 0 ? (
          <ChatEmpty
            icon={Users}
            title="No Messages Sent Yet"
            message="Use “New Message” to message trainers and trainees directly."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4 h-[calc(100vh-19rem)] min-h-[460px]">
            <div
              className={`bg-white rounded-xl shadow-card overflow-hidden flex flex-col min-h-0 ${
                selectedThread ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="px-4 py-3 border-b border-mint-border flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-mint-gray">
                  Conversations
                </span>
                <span className="text-[11px] text-mint-gray">{sortedThreads.length}</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {sortedThreads.map((thread) => (
                  <ChatListItem
                    key={thread.root.id}
                    active={selectedThread && selectedThread.root.id === thread.root.id}
                    unreadCount={listUnread(thread)}
                    name={peerOf(thread).name}
                    role={peerOf(thread).role}
                    subject={thread.root.subject || '(no subject)'}
                    snippet={thread.items[thread.items.length - 1].message}
                    time={formatWhen(thread.items[thread.items.length - 1].created_at)}
                    trailing={threadTrailing(thread)}
                    onClick={() => handleSelectThread(thread)}
                  />
                ))}
              </div>
            </div>

            {chatPane(selectedThread)}
          </div>
        ))}

      {tab === 'received' &&
        (sortedThreads.length === 0 ? (
          <ChatEmpty
            icon={Users}
            title="Nothing Received Yet"
            message={
              senderRole
                ? 'No messages from that role. Try “All Roles” to see everyone.'
                : 'Replies to your messages will appear here.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4 h-[calc(100vh-19rem)] min-h-[460px]">
            <div
              className={`bg-white rounded-xl shadow-card overflow-hidden flex flex-col min-h-0 ${
                selectedThread ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="px-4 py-3 border-b border-mint-border flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-mint-gray">
                  Conversations
                </span>
                <span className="text-[11px] text-mint-gray">{sortedThreads.length}</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {sortedThreads.map((thread) => (
                  <ChatListItem
                    key={thread.root.id}
                    active={selectedThread && selectedThread.root.id === thread.root.id}
                    unreadCount={listUnread(thread)}
                    name={peerOf(thread).name}
                    role={peerOf(thread).role}
                    subject={thread.root.subject || '(no subject)'}
                    snippet={thread.items[thread.items.length - 1].message}
                    time={formatWhen(thread.items[thread.items.length - 1].created_at)}
                    onClick={() => handleSelectThread(thread)}
                  />
                ))}
              </div>
            </div>

            {chatPane(selectedThread)}
          </div>
        ))}

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => {
          setTab('sent');
          fetchSent();
        }}
      />
    </AppLayout>
  );
};

export default Messages;
