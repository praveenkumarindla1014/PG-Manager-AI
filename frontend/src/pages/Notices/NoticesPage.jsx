import React, { useMemo, useState } from 'react';
import { Megaphone, Sparkles, Loader2, Send, Archive, Eye, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Card, Badge, EmptyState, Skeleton, ConfirmDialog, Field, Tabs } from '../../components/ui';
import { formatDate, timeAgo, titleCase } from '../../utils/format';

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'kn', label: 'ಕನ್ನಡ' }
];
const CATEGORIES = ['general', 'maintenance', 'payment', 'event', 'rule', 'emergency'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_COLOR = { low: 'var(--border-strong)', medium: 'var(--info)', high: 'var(--warning)', urgent: 'var(--danger)' };

export default function NoticesPage() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const { data: notices, setData, loading, reload } = useApi('/notices', { initial: [] });
  const [lang, setLang] = useState(() => localStorage.getItem('pg_notice_lang') || 'en');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [busy, setBusy] = useState(false);

  const chooseLang = (l) => {
    setLang(l);
    localStorage.setItem('pg_notice_lang', l);
  };

  const filtered = useMemo(() => (notices || []).filter(n => category === 'all' || n.category === category), [notices, category]);
  const unread = (notices || []).filter(n => !n.isRead).length;

  const open = async (n) => {
    setExpanded(e => (e === n._id ? null : n._id));
    if (!n.isRead) {
      setData(list => list.map(x => (x._id === n._id ? { ...x, isRead: true } : x)));
      api.post(`/notices/${n._id}/read`).catch(() => {});
    }
  };

  const archive = async () => {
    setBusy(true);
    try {
      await api.del(`/notices/${archiving._id}`);
      setData(list => list.filter(x => x._id !== archiving._id));
      toast('Notice archived');
      setArchiving(null);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Notices"
        subtitle={isOwner ? 'Announcements to residents — written and translated by AI' : `Announcements from the PG${unread ? ` · ${unread} unread` : ''}`}
      />

      {isOwner && <Composer toast={toast} onPublished={() => reload({ silent: true })} />}

      <div className="row between wrap">
        <div className="row wrap" style={{ gap: 6 }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c === 'all' ? 'All' : titleCase(c)}</button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {LANGS.map(l => <button key={l.value} className={`chip ${lang === l.value ? 'active' : ''}`} onClick={() => chooseLang(l.value)}>{l.label}</button>)}
        </div>
      </div>

      {loading ? (
        <div className="stack">{[1, 2, 3].map(i => <Skeleton key={i} height={110} style={{ borderRadius: 18 }} />)}</div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Megaphone} title="No notices here" message={isOwner ? 'Write your first notice above — AI will polish and translate it.' : 'New announcements from the owner will show up here.'} /></Card>
      ) : (
        <div className="stack">
          {filtered.map(n => {
            const text = (lang !== 'en' && n.translations?.[lang]) || n.content;
            const isOpen = expanded === n._id;
            const long = text.length > 220;
            return (
              <article key={n._id} className="card card-hover" style={{ borderLeft: `4px solid ${PRIORITY_COLOR[n.priority] || 'var(--border)'}`, cursor: 'pointer' }} onClick={() => open(n)}>
                <div className="card-pad stack-sm">
                  <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
                    <div className="row-sm grow" style={{ minWidth: 0 }}>
                      {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} title="Unread" />}
                      <h3 style={{ fontSize: '1.02rem', fontWeight: n.isRead ? 700 : 800 }}>{n.title}</h3>
                    </div>
                    <div className="row-sm wrap">
                      {n.priority !== 'medium' && n.priority !== 'low' && <Badge status={n.priority} />}
                      <Badge tone="neutral">{titleCase(n.category)}</Badge>
                      {n.aiGenerated && <Badge tone="violet"><Sparkles size={11} />AI written</Badge>}
                    </div>
                  </div>
                  <p className="muted small" style={{ whiteSpace: 'pre-wrap', ...(isOpen || !long ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
                    {text}
                  </p>
                  {lang !== 'en' && !n.translations?.[lang] && <span className="tiny faint">Translation not available — showing English.</span>}
                  <div className="row between wrap tiny faint">
                    <span title={formatDate(n.createdAt)}>{n.createdBy?.name ? `${n.createdBy.name} · ` : ''}{timeAgo(n.createdAt)}</span>
                    <div className="row-sm" onClick={e => e.stopPropagation()}>
                      {isOwner && <span className="row-sm"><Eye size={13} />Read by {n.readCount || 0}</span>}
                      {long && (
                        <button className="btn btn-ghost btn-xs" onClick={() => open(n)}>
                          {isOpen ? <><ChevronUp size={13} />Less</> : <><ChevronDown size={13} />More</>}
                        </button>
                      )}
                      {isOwner && <button className="btn btn-ghost btn-xs" onClick={() => setArchiving(n)}><Archive size={13} />Archive</button>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!archiving}
        title="Archive this notice?"
        message={`"${archiving?.title}" will be hidden from all residents.`}
        confirmLabel="Archive"
        busy={busy}
        onConfirm={archive}
        onClose={() => setArchiving(null)}
      />
    </div>
  );
}

function Composer({ toast, onPublished }) {
  const [raw, setRaw] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');
  const [draft, setDraft] = useState(null);
  const [previewLang, setPreviewLang] = useState('en');
  const [busy, setBusy] = useState(null);

  const polish = async () => {
    if (!raw.trim()) return;
    setBusy('draft');
    try {
      const res = await api.post('/notices/draft', { rawInput: raw });
      setDraft({ ...res.data, translations: { ...(res.data.translations || {}), en: res.data.content } });
      setPreviewLang('en');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const publish = async (asIs) => {
    setBusy(asIs ? 'raw' : 'publish');
    try {
      const body = asIs
        ? { rawInput: raw, priority, category }
        : { title: draft.title, content: draft.translations.en || draft.content, translations: draft.translations, aiGenerated: draft.aiGenerated !== false, priority, category };
      await api.post('/notices', body);
      toast('Notice published — residents have been notified 📢');
      setRaw('');
      setDraft(null);
      onPublished();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const langTabs = LANGS.filter(l => l.value === 'en' || draft?.translations?.[l.value]);

  return (
    <Card title="Write a notice with AI" icon={Wand2} subtitle="Type it roughly — AI turns it into a clear, polite notice in 5 languages">
      <div className="stack">
        <textarea className="textarea" rows={3} value={raw} onChange={e => setRaw(e.target.value)} placeholder="water cut tomorrow 10 to 2 for tank cleaning" />
        <div className="row wrap">
          <select className="select" style={{ width: 150 }} value={priority} onChange={e => setPriority(e.target.value)} aria-label="Priority">
            {PRIORITIES.map(p => <option key={p} value={p}>{titleCase(p)} priority</option>)}
          </select>
          <select className="select" style={{ width: 160 }} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
            {CATEGORIES.map(c => <option key={c} value={c}>{titleCase(c)}</option>)}
          </select>
          <div className="right row wrap">
            <button className="btn btn-ghost" onClick={() => publish(true)} disabled={!raw.trim() || !!busy}>
              {busy === 'raw' && <Loader2 size={16} className="spin" />}Publish as-is
            </button>
            <button className="btn btn-primary" onClick={polish} disabled={!raw.trim() || !!busy}>
              {busy === 'draft' ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}Polish with AI
            </button>
          </div>
        </div>

        {draft && (
          <div className="card-soft stack" style={{ padding: 16 }}>
            <div className="row between wrap">
              <span className="bold small row-sm"><Sparkles size={14} className="text-brand" />Preview — edit anything before publishing</span>
              <Tabs tabs={langTabs} value={previewLang} onChange={setPreviewLang} />
            </div>
            <Field label="Title">
              <input className="input" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
            </Field>
            <Field label={`Message (${LANGS.find(l => l.value === previewLang)?.label})`}>
              <textarea
                className="textarea"
                rows={7}
                value={draft.translations?.[previewLang] || ''}
                onChange={e => setDraft(d => ({ ...d, translations: { ...d.translations, [previewLang]: e.target.value } }))}
              />
            </Field>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDraft(null)} disabled={!!busy}>Discard</button>
              <button className="btn btn-primary" onClick={() => publish(false)} disabled={!!busy || !draft.title?.trim()}>
                {busy === 'publish' ? <Loader2 size={16} className="spin" /> : <Send size={16} />}Publish to all residents
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
