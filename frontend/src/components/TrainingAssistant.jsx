import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, User, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { assistantService } from '../services/api';

let msgId = 0;
const nextMsgId = () => `msg-${++msgId}`;

const SUGGESTIONS = ['Summarize this lesson', 'Explain the main idea', 'Define key terms', 'Give me an example'];

const TrainingAssistant = ({ onClose, trainingId, trainingTitle, lessonId, lessonTitle }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState('');
  const bottomRef = useRef(null);

  // Welcome message (context-aware, no API call needed).
  useEffect(() => {
    setMessages([{
      id: nextMsgId(),
      role: 'ai',
      text: `Hello! I am your AI Training Assistant for "${trainingTitle}".\n` +
        'I can help you understand the learning material: explain concepts in simple terms, define terms, summarize this lesson, or give examples.\n\n' +
        `You are currently viewing: ${lessonTitle || 'the training overview'}.\n\n` +
        'Note: I cannot answer assessment questions for you — you will answer those yourself using the lesson materials.'
    }]);
    setRequestError('');
  }, [trainingId, trainingTitle, lessonId, lessonTitle]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { id: nextMsgId(), role: 'user', text }]);
    setInput('');
    setSending(true);
    setRequestError('');
    try {
      const res = await assistantService.chat(trainingId, lessonId, text);
      const reply = res?.data?.message || 'I could not find an answer. Please try rephrasing your question.';
      setMessages((m) => [...m, { id: nextMsgId(), role: 'ai', text: reply }]);
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Something went wrong while contacting the assistant. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed z-[70] right-0 sm:right-4 bottom-0 sm:bottom-4 w-full sm:w-[400px] h-2/3 sm:h-[560px] max-h-[85vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-card-hover border border-mint-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-mint-primary to-mint-secondary px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-mint-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-tight truncate">AI Training Assistant</p>
            <p className="text-white/60 text-[11px] truncate">{lessonTitle || trainingTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI Training Assistant"
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-mint-light/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 mt-0.5 rounded-full bg-white border border-mint-border flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-mint-primary" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-mint-primary text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 border border-mint-border rounded-tl-sm'
              }`}
            >
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 mt-0.5 rounded-full bg-mint-primary flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 mt-0.5 rounded-full bg-white border border-mint-border flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-mint-primary" />
            </div>
            <div className="bg-white border border-mint-border rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2 text-sm text-mint-gray">
              <Loader2 className="w-4 h-4 animate-spin text-mint-primary" />
              Thinking…
            </div>
          </div>
        )}

        {requestError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{requestError}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions / Input */}
      <div className="border-t border-mint-border bg-white px-3 pt-2.5 pb-3 shrink-0">
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={sending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-light border border-mint-border text-xs text-mint-primary hover:bg-mint-primary/10 transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about this lesson…"
            className="flex-1 resize-none rounded-xl border border-mint-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary/25 focus:border-mint-primary"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || sending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mint-primary text-white hover:bg-opacity-90 transition text-sm font-semibold disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingAssistant;