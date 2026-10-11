import React, { useState } from 'react';
import { BookOpen, Search, Sparkles, Loader2, Plus, Trash2, FileText, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Card, Badge, EmptyState, Skeleton, Modal, ConfirmDialog, Field } from '../../components/ui';
import Markdown from '../../components/AIChat/Markdown';
import { formatDate, titleCase } from '../../utils/format';

const CATEGORIES = ['pg-rules', 'food-policy', 'refund-policy', 'agreement', 'visitor-rules', 'safety', 'amenities', 'other'];
const SUGGESTIONS = [
  'What time does the gate close?',
  'Can visitors stay overnight?',
  'What is the late fee for rent?',
  'How is the deposit refunded?',
  'What is the notice period?',
  'When can I use the laundry?',
  'Is there parking for bikes?',
  'Is smoking allowed?'
];

export default function KnowledgeBasePage() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const { data: docs, setData, loading, reload } = useApi('/knowledge-base', { initial: [] });
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const ask = async (q) => {
    const question = (q ?? query).trim();
    if (!question) return;
    setQuery(question);
    setAsking(true);
    setResult(null);
    try {
      const res = await api.post('/knowledge-base/search', { query: question });
      setResult({ question, ...res.data });
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setAsking(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/knowledge-base/${deleting._id}`);
      setData(list => list.filter(d => d._id !== deleting._id));
      toast('Document removed');
      setDeleting(null);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Rules & policies"
        subtitle="Ask questions in plain words — answers come only from the PG's own documents"
        actions={isOwner && <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} />Add document</button>}
      />

      <div className="hero-card stack">
        <div className="row-sm" style={{ position: 'relative', zIndex: 1 }}>
          <Sparkles size={18} />
          <span className="bold">Ask anything about PG rules</span>
        </div>
        <form className="card searchbar" style={{ position: 'relative', zIndex: 1, border: 'none' }} onSubmit={e => { e.preventDefault(); ask(); }}>
          <Search size={18} className="faint" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Can my friend stay overnight?" aria-label="Question" />
          <button className="btn btn-primary" disabled={asking || !query.trim()}>{asking ? <Loader2 size={16} className="spin" /> : 'Ask'}</button>
        </form>
        <div className="row wrap" style={{ gap: 6, position: 'relative', zIndex: 1 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="chip" style={{ height: 28, fontSize: '0.75rem', background: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => ask(s)} disabled={asking}>{s}</button>
          ))}
        </div>
      </div>

      {(asking || result) && (
        <Card title={result ? result.question : 'Looking it up…'} icon={BookOpen}>
          {asking ? (
            <div className="stack-sm"><Skeleton height={14} /><Skeleton height={14} width="85%" /><Skeleton height={14} width="60%" /></div>
          ) : (
            <div className="stack">
              <div style={{ fontSize: '0.95rem' }}><Markdown text={result.answer} /></div>
              {result.sources?.length > 0 && (
                <div className="stack-sm">
                  <span className="label">Sources</span>
                  {result.sources.map((s, i) => (
                    <div key={i} className="card-soft row" style={{ padding: '10px 12px', alignItems: 'flex-start' }}>
                      <FileText size={16} className="faint" style={{ marginTop: 2 }} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="small bold">{s.document} <span className="faint">· {titleCase(s.category)}</span></div>
                        {s.excerpt && <div className="tiny muted">“{s.excerpt}{s.excerpt.length >= 160 ? '…' : ''}”</div>}
                      </div>
                      {s.relevanceScore !== undefined && <Badge tone="neutral">{s.relevanceScore}% match</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <Card title="Documents" icon={FileText} subtitle={`${docs?.length || 0} document${docs?.length === 1 ? '' : 's'} the assistant can answer from`}>
        {loading ? (
          <div className="stack">{[1, 2].map(i => <Skeleton key={i} height={60} />)}</div>
        ) : !docs?.length ? (
          <EmptyState icon={BookOpen} title="No documents yet" message={isOwner ? 'Add your PG rules so residents (and the AI) can find answers instantly.' : 'The owner hasn\'t uploaded the rules yet.'} />
        ) : (
          <div className="list">
            {docs.map(d => (
              <div key={d._id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="row">
                  <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand)' }}><FileText size={17} /></span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="bold ellipsis">{d.documentName}</div>
                    <div className="tiny faint">{titleCase(d.category)} · {d.wordCount || 0} words · asked {d.queryCount || 0} times · {formatDate(d.createdAt)}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => (o === d._id ? null : d._id))}>
                    {open === d._id ? <><ChevronUp size={15} />Hide</> : <><ChevronDown size={15} />Read</>}
                  </button>
                  {isOwner && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleting(d)} aria-label="Delete"><Trash2 size={15} /></button>}
                </div>
                {open === d._id && (
                  <div className="card-soft small mt-2" style={{ padding: 16, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 420, overflowY: 'auto' }}>
                    {d.originalContent}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {adding && <AddDocModal toast={toast} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload({ silent: true }); }} />}

      <ConfirmDialog
        open={!!deleting}
        title="Remove this document?"
        message={`"${deleting?.documentName}" will no longer be used to answer questions.`}
        confirmLabel="Remove"
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function AddDocModal({ toast, onClose, onSaved }) {
  const [form, setForm] = useState({ documentName: '', category: 'pg-rules', content: '' });
  const [saving, setSaving] = useState(false);

  const readFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, content: String(reader.result || ''), documentName: f.documentName || file.name.replace(/\.[^.]+$/, '') }));
    reader.readAsText(file);
  };

  const save = async () => {
    if (!form.documentName.trim() || !form.content.trim()) return toast('Add a name and some content', 'error');
    setSaving(true);
    try {
      await api.post('/knowledge-base', form);
      toast('Document added — the assistant can use it now');
      onSaved();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Add a document"
      subtitle="Rules, policies or agreements. Residents and the AI assistant will answer from this text."
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <Loader2 size={16} className="spin" />}Add document</button>
      </>}
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Document name">
            <input className="input" value={form.documentName} onChange={e => setForm({ ...form, documentName: e.target.value })} placeholder="Refund policy" />
          </Field>
          <Field label="Category">
            <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{titleCase(c)}</option>)}
            </select>
          </Field>
        </div>
        <label className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
          <Upload size={14} />Upload .txt / .md file
          <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={readFile} hidden />
        </label>
        <Field label="Content">
          <textarea className="textarea" rows={12} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="1. Rent is due on the 5th of every month…" />
        </Field>
      </div>
    </Modal>
  );
}
