import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bot, LogOut, ShieldAlert, Sparkles, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header({ toggleAIChat, isAIChatOpen, hasEmergency }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0.85rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>
          Welcome, <span style={{ color: 'var(--primary)' }}>{user?.name || 'User'}</span>
        </h1>
        {hasEmergency && (
          <span className="badge badge-danger emergency-active" style={{ padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
            <ShieldAlert size={14} /> RED ALERT: Emergency Reported!
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
          title="Go to Homepage"
        >
          <Home size={16} /> Home
        </button>

        <button 
          onClick={toggleAIChat}
          className="btn btn-primary"
          style={{
            borderRadius: 'var(--radius-full)',
            padding: '0.5rem 1.1rem',
            background: isAIChatOpen ? 'var(--primary-hover)' : 'var(--primary)'
          }}
        >
          <Bot size={18} />
          <span>AI Assistant</span>
          <Sparkles size={14} color="#ffd700" />
        </button>

        <button onClick={logout} className="btn btn-secondary btn-icon" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
