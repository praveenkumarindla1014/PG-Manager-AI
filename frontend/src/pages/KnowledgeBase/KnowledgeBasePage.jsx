import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Search, Sparkles, Upload, FileText } from 'lucide-react';

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [ragResult, setRagResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [docName, setDocName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('pg-rules');
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = () => {
    apiFetch('/knowledge-base').then(res => setDocs(res.data || [])).catch(err => console.error(err));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/knowledge-base/search', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      setRagResult(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!docName.trim() || !content.trim()) return;
    try {
      await apiFetch('/knowledge-base', {
        method: 'POST',
        body: JSON.stringify({ documentName: docName, content, category })
      });
      setDocName('');
      setContent('');
      fetchDocs();
      alert('Document Chunked & Embedded into Vector Storage!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>AI Knowledge Base (RAG)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Answers only from uploaded PG Rules, Agreements & Policies without hallucinating</p>
        </div>
        <span className="badge badge-primary">
          <Sparkles size={12} /> RAG Enabled (Feature #35)
        </span>
      </div>

      {/* RAG Search Bar */}
      <form onSubmit={handleSearch} className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Search size={20} color="var(--primary)" />
        <input
          type="text"
          className="form-input"
          placeholder="Ask PG Policy e.g. 'What is gate timing?' or 'Refund policy on deposit'..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching RAG...' : 'Ask AI RAG'}
        </button>
      </form>

      {/* RAG Answer Display */}
      {ragResult && (
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '0.5rem', color: '#a5b4fc' }}>
            📖 Answer from Uploaded PG Documents:
          </h3>
          <p style={{ fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1rem' }}>{ragResult.answer}</p>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
            Sources: {ragResult.sources?.map((s, idx) => <span key={idx} className="badge badge-cyan">{s.document} ({s.relevanceScore}% match)</span>)}
          </div>
        </div>
      )}

      {/* Upload New Document (Owner Only) */}
      {isOwner && (
        <form onSubmit={handleUploadDoc} className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} color="var(--accent-cyan)" /> Upload New PG Agreement / Policy Document
          </h3>
          <div className="form-group">
            <label className="form-label">Document Name:</label>
            <input type="text" className="form-input" placeholder="e.g. Visitor Policy 2026" value={docName} onChange={e => setDocName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Category:</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="pg-rules">PG Rules</option>
              <option value="food-policy">Food Policy</option>
              <option value="refund-policy">Refund Policy</option>
              <option value="agreement">Agreement</option>
              <option value="visitor-rules">Visitor Rules</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Full Text Content:</label>
            <textarea className="form-textarea" rows={5} placeholder="Paste policy text here..." value={content} onChange={e => setContent(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary">Process Document into Embeddings</button>
        </form>
      )}

      {/* Documents List */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Uploaded Knowledge Base Documents</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {docs.map(doc => (
            <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--primary)" />
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{doc.documentName}</span>
              </div>
              <span className="badge badge-primary">{doc.category} ({doc.wordCount || 200} words)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
