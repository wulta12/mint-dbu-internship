import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, RefreshCw, Mail, MailOpen, AlertCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  ChatBubble,
  ChatComposer,
  ChatEmpty,
  ChatHeader,
  ChatListItem,
  ChatMessages,
  RoleBadge,
  formatWhen
} from '../components/ChatUI';
import { messageService } from '../services/api';
import { toast } from '../components/Toast';

// Inbox for a trainer or trainee: what an administrator sent them, and a reply
// that goes back to the administrator both in-app and by email.
//
// The mailbox only ever holds what arrived, so an exchange comes back as
// separate rows: the message, then the administrator's answer to the reply the
// mailbox cannot see. Threads walk the `parent_id` chain first and then fold
// the remaining roots that share a sender and subject into the same
// conversation, so it reads as one block instead of a scatter of related lines.
const normalizeSubject = (subject) =>
  `${subject || ''}`
    .replace(/^(\s*re:\s*)+/i, '')
    .trim()
    .toLowerCase();

const groupThreads = (messages) => {
  const byId = new Map(messages.map((m) => [m.id, m]));

  const rootOf = (message) => {
    let current = message;
    const seen = new Set();
    while (current.parent_id && byId.has(current.parent_id) && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parent_id);
    }
    return current;
  };

  const roots = messages
    .filter((message) => rootOf(message).id === message.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const threads = [];
  const byKey = new Map();
  const threadByRootId = new Map();

  roots.forEach((root) => {
    const subject = normalizeSubject(root.subject);
    const key = subject ? `${(root.sender_email || '').toLowerCase()}|${subject}` : `id:${root.id}`;
    let thread = byKey.get(key);
    if (!thread) {
      thread = { root, items: [] };
      byKey.set(key, thread);
      threadByRootId.set(root.id, thread);
      threads.push(thread);
    } else {
      threadByRootId.set(root.id, thread);
    }
  });

  messages.forEach((message) => {
    const thread = threadByRootId.get(rootOf(message).id);
    if (thread) thread.items.push(message);
  });

  threads.forEach((thread) =>
    thread.items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  );

  return threads.sort((a, b) => new Date(b.root.created_at) - new Date(a.root.created_at));
};

const senderLabel = (message) => {
  const name = [message.sender_first_name, message.sender_last_name].filter(Boolean).join(' ');
  return name || message.sender_email || 'Administrator';
};

const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch (error) {
    return null;
  }
};

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [sendingReply, setSendingReply] = useState(false);
  // Replies the server does not send back in the inbox (this mailbox only holds
  // what arrived), kept locally so the sent line stays visible in the thread.
  const [echoes, setEchoes] = useState({});

  const me = useMemo(currentUser, []);
  const myName = [me?.first_name, me?.last_name].filter(Boolean).join(' ') || 'You';
  const myRole = me?.role || null;

  const draftFor = (id) => drafts[id] || '';
  const setDraft = (id, value) => setDrafts((prev) => ({ ...prev, [id]: value }));

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await messageService.getInbox();
      const rows = res.data?.messages || [];
      setMessages(rows);
      setUnreadCount(res.data?.unread_count || 0);
      setSelectedId((prev) => (prev && rows.some((m) => m.id === prev) ? prev : null));
    } catch (error) {
      console.error('Error fetching inbox:', error);
      toast.error(error.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSelect = async (thread) => {
    setSelectedId(thread.root.id);
    const unread = thread.items.filter((m) => !m.is_read);
    if (!unread.length) return;

    try {
      await Promise.all(unread.map((m) => messageService.markRead(m.id)));
      const ids = new Set(unread.map((m) => m.id));
      setMessages((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, is_read: true } : m)));
      setUnreadCount((c) => Math.max(0, c - unread.length));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark message as read');
    }
  };

  const handleReply = async (thread) => {
    const id = thread.root.id;
    const body = draftFor(id).trim();
    if (!body) {
      toast.error('Reply is required');
      return;
    }

    // The answer goes to the newest line of the exchange, which is what keeps
    // the `parent_id` chain the administrator sees pointing at this conversation.
    const target = thread.items[thread.items.length - 1];

    try {
      setSendingReply(true);
      const res = await messageService.reply(target.id, body);
      setDraft(id, '');

      // The reply is already stored and the administrator can read it here
      // either way; only the email delivery can fail, so say which happened.
      if (res.data?.emailed) {
        toast.success(res.message || 'Reply sent');
      } else {
        toast.warning(res.message || 'Reply saved, but it could not be emailed.');
      }

      setEchoes((prev) => ({
        ...prev,
        [id]: [
          ...(prev[id] || []),
          {
            id: `local-${Date.now()}`,
            parent_id: target.id,
            message: body,
            created_at: new Date().toISOString(),
            local: true,
            is_read: true
          }
        ]
      }));

      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const threads = useMemo(() => groupThreads(messages), [messages]);
  const selectedThread =
    threads.find((t) => t.root.id === selectedId) ||
    threads.find((t) => t.items.some((item) => item.id === selectedId)) ||
    null;

  const threadItems = useMemo(() => {
    if (!selectedThread) return [];
    return [...selectedThread.items, ...(echoes[selectedThread.root.id] || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }, [selectedThread, echoes]);

  const threadUnread = selectedThread
    ? selectedThread.items.filter((m) => !m.is_read).length
    : 0;

  const listUnread = (thread) => thread.items.filter((m) => !m.is_read).length;

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
            Messages sent to you by the training administration
            {unreadCount > 0 && <span className="ml-1 font-medium text-mint-primary">({unreadCount} unread)</span>}
          </p>
        </div>
        <button
          onClick={fetchMessages}
          className="flex items-center gap-2 px-4 py-2 bg-white text-mint-primary border border-mint-border rounded-lg hover:bg-mint-light transition text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {messages.length === 0 ? (
        <ChatEmpty
          icon={MessageSquare}
          title="No Messages"
          message="Messages from the training administration will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4 h-[calc(100vh-15rem)] min-h-[520px]">
          <div
            className={`bg-white rounded-xl shadow-card overflow-hidden flex flex-col min-h-0 ${
              selectedThread ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="px-4 py-3 border-b border-mint-border flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-mint-gray">
                Conversations
              </span>
              <span className="text-[11px] text-mint-gray">{threads.length}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {threads.map((thread) => (
                <ChatListItem
                  key={thread.root.id}
                  active={Boolean(selectedThread) && selectedThread.root.id === thread.root.id}
                  unreadCount={listUnread(thread)}
                  name={senderLabel(thread.root)}
                  role={thread.root.sender_role}
                  subject={thread.root.subject || '(no subject)'}
                  snippet={thread.items[thread.items.length - 1].message}
                  time={formatWhen(thread.items[thread.items.length - 1].created_at)}
                  onClick={() => handleSelect(thread)}
                />
              ))}
            </div>
          </div>

          <div
            className={`bg-white rounded-xl shadow-card overflow-hidden flex-col min-h-0 ${
              selectedThread ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {selectedThread ? (
              <>
                <ChatHeader
                  name={senderLabel(selectedThread.root)}
                  role={selectedThread.root.sender_role}
                  subtitle={
                    selectedThread.root.subject
                      ? `Subject: ${selectedThread.root.subject}`
                      : '(no subject)'
                  }
                  onBack={() => setSelectedId(null)}
                  right={
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        threadUnread > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {threadUnread > 0 ? <Mail className="w-3 h-3" /> : <MailOpen className="w-3 h-3" />}
                      {threadUnread > 0 ? `${threadUnread} unread` : 'Read'}
                    </span>
                  }
                />

                <ChatMessages syncKey={`${selectedThread.root.id}-${threadItems.length}`}>
                  {threadItems.map((item) => {
                    const isSelf = Boolean(item.local) || item.sender_id === me?.id;
                    return (
                      <ChatBubble
                        key={item.id}
                        side={isSelf ? 'out' : 'in'}
                        isSelf={isSelf}
                        avatar={isSelf ? myName : senderLabel(item)}
                        name={isSelf ? myName : senderLabel(item)}
                        role={isSelf ? myRole : item.sender_role}
                        text={item.message}
                        time={formatWhen(item.created_at)}
                      />
                    );
                  })}
                </ChatMessages>

                <ChatComposer
                  id={`reply-${selectedThread.root.id}`}
                  label={`Reply to ${senderLabel(selectedThread.root)}`}
                  value={draftFor(selectedThread.root.id)}
                  onChange={(value) => setDraft(selectedThread.root.id, value)}
                  onSend={() => handleReply(selectedThread)}
                  sending={sendingReply}
                  placeholder="Write your reply..."
                  hint="Your reply is saved in-app and also emailed to the training administration. Enter sends, Shift+Enter starts a new line."
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-10 text-center">
                <div>
                  <AlertCircle className="w-12 h-12 text-mint-gray mx-auto mb-3" />
                  <p className="text-sm font-medium text-mint-primary">No conversation selected</p>
                  <p className="text-xs text-mint-gray mt-1">
                    Pick a conversation on the left to read it and reply.
                    <RoleBadge role={myRole} className="ml-2" />
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Messages;
