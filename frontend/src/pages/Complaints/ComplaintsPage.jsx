import React, { useMemo, useState } from 'react';
import {
  MessageSquareWarning, Plus, Search, Sparkles, ShieldAlert, Wrench, CheckCircle2, Clock, Copy as CopyIcon,
  ChevronDown, ChevronUp, Star, RotateCcw, Loader2, User, Send, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast, useLiveRefresh } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Badge, Modal, Tabs, Field, EmptyState, Skeleton, Avatar } from '../../components/ui';
import { timeAgo, titleCase, formatDate } from '../../utils/format';

const CATEGORIES = ['electrical', 'plumbing', 'furniture', 'cleaning', 'pest-control', 'wifi-internet', 'ac-cooling', 'water-supply', 'security', 'noise', 'food', 'other'];
const QUICK_PICKS = ['Fan not working', 'No hot water', 'WiFi is slow', 'Water leakage', 'Room needs cleaning', 'Pest problem', 'AC not cooling', 'Light / switch not working'];

export default function ComplaintsPage() {
  const { isOwner } = useAuth();
  const { data, loading, reload, setData } = useApi('/complaints', { initial: [] });
  const [reportOpen, setReportOpen] = useState(false);
  useLiveRefresh('complaint-updated', () => reload({ silent: true }));

  return (
    <div className="page">
      <PageHeader
        title={isOwner ? 'Complaints' : 'Report an Issue'}
        subtitle={isOwner
          ? 'Every issue is auto-categorised and prioritised by AI. Emergencies are pinned to the top.'
          : "Tell us what's wrong — we'll route it to the right person and keep you posted."}
        actions={<button className="btn btn-primary" onClick={() => setReportOpen(true)}><Plus size={16} />{isOwner ? 'Log a complaint' : 'Report an issue'}</button>}
      />
      {isOwner
        ? <OwnerComplaints complaints={data} loading={loading} onUpdated={(c) => setData(list => list.map(x => (x._id === c._id ? c : x)))} />
        : <TenantComplaints complaints={data} loading={loading} onUpdated={(c) => setData(list => list.map(x => (x._id === c._id ? { ...x, ...c } : x)))} onReport={() => setReportOpen(true)} />}
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onCreated={(c) => setData(list => [c, ...list])} />
    </div>
  );
}

/* ---------------- Report modal (both roles) ---------------- */
function ReportModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const close = () => { setText(''); setResult(null); onClose(); };

  const submit = async () => {
    if (text.trim().length < 3) return toast('Please describe the problem', 'error');
    setSaving(true);
    try {
      const res = await api.post('/complaints', { description: text });
      setResult({ complaint: res.data, steps: res.emergencySteps });
      onCreated(res.data);
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const c = result?.complaint;
  return (
    <Modal open={open} onClose={close} title={c ? (c.isEmergency ? 'Emergency alert raised' : 'Complaint registered ✅') : 'What needs fixing?'}
      subtitle={c ? 'Our AI has analysed and routed your complaint.' : 'Describe it in your own words — any language is fine.'}
      footer={c
        ? <button className="btn btn-primary" onClick={close}>Done</button>
        : <>
          <button className="btn btn-secondary" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !text.trim()}>
            {saving ? <><Loader2 size={16} className="spin" />Analysing…</> : <><Send size={16} />Submit</>}
          </button>
        </>}>
      {!c ? (
        <div className="stack">
          <textarea className="textarea" autoFocus style={{ minHeight: 120 }} value={text} onChange={e => setText(e.target.value)}
            placeholder="e.g. The ceiling fan in my room stopped working since this morning and it's very hot." />
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Quick picks</div>
            <div className="row wrap" style={{ gap: 6 }}>
              {QUICK_PICKS.map(q => <button key={q} type="button" className="chip" onClick={() => setText(t => (t ? `${t}. ${q}` : q))}>{q}</button>)}
            </div>
          </div>
          <div className="callout callout-danger small">
            <ShieldAlert size={16} className="text-danger" style={{ flexShrink: 0 }} />
            <span>Fire, gas leak, medical or security emergency? Submit it here — the owner is alerted instantly — and call <b>112</b> if anyone is in danger.</span>
          </div>
        </div>
      ) : (
        <div className="stack">
          {c.isEmergency && (
            <div className="callout callout-danger">
              <ShieldAlert size={20} className="text-danger" style={{ flexShrink: 0 }} />
              <div className="stack-sm">
                <b>{result.steps?.immediateAction || 'Move to a safe place right away.'}</b>
                <div className="row wrap">
                  {(result.steps?.contacts || ['Emergency: 112']).map(ct => {
                    const num = ct.match(/\d{3,}/)?.[0];
                    return <a key={ct} className="btn btn-danger btn-sm" href={num ? `tel:${num}` : undefined}>{ct}</a>;
                  })}
                </div>
              </div>
            </div>
          )}
          <div className="grid-2" style={{ gap: 10 }}>
            <Info label="Category" value={titleCase(c.aiCategory)} />
            <Info label="Priority" value={<Badge status={c.aiPriority} />} />
            <Info label="Expected fix" value={c.aiEstimatedTime} />
            <Info label="Assigned to" value={c.aiSuggestedStaff} />
          </div>
          {c.aiGeneratedReply && (
            <div className="callout callout-brand">
              <Sparkles size={18} className="text-brand" style={{ flexShrink: 0 }} />
              <span>{c.aiGeneratedReply}</span>
            </div>
          )}
          {c.isDuplicate && (
            <div className="callout callout-info small">
              <Layers size={16} style={{ flexShrink: 0 }} />
              <span>Someone already reported this issue — we've linked your complaint so it's fixed together.</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <div className="card-soft" style={{ padding: '10px 12px' }}>
      <div className="tiny faint bold">{label}</div>
      <div className="bold mt-1">{value || '—'}</div>
    </div>
  );
}

/* ---------------- Owner ---------------- */
function OwnerComplaints({ complaints, loading, onUpdated }) {
  const [status, setStatus] = useState('active');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => ({
    open: complaints.filter(c => c.status === 'open').length,
    progress: complaints.filter(c => c.status === 'in-progress').length,
    resolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
    emergency: complaints.filter(c => c.isEmergency && !['resolved', 'closed'].includes(c.status)).length
  }), [complaints]);

  const filtered = complaints
    .filter(c => status === 'all'
      || (status === 'active' && ['open', 'in-progress'].includes(c.status))
      || (status === 'resolved' && ['resolved', 'closed'].includes(c.status))
      || c.status === status)
    .filter(c => !category || c.aiCategory === category)
    .filter(c => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [c.description, c.tenant?.name, c.room?.roomNumber, c.assignedTo].some(v => String(v || '').toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const ae = a.isEmergency && !['resolved', 'closed'].includes(a.status);
      const be = b.isEmergency && !['resolved', 'closed'].includes(b.status);
      if (ae !== be) return ae ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <>
      <div className="row wrap" style={{ gap: 8 }}>
        <span className="badge tone-danger" style={{ height: 30, padding: '0 12px' }}><ShieldAlert size={14} />{counts.emergency} emergency</span>
        <span className="badge tone-warning" style={{ height: 30, padding: '0 12px' }}><Clock size={14} />{counts.open} open</span>
        <span className="badge tone-info" style={{ height: 30, padding: '0 12px' }}><Wrench size={14} />{counts.progress} in progress</span>
        <span className="badge tone-success" style={{ height: 30, padding: '0 12px' }}><CheckCircle2 size={14} />{counts.resolved} resolved</span>
      </div>

      <div className="row between wrap">
        <Tabs value={status} onChange={setStatus} tabs={[
          { value: 'active', label: 'Active', count: counts.open + counts.progress },
          { value: 'open', label: 'Open' },
          { value: 'in-progress', label: 'In progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'all', label: 'All' }
        ]} />
        <div className="row wrap">
          <select className="select" style={{ width: 170 }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{titleCase(c)}</option>)}
          </select>
          <div className="input-group" style={{ width: 230 }}>
            <Search size={16} />
            <input className="input" placeholder="Search issue, tenant, room…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="stack">{[0, 1, 2].map(i => <Skeleton key={i} height={130} style={{ borderRadius: 18 }} />)}</div>
      ) : !filtered.length ? (
        <div className="card"><EmptyState icon={MessageSquareWarning} title={complaints.length ? 'Nothing matches' : 'No complaints yet'} message={complaints.length ? 'Try a different filter.' : 'Happy residents! New complaints will appear here instantly.'} /></div>
      ) : (
        <div className="stack">
          {filtered.map(c => <OwnerComplaintCard key={c._id} complaint={c} onUpdated={onUpdated} />)}
        </div>
      )}
    </>
  );
}

function OwnerComplaintCard({ complaint: c, onUpdated }) {
  const toast = useToast();
  const [showReply, setShowReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ status: c.status, assignedTo: c.assignedTo || c.aiSuggestedStaff || '', ownerResponse: c.ownerResponse || '' });
  const [saving, setSaving] = useState(false);
  const active = !['resolved', 'closed'].includes(c.status);
  const emergency = c.isEmergency && active;

  const save = async (patch) => {
    setSaving(true);
    try {
      const res = await api.put(`/complaints/${c._id}`, patch);
      onUpdated(res.data);
      setForm({ status: res.data.status, assignedTo: res.data.assignedTo || '', ownerResponse: res.data.ownerResponse || '' });
      setEditing(false);
      toast(`Complaint ${titleCase(res.data.status).toLowerCase()} — tenant notified`);
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="card" style={emergency ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)', boxShadow: '0 0 0 3px var(--danger-border)' } : undefined}>
      <div className="card-body" style={{ paddingTop: 18 }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <div style={{ fontSize: 28, lineHeight: 1 }} title={c.aiSentiment}>{c.sentimentEmoji || '😐'}</div>
          <div className="grow stack-sm">
            <div className="row wrap" style={{ gap: 6 }}>
              {emergency && <Badge tone="danger"><ShieldAlert size={12} />Emergency · {titleCase(c.emergencyType || 'other')}</Badge>}
              <Badge status={c.status} dot />
              <Badge status={c.aiPriority}>{c.aiPriority} priority</Badge>
              <Badge tone="neutral">{titleCase(c.aiCategory)}</Badge>
              {c.isDuplicate && <Badge tone="violet"><Layers size={12} />Duplicate</Badge>}
              {c.duplicateCount > 0 && <Badge tone="violet">+{c.duplicateCount} similar</Badge>}
              {c.rating && <span className="row-sm tiny bold text-warning">{'★'.repeat(c.rating)}<span className="faint">{'★'.repeat(5 - c.rating)}</span></span>}
            </div>
            <div className="bold" style={{ fontSize: '0.98rem' }}>{c.description}</div>
            <div className="row wrap small muted" style={{ gap: 14 }}>
              <span className="row-sm"><User size={13} />{c.tenant?.name || 'Tenant'}{c.room?.roomNumber && ` · Room ${c.room.roomNumber}`}</span>
              <span className="row-sm"><Clock size={13} />{timeAgo(c.createdAt)}</span>
              <span className="row-sm"><Wrench size={13} />{c.assignedTo || c.aiSuggestedStaff} · ETA {c.aiEstimatedTime}</span>
            </div>
            {c.ownerResponse && <div className="small"><b>Your reply:</b> {c.ownerResponse}</div>}
            {c.feedback && <div className="small muted">Tenant feedback: “{c.feedback}”</div>}

            {c.aiGeneratedReply && (
              <div>
                <button className="btn btn-ghost btn-xs" style={{ paddingLeft: 0 }} onClick={() => setShowReply(s => !s)}>
                  <Sparkles size={13} className="text-brand" />AI suggested reply {showReply ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {showReply && (
                  <div className="callout callout-brand small mt-1">
                    <span className="grow">{c.aiGeneratedReply}</span>
                    <button className="btn btn-soft btn-xs" onClick={() => { setForm(f => ({ ...f, ownerResponse: c.aiGeneratedReply })); setEditing(true); }}><CopyIcon size={12} />Use</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className="card-soft stack mt-3" style={{ padding: 14 }}>
            <div className="form-grid">
              <Field label="Status">
                <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['open', 'in-progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
                </select>
              </Field>
              <Field label="Assign to">
                <input className="input" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="e.g. Ravi (Plumber)" />
              </Field>
              <Field label="Reply to tenant" className="span-2">
                <textarea className="textarea" style={{ minHeight: 70 }} value={form.ownerResponse} onChange={e => setForm(f => ({ ...f, ownerResponse: e.target.value }))} placeholder="The tenant sees this and gets a notification." />
              </Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => save(form)} disabled={saving}>{saving && <Loader2 size={14} className="spin" />}Save & notify</button>
            </div>
          </div>
        ) : (
          <div className="row wrap mt-3" style={{ justifyContent: 'flex-end' }}>
            {c.status === 'open' && <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => save({ status: 'in-progress', assignedTo: form.assignedTo })}><Wrench size={14} />Start work</button>}
            {active && <button className="btn btn-success btn-sm" disabled={saving} onClick={() => save({ status: 'resolved' })}><CheckCircle2 size={14} />Mark resolved</button>}
            {!active && <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => save({ status: 'open' })}><RotateCcw size={14} />Reopen</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Update / reply</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tenant ---------------- */
const STEPS = ['open', 'in-progress', 'resolved'];

function TenantComplaints({ complaints, loading, onUpdated, onReport }) {
  if (loading) return <div className="stack">{[0, 1].map(i => <Skeleton key={i} height={150} style={{ borderRadius: 18 }} />)}</div>;
  if (!complaints.length) {
    return (
      <div className="card">
        <EmptyState icon={MessageSquareWarning} title="No issues reported" message="Everything working fine? Great! If something breaks, report it here or just tell PG Buddy."
          action={<button className="btn btn-primary" onClick={onReport}><Plus size={16} />Report an issue</button>} />
      </div>
    );
  }
  return <div className="stack">{complaints.map(c => <TenantComplaintCard key={c._id} complaint={c} onUpdated={onUpdated} />)}</div>;
}

function TenantComplaintCard({ complaint: c, onUpdated }) {
  const toast = useToast();
  const [rating, setRating] = useState(c.rating || 0);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const stepIndex = c.status === 'closed' ? 2 : STEPS.indexOf(c.status);
  const done = ['resolved', 'closed'].includes(c.status);

  const send = async (reopen = false) => {
    if (!rating && !reopen) return toast('Tap a star to rate', 'error');
    setSaving(true);
    try {
      const res = await api.post(`/complaints/${c._id}/feedback`, { rating: rating || 1, feedback, reopen });
      onUpdated(res.data);
      toast(reopen ? 'Complaint reopened — the owner has been told' : 'Thanks for your feedback!');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="card card-pad stack">
      <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
        <div className="grow stack-sm">
          <div className="row wrap" style={{ gap: 6 }}>
            {c.isEmergency && <Badge tone="danger"><ShieldAlert size={12} />Emergency</Badge>}
            <Badge tone="neutral">{titleCase(c.aiCategory)}</Badge>
            <Badge status={c.aiPriority}>{c.aiPriority} priority</Badge>
          </div>
          <div className="bold" style={{ fontSize: '1rem' }}>{c.description}</div>
          <div className="small muted">Reported {formatDate(c.createdAt)} · {timeAgo(c.createdAt)}{!done && ` · Expected fix: ${c.aiEstimatedTime}`}</div>
        </div>
        <Badge status={c.status} dot />
      </div>

      <div className="row" style={{ gap: 6 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="row-sm small bold" style={{ color: i <= stepIndex ? 'var(--brand)' : 'var(--ink-3)' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: i <= stepIndex ? 'var(--brand)' : 'var(--surface-3)', color: i <= stepIndex ? '#fff' : 'var(--ink-3)', fontSize: 11 }}>
                {i < stepIndex || (done && i === 2) ? '✓' : i + 1}
              </span>
              <span className="desktop-only">{titleCase(s === 'open' ? 'reported' : s)}</span>
            </div>
            {i < STEPS.length - 1 && <div className="grow" style={{ height: 2, borderRadius: 2, background: i < stepIndex ? 'var(--brand)' : 'var(--border)' }} />}
          </React.Fragment>
        ))}
      </div>

      {(c.ownerResponse || c.aiGeneratedReply) && (
        <div className="callout callout-brand small">
          <Avatar name="PG Office" size="sm" />
          <div>
            <div className="bold">{c.ownerResponse ? 'Owner' : 'PG Buddy'}{c.assignedTo && <span className="faint"> · assigned to {c.assignedTo}</span>}</div>
            <div className="mt-1">{c.ownerResponse || c.aiGeneratedReply}</div>
          </div>
        </div>
      )}

      {done && (
        <div className="card-soft stack-sm" style={{ padding: 14 }}>
          {c.rating ? (
            <div className="small">You rated this fix <span className="text-warning bold">{'★'.repeat(c.rating)}</span>{c.feedback && <> — “{c.feedback}”</>}</div>
          ) : (
            <>
              <div className="small bold">How was the fix?</div>
              <div className="row-sm">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className="btn btn-ghost btn-icon btn-sm" onClick={() => setRating(n)} aria-label={`${n} star`}>
                    <Star size={20} fill={n <= rating ? 'var(--warning)' : 'none'} color={n <= rating ? 'var(--warning)' : 'var(--ink-3)'} />
                  </button>
                ))}
              </div>
              <input className="input" placeholder="Anything to add? (optional)" value={feedback} onChange={e => setFeedback(e.target.value)} />
              <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => send(true)} disabled={saving}><RotateCcw size={14} />Still broken? Reopen</button>
                <button className="btn btn-primary btn-sm" onClick={() => send(false)} disabled={saving}>Send rating</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
