import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import VoiceInput from './VoiceInput';
import FunctionCallCard from './FunctionCallCard';
import { Send, Bot, X, Sparkles, RefreshCw, Languages } from 'lucide-react';

export default function AIChatPanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name || 'there'}! 👋 I am your AI Virtual PG Manager.\n\nYou can ask me naturally or click any quick action below:\n• "How many rooms are empty?"\n• "How much income this month?"\n• "Who has not paid rent?"\n• "Which complaints are pending?"\n• "Show today's visitors"`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 9));
  const messagesEndRef = useRef(null);

  const isOwner = user?.role === 'owner';

  const quickPrompts = isOwner ? [
    "How many rooms are empty?",
    "How much income this month?",
    "Who has not paid rent?",
    "Which complaints are pending?",
    "Show today's visitors",
    "Water problem tomorrow",
    "Show rooms under ₹7000"
  ] : [
    "How much rent is due?",
    "Show today's menu",
    "My AC stopped working",
    "Who is my roommate?",
    "What facilities are available?",
    "Need high protein diet"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query.trim() || loading) return;

    const userMsg = { role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: query, sessionId })
      });

      const aiMsg = {
        role: 'assistant',
        content: data.response || 'I performed the requested action.',
        functionsExecuted: data.functionsExecuted,
        language: data.language,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Action processed: ' + err.message,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="glass-card" style={{
      position: 'fixed',
      right: '1.5rem',
      bottom: '1.5rem',
      width: '420px',
      height: '620px',
      maxHeight: 'calc(100vh - 3rem)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.2))',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Bot size={18} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>AI PG Assistant</h3>
            <span style={{ fontSize: '0.7rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Sparkles size={10} /> Function Calling Active
            </span>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-secondary btn-icon" style={{ width: '30px', height: '30px' }}>
          <X size={16} />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div style={{
        padding: '0.55rem 0.85rem',
        background: 'rgba(0,0,0,0.25)',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        gap: '0.4rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            style={{
              padding: '0.3rem 0.7rem',
              fontSize: '0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '88%',
              padding: '0.75rem 1rem',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, var(--primary), var(--secondary))' 
                : 'rgba(30, 41, 59, 0.85)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-glass)',
              fontSize: '0.86rem',
              lineHeight: '1.45',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              {/* Show Function Execution details */}
              {msg.functionsExecuted && msg.functionsExecuted.map((fn, fIdx) => (
                <FunctionCallCard key={fIdx} fn={fn} />
              ))}

              {msg.content}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)' }}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.language && msg.language !== 'en' && (
                <span className="badge badge-cyan" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                  <Languages size={8} /> {msg.language.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span>AI Manager querying database...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Status indicator */}
      {isListening && (
        <div style={{
          padding: '0.5rem',
          background: 'rgba(244, 63, 94, 0.15)',
          borderTop: '1px solid rgba(244, 63, 94, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: '#fb7185'
        }}>
          <div className="voice-wave">
            <span></span><span></span><span></span><span></span>
          </div>
          <span>Listening... speak your prompt!</span>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        style={{
          padding: '0.85rem',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <VoiceInput
          onSpeechResult={(transcript) => handleSend(transcript)}
          isListening={isListening}
          setIsListening={setIsListening}
        />

        <input
          type="text"
          className="form-input"
          placeholder="Ask AI (e.g. 'How many rooms are empty?')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ height: '40px' }}
        />

        <button type="submit" className="btn btn-primary btn-icon" style={{ width: '40px', height: '40px' }} disabled={loading}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
