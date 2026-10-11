import React, { useEffect, useRef, useState } from 'react';
import { Send, X, Sparkles, Maximize2, Minimize2, History, Plus, Volume2, VolumeX, Trash2, WifiOff, Bot, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { firstName, formatTime, timeAgo } from '../../utils/format';
import Markdown from './Markdown';
import ChatCards from './ChatCards';
import VoiceInput from './VoiceInput';

const SESSION_KEY = 'pg_chat_session';

const PROMPTS = {
  owner: [
    "How's my PG doing today?",
    "Who hasn't paid rent?",
    'Send rent reminders',
    'Show open complaints',
    "What's on my to-do list?",
    'How many beds are vacant?',
    'Expenses this month',
    'Water cut tomorrow 10 to 2, make a notice'
  ],
  tenant: [
    'Is my rent due?',
    "What's for dinner tonight?",
    'My room fan is not working',
    'What time does the gate close?',
    'Who is my roommate?',
    'How do I pay rent?',
    'High protein food today?',
    'My friend is visiting at 5pm'
  ]
};

const newSessionId = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function welcome(user) {
  const name = firstName(user?.name);
  return user?.role === 'owner'
    ? `Hi ${name} 👋 I'm **PG Buddy**, your AI operations manager.\n\nI can check vacancies, chase rent, sort complaints, write notices, log expenses and more — just ask in plain words (English, Hindi, Telugu, Tamil or Kannada).`
    : `Hi ${name} 👋 I'm **PG Buddy**, your helper at the PG.\n\nAsk me about your rent, today's menu, PG rules, or tell me if something in your room needs fixing — I'll log it for you right away.`;
}

export default function AIChatPanel({ open, onClose }) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || newSessionId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [speak, setSpeak] = useState(() => localStorage.getItem('pg_chat_speak') === '1');
  const [offline, setOffline] = useState(false);
  const [copied, setCopied] = useState(null);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const loadedFor = useRef(null);

  const role = user?.role === 'owner' ? 'owner' : 'tenant';

  // Restore the current conversation when the panel first opens.
  useEffect(() => {
    if (!open || loadedFor.current === sessionId) return;
    loadedFor.current = sessionId;
    localStorage.setItem(SESSION_KEY, sessionId);
    apiFetch(`/ai/history/${sessionId}`)
      .then(res => {
        const history = res.data.map(m => ({ role: m.role, content: m.content, cards: m.cards, timestamp: m.timestamp }));
        // Keep anything sent while history was loading.
        setMessages(prev => [...history, ...prev.filter(p => !history.some(h => h.role === p.role && h.content === p.content))]);
      })
      .catch(() => setMessages([]));
  }, [open, sessionId]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Other screens can open the panel with a question already asked.
  const [queued, setQueued] = useState(null);
  useEffect(() => {
    const onAsk = (e) => e.detail?.message && setQueued(e.detail.message);
    window.addEventListener('pg:open-ai', onAsk);
    return () => window.removeEventListener('pg:open-ai', onAsk);
  }, []);

  const speakText = (text) => {
    if (!speak || !window.speechSynthesis) return;
    const clean = text.replace(/[*_`#|>-]/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/\S+/g, '').slice(0, 600);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = /[ఀ-౿]/.test(clean) ? 'te-IN' : /[ऀ-ॿ]/.test(clean) ? 'hi-IN' : /[஀-௿]/.test(clean) ? 'ta-IN' : /[ಀ-೿]/.test(clean) ? 'kn-IN' : 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: message, timestamp: new Date() }]);
    setSending(true);
    try {
      const res = await apiFetch('/ai/chat', { method: 'POST', body: JSON.stringify({ message, sessionId }) });
      setOffline(res.mode === 'offline');
      setMessages(m => [...m, { role: 'assistant', content: res.response, cards: res.cards, functions: res.functionsExecuted, timestamp: new Date() }]);
      speakText(res.response);
      // Let pages refresh if the assistant changed something.
      if (res.functionsExecuted?.length) window.dispatchEvent(new CustomEvent('pg:data-changed', { detail: res.functionsExecuted.map(f => f.name) }));
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `Sorry — ${e.message}`, error: true, timestamp: new Date() }]);
    } finally {
      setSending(false);
    }
  };

  const startNew = () => {
    const id = newSessionId();
    loadedFor.current = id;
    setSessionId(id);
    localStorage.setItem(SESSION_KEY, id);
    setMessages([]);
    setShowHistory(false);
  };

  const openHistory = async () => {
    setShowHistory(s => !s);
    try { setSessions((await apiFetch('/ai/sessions')).data); } catch { setSessions([]); }
  };

  const deleteSession = async (id) => {
    await apiFetch(`/ai/history/${id}`, { method: 'DELETE' }).catch(() => {});
    setSessions(s => s.filter(x => x.sessionId !== id));
    if (id === sessionId) startNew();
  };

  const copy = (text, i) => {
    navigator.clipboard?.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1200);
  };

  useEffect(() => {
    if (open && queued && !sending) {
      setShowHistory(false);
      send(queued);
      setQueued(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queued]);

  if (!open) return null;

  return (
    <div className={`chat-panel ${expanded ? 'expanded' : ''}`} role="dialog" aria-label="AI assistant">
      <div className="chat-head">
        <div className="chat-avatar"><Sparkles size={20} /></div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="bold">PG Buddy</div>
          <div className="tiny row-sm ellipsis" style={{ opacity: 0.9, flexWrap: 'nowrap' }}>
            {offline ? <><WifiOff size={11} /> Offline · basic answers</> : <><span className="pulse-dot" style={{ background: '#bbf7d0', flexShrink: 0 }} /> Online · 5 languages</>}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setSpeak(s => { localStorage.setItem('pg_chat_speak', s ? '0' : '1'); return !s; }); window.speechSynthesis?.cancel(); }} title={speak ? 'Stop reading replies aloud' : 'Read replies aloud'}>
          {speak ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={openHistory} title="Conversations"><History size={17} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={startNew} title="New chat"><Plus size={18} /></button>
        <button className="btn btn-ghost btn-icon btn-sm desktop-only" onClick={() => setExpanded(e => !e)} title={expanded ? 'Shrink' : 'Expand'}>
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} title="Close"><X size={18} /></button>
      </div>

      {showHistory ? (
        <div className="chat-body" style={{ gap: 8 }}>
          <div className="row between">
            <span className="bold">Your conversations</span>
            <button className="btn btn-soft btn-sm" onClick={startNew}><Plus size={14} />New chat</button>
          </div>
          {!sessions.length && <div className="empty small">No saved conversations yet.</div>}
          {sessions.map(s => (
            <div key={s.sessionId} className="card row" style={{ padding: '10px 12px', borderColor: s.sessionId === sessionId ? 'var(--brand)' : undefined }}>
              <button className="grow" style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
                onClick={() => { loadedFor.current = null; setSessionId(s.sessionId); setShowHistory(false); }}>
                <div className="bold small ellipsis">{s.title}</div>
                <div className="tiny faint">{timeAgo(s.lastActivity)} · {Math.ceil(s.messageCount / 2)} question{s.messageCount > 2 ? 's' : ''}</div>
              </button>
              <button className="btn btn-ghost btn-icon btn-xs" onClick={() => deleteSession(s.sessionId)} title="Delete"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="chat-body" ref={bodyRef}>
          <div className="msg msg-ai">
            <div className="bubble"><Markdown text={welcome(user)} /></div>
          </div>

          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'user' ? 'msg-user' : 'msg-ai'}`}>
              <div style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div className="bubble" style={m.error ? { borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' } : undefined}>
                  {m.role === 'user' ? m.content : <Markdown text={m.content} />}
                  {m.role !== 'user' && <ChatCards cards={m.cards} />}
                </div>
                <div className="msg-meta">
                  {formatTime(m.timestamp)}
                  {m.role !== 'user' && (
                    <button className="btn btn-ghost btn-xs" style={{ height: 20, padding: '0 4px' }} onClick={() => copy(m.content, i)} title="Copy">
                      {copied === i ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="msg msg-ai">
              <div className="bubble" style={{ padding: 0 }}><div className="typing"><span /><span /><span /></div></div>
            </div>
          )}

          {!messages.length && !sending && (
            <div className="stack-sm" style={{ marginTop: 4 }}>
              <div className="tiny bold faint row-sm"><Bot size={13} />Try asking</div>
              <div className="row wrap" style={{ gap: 6 }}>
                {PROMPTS[role].map(p => <button key={p} className="chip" onClick={() => send(p)}>{p}</button>)}
              </div>
            </div>
          )}
        </div>
      )}

      {!showHistory && messages.length > 0 && (
        <div className="chat-suggestions">
          {PROMPTS[role].slice(0, 6).map(p => <button key={p} className="chip" style={{ height: 28, fontSize: '0.74rem' }} onClick={() => send(p)} disabled={sending}>{p}</button>)}
        </div>
      )}

      <form className="chat-input" onSubmit={e => { e.preventDefault(); send(); }}>
        <VoiceInput disabled={sending} onInterim={setInput} onFinal={(t) => send(t)} />
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          placeholder={role === 'owner' ? 'Ask or tell me to do something…' : 'Ask anything about your stay…'}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          aria-label="Message"
        />
        <button type="submit" className="btn btn-primary btn-icon" style={{ height: 42, width: 42, borderRadius: 12 }} disabled={sending || !input.trim()} aria-label="Send">
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
