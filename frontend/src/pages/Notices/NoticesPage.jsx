import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Bell, Sparkles, Languages, Plus } from 'lucide-react';

export default function NoticesPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [rawInput, setRawInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = () => {
    apiFetch('/notices').then(res => setNotices(res.data || [])).catch(err => console.error(err));
  };

  const handleGenerateNotice = async (e) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    setLoading(true);

    try {
      await apiFetch('/notices', {
        method: 'POST',
        body: JSON.stringify({ rawInput, priority: 'medium', category: 'general' })
      });
      setRawInput('');
      fetchNotices();
    } catch (err) {
      alert('Failed to generate notice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>AI Smart Notice Generator</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Auto-formats professional notices & translates to English, Hindi, Telugu, Tamil, Kannada</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Languages size={16} color="var(--accent-cyan)" />
          <select
            className="form-select"
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
            <option value="te">Telugu (తెలుగు)</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="kn">Kannada (కన్నడ)</option>
          </select>
        </div>
      </div>

      {/* Owner Generator Form */}
      {isOwner && (
        <form onSubmit={handleGenerateNotice} className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="var(--primary)" /> Write Rough Idea (Feature #7):
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 'Water problem tomorrow from 10am to 2pm'"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'AI Writing & Translating...' : 'Generate Notice'}
            </button>
          </div>
        </form>
      )}

      {/* Notice Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notices.map(notice => (
          <div key={notice._id} className="glass-card" style={{ padding: '1.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{notice.title}</h3>
              <span className="badge badge-primary">{notice.category}</span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              {notice.translations?.[selectedLang] || notice.content}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Created: {new Date(notice.createdAt).toLocaleDateString()}</span>
              {notice.aiGenerated && (
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                  <Sparkles size={10} /> AI Multi-language Auto-Translated
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
