import React, { useMemo, useState } from 'react';
import {
  Wrench, Plus, CalendarClock, AlertTriangle, IndianRupee, Sparkles, Play, CheckCircle2, XCircle, Trash2,
  Phone, Loader2, User, Bot, CalendarCheck
} from 'lucide-react';
import { useApi, useToast } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, StatCard, Badge, Modal, Tabs, Field, EmptyState, Skeleton, SkeletonCards, ConfirmDialog, Card } from '../../components/ui';
import { inr, formatDate, titleCase } from '../../utils/format';

const TYPES = ['ac-service', 'plumbing', 'electrical', 'pest-control', 'cleaning', 'painting', 'water-tank', 'generator', 'elevator', 'general'];
const TYPE_EMOJI = {
  'ac-service': '❄️', plumbing: '🚰', electrical: '⚡', 'pest-control': '🪳', cleaning: '🧹', painting: '🎨',
  'water-tank': '💧', generator: '🔋', elevator: '🛗', general: '🛠️'
};
const PRED_TYPE = { 'ac-cooling': 'ac-service', 'wifi-internet': 'general', 'water-supply': 'plumbing', furniture: 'general' };

const dayStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const EMPTY_FORM = { type: 'general', description: '', scheduledDate: '', roomNumber: '', assignedTo: '', assignedContact: '', estimatedCost: '', priority: 'medium', notifyTenants: false };

export default function MaintenancePage() {
  const toast = useToast();
  const { data: tasks, loading, reload, setData } = useApi('/maintenance', { initial: [] });
  const [tab, setTab] = useState('upcoming');
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const today = dayStart();
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const upcoming = tasks.filter(t => ['scheduled', 'in-progress', 'overdue'].includes(t.status)).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  const completed = tasks.filter(t => ['completed', 'cancelled'].includes(t.status)).sort((a, b) => new Date(b.completedDate || b.scheduledDate) - new Date(a.completedDate || a.scheduledDate));

  const stats = useMemo(() => {
    const now = new Date();
    return {
      week: upcoming.filter(t => new Date(t.scheduledDate) < weekEnd && new Date(t.scheduledDate) >= today).length,
      overdue: upcoming.filter(t => t.status === 'overdue' || dayStart(t.scheduledDate) < today).length,
      spent: tasks.filter(t => t.status === 'completed' && t.completedDate && new Date(t.completedDate).getMonth() === now.getMonth() && new Date(t.completedDate).getFullYear() === now.getFullYear())
        .reduce((s, t) => s + (Number(t.actualCost ?? t.estimatedCost) || 0), 0)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const groups = useMemo(() => {
    const g = { Overdue: [], Today: [], 'This week': [], Later: [] };
    for (const t of upcoming) {
      const d = dayStart(t.scheduledDate);
      if (t.status === 'overdue' || d < today) g.Overdue.push(t);
      else if (d.getTime() === today.getTime()) g.Today.push(t);
      else if (d < weekEnd) g['This week'].push(t);
      else g.Later.push(t);
    }
    return Object.entries(g).filter(([, list]) => list.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const update = async (task, patch, msg) => {
    setBusyId(task._id);
    try {
      const res = await api.put(`/maintenance/${task._id}`, patch);
      setData(list => list.map(t => (t._id === task._id ? res.data : t)));
      toast(msg);
    } catch (e) { toast(e.message, 'error'); } finally { setBusyId(null); }
  };

  const remove = async () => {
    setBusyId(deleteTarget._id);
    try {
      await api.del(`/maintenance/${deleteTarget._id}`);
      setData(list => list.filter(t => t._id !== deleteTarget._id));
      toast('Task deleted');
      setDeleteTarget(null);
    } catch (e) { toast(e.message, 'error'); } finally { setBusyId(null); }
  };

  const openForm = (data = null) => { setPrefill(data); setFormOpen(true); };

  return (
    <div className="page">
      <PageHeader
        title="Maintenance"
        subtitle="Plan repairs and servicing before things break — AI flags rooms that keep having problems."
        actions={<button className="btn btn-primary" onClick={() => openForm()}><Plus size={16} />Schedule task</button>}
      />

      <div className="grid-3">
        {loading ? <SkeletonCards count={3} /> : <>
          <StatCard label="Due this week" value={stats.week} icon={CalendarClock} tone="info" foot="Scheduled in the next 7 days" />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone={stats.overdue ? 'danger' : 'success'} foot={stats.overdue ? 'Past their scheduled date' : 'All on track 👍'} />
          <StatCard label="Spent this month" value={inr(stats.spent)} icon={IndianRupee} tone="warning" foot="Completed tasks (logged as expenses)" />
        </>}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'upcoming', label: 'Upcoming', icon: CalendarClock, count: upcoming.length },
        { value: 'completed', label: 'Completed', icon: CalendarCheck, count: completed.length },
        { value: 'ai', label: 'AI predictions', icon: Sparkles }
      ]} />

      {tab === 'ai' ? <Predictions onSchedule={openForm} /> : loading ? (
        <div className="stack">{[0, 1, 2].map(i => <Skeleton key={i} height={92} style={{ borderRadius: 18 }} />)}</div>
      ) : tab === 'upcoming' ? (
        !upcoming.length
          ? <div className="card"><EmptyState icon={Wrench} title="Nothing scheduled" message="Schedule AC servicing, pest control or tank cleaning to stay ahead of complaints." action={<button className="btn btn-primary" onClick={() => openForm()}><Plus size={16} />Schedule task</button>} /></div>
          : <div className="stack-lg">
            {groups.map(([label, list]) => (
              <div key={label} className="stack">
                <div className="row-sm bold" style={{ color: label === 'Overdue' ? 'var(--danger)' : 'var(--ink-2)' }}>
                  {label === 'Overdue' && <AlertTriangle size={16} />}{label}<span className="faint small">· {list.length}</span>
                </div>
                {list.map(t => (
                  <TaskRow key={t._id} task={t} busy={busyId === t._id} overdue={label === 'Overdue'}
                    onStart={() => update(t, { status: 'in-progress' }, 'Marked in progress')}
                    onComplete={() => setCompleteTarget(t)}
                    onCancel={() => update(t, { status: 'cancelled' }, 'Task cancelled')}
                    onDelete={() => setDeleteTarget(t)} />
                ))}
              </div>
            ))}
          </div>
      ) : (
        !completed.length
          ? <div className="card"><EmptyState icon={CalendarCheck} title="No completed tasks yet" /></div>
          : <div className="stack">{completed.map(t => <TaskRow key={t._id} task={t} done onDelete={() => setDeleteTarget(t)} />)}</div>
      )}

      <ScheduleModal open={formOpen} prefill={prefill} onClose={() => setFormOpen(false)} onCreated={(t) => { setData(list => [...list, t]); setTab('upcoming'); }} />
      <CompleteModal task={completeTarget} onClose={() => setCompleteTarget(null)}
        onConfirm={async (actualCost) => { await update(completeTarget, { status: 'completed', actualCost }, 'Task completed & cost logged as an expense'); setCompleteTarget(null); reload({ silent: true }); }} />
      <ConfirmDialog open={!!deleteTarget} title="Delete this task?" message={deleteTarget ? `“${deleteTarget.description}” will be removed permanently.` : ''}
        confirmLabel="Delete" busy={busyId === deleteTarget?._id} onConfirm={remove} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}

function TaskRow({ task: t, busy, overdue, done, onStart, onComplete, onCancel, onDelete }) {
  const d = new Date(t.scheduledDate);
  const room = t.room?.roomNumber || t.roomNumber;
  return (
    <div className="card row" style={{ padding: 14, gap: 14, alignItems: 'center', borderColor: overdue ? 'var(--danger-border)' : undefined, opacity: t.status === 'cancelled' ? 0.65 : 1 }}>
      <div style={{ width: 58, flexShrink: 0, textAlign: 'center', borderRadius: 14, padding: '6px 0', background: overdue ? 'var(--danger-bg)' : 'var(--brand-50)', color: overdue ? 'var(--danger)' : 'var(--brand-ink)' }}>
        <div className="tiny bold" style={{ textTransform: 'uppercase' }}>{d.toLocaleDateString('en-IN', { month: 'short' })}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.1 }}>{d.getDate()}</div>
        <div className="tiny">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
      </div>
      <div className="grow stack-sm" style={{ minWidth: 0 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="bold">{TYPE_EMOJI[t.type] || '🛠️'} {titleCase(t.type)}</span>
          <Badge status={t.status} dot />
          {t.priority && t.priority !== 'medium' && <Badge status={t.priority}>{t.priority}</Badge>}
          {t.createdViaAI && <Badge tone="brand"><Bot size={11} />via AI</Badge>}
        </div>
        <div className="small">{t.description}</div>
        <div className="row wrap tiny muted" style={{ gap: 12 }}>
          {room && <span>Room {room}</span>}
          {t.assignedTo && <span className="row-sm"><User size={12} />{t.assignedTo}</span>}
          {t.assignedContact && <a className="row-sm" href={`tel:${t.assignedContact}`}><Phone size={12} />{t.assignedContact}</a>}
          {(t.actualCost || t.estimatedCost) ? <span className="row-sm"><IndianRupee size={12} />{done && t.actualCost ? `${inr(t.actualCost)} spent` : `${inr(t.estimatedCost)} est.`}</span> : null}
          {done && t.completedDate && <span>Completed {formatDate(t.completedDate)}</span>}
        </div>
      </div>
      <div className="row-sm wrap" style={{ justifyContent: 'flex-end' }}>
        {busy && <Loader2 size={16} className="spin faint" />}
        {!done && t.status !== 'in-progress' && <button className="btn btn-secondary btn-sm" onClick={onStart} disabled={busy}><Play size={14} />Start</button>}
        {!done && <button className="btn btn-success btn-sm" onClick={onComplete} disabled={busy}><CheckCircle2 size={14} />Complete</button>}
        {!done && <button className="btn btn-ghost btn-icon btn-sm" onClick={onCancel} disabled={busy} title="Cancel"><XCircle size={16} /></button>}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} disabled={busy} title="Delete"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function Predictions({ onSchedule }) {
  const { data, loading } = useApi('/maintenance/predictions');
  if (loading) return <div className="grid-auto"><SkeletonCards count={4} height={140} /></div>;
  const preds = data?.predictions || [];
  return (
    <div className="stack-lg">
      <div className="callout callout-brand">
        <Sparkles size={18} className="text-brand" style={{ flexShrink: 0 }} />
        <span>PG Buddy looks at a year of complaints per room. Repeated issues usually mean the equipment needs servicing or replacing before it fails again.</span>
      </div>
      {!preds.length ? (
        <div className="card"><EmptyState icon={Sparkles} title="No risks spotted" message="No room has recurring problems right now." /></div>
      ) : (
        <div className="grid-auto">
          {preds.map((p, i) => {
            const prob = Math.min(100, Number(p.probability) || 0);
            const tone = prob >= 70 ? 'var(--danger)' : prob >= 45 ? 'var(--warning)' : 'var(--success)';
            return (
              <div key={i} className="card card-pad stack-sm">
                <div className="row between">
                  <span className="bold">{TYPE_EMOJI[PRED_TYPE[p.type] || p.type] || '🛠️'} {titleCase(p.type || 'general')}</span>
                  <Badge tone="neutral">Room {p.roomNumber || '—'}</Badge>
                </div>
                <div className="row between small"><span className="muted">Failure likelihood</span><span className="bold mono">{prob}%</span></div>
                <div className="progress"><span style={{ width: `${prob}%`, background: tone }} /></div>
                <p className="small muted">{p.reason}</p>
                <div className="row between wrap mt-1">
                  <span className="tiny faint">{p.estimatedCost ? `~${inr(p.estimatedCost)}` : ''}{p.estimatedDate ? ` · by ${formatDate(p.estimatedDate)}` : ''}</span>
                  <button className="btn btn-soft btn-sm" onClick={() => onSchedule({
                    type: TYPES.includes(p.type) ? p.type : (PRED_TYPE[p.type] || 'general'),
                    description: `Preventive: ${p.reason || titleCase(p.type || '')}`,
                    roomNumber: p.roomNumber && p.roomNumber !== 'unknown' ? String(p.roomNumber) : '',
                    estimatedCost: p.estimatedCost || '',
                    priority: prob >= 70 ? 'high' : 'medium'
                  })}><CalendarClock size={14} />Schedule this</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data?.generalRecommendations?.length > 0 && (
        <Card title="General recommendations" icon={Wrench}>
          <ul className="stack-sm" style={{ paddingLeft: 18 }}>
            {data.generalRecommendations.map((r, i) => <li key={i} className="small">{r}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ScheduleModal({ open, prefill, onClose, onCreated }) {
  const toast = useToast();
  const { data: rooms } = useApi(open ? '/rooms' : null, { initial: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [seed, setSeed] = useState(null);

  // Reset / prefill each time the modal opens.
  const key = open ? (prefill ? JSON.stringify(prefill) : 'blank') : null;
  if (key !== seed) {
    setSeed(key);
    if (open) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      setForm({ ...EMPTY_FORM, scheduledDate: tomorrow, ...(prefill || {}) });
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.description.trim()) return toast('Add a short description', 'error');
    if (!form.scheduledDate) return toast('Pick a date', 'error');
    setSaving(true);
    try {
      const res = await api.post('/maintenance', {
        ...form,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
        roomNumber: form.roomNumber || undefined
      });
      toast(form.notifyTenants ? 'Task scheduled & residents notified' : 'Task scheduled');
      onCreated(res.data);
      onClose();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule maintenance" subtitle="Plan a repair or routine service." size="lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="spin" />}Schedule</button>
      </>}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Type">
          <select className="select" value={form.type} onChange={set('type')}>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_EMOJI[t]} {titleCase(t)}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={form.scheduledDate} onChange={set('scheduledDate')} />
        </Field>
        <Field label="Description" className="span-2">
          <input className="input" value={form.description} onChange={set('description')} placeholder="e.g. Quarterly AC servicing for floor 2" />
        </Field>
        <Field label="Room (optional)">
          <select className="select" value={form.roomNumber} onChange={set('roomNumber')}>
            <option value="">Whole building / common area</option>
            {rooms.map(r => <option key={r._id} value={r.roomNumber}>Room {r.roomNumber} · Floor {r.floor}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="select" value={form.priority} onChange={set('priority')}>
            {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{titleCase(p)}</option>)}
          </select>
        </Field>
        <Field label="Assigned to">
          <input className="input" value={form.assignedTo} onChange={set('assignedTo')} placeholder="Vendor or staff name" />
        </Field>
        <Field label="Contact number">
          <input className="input" value={form.assignedContact} onChange={set('assignedContact')} placeholder="98xxxxxxxx" />
        </Field>
        <Field label="Estimated cost (₹)">
          <input className="input" type="number" min="0" value={form.estimatedCost} onChange={set('estimatedCost')} />
        </Field>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <label className="check"><input type="checkbox" checked={form.notifyTenants} onChange={set('notifyTenants')} />Notify all residents</label>
        </div>
      </form>
    </Modal>
  );
}

function CompleteModal({ task, onClose, onConfirm }) {
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastId, setLastId] = useState(null);
  if (task && task._id !== lastId) {
    setLastId(task._id);
    setCost(task.actualCost ?? task.estimatedCost ?? '');
  }
  const submit = async () => {
    setSaving(true);
    try { await onConfirm(cost === '' ? undefined : Number(cost)); } finally { setSaving(false); }
  };
  return (
    <Modal open={!!task} onClose={onClose} title="Mark as completed" size="sm" subtitle={task ? `${titleCase(task.type)} · ${task.description}` : ''}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-success" onClick={submit} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}Complete</button>
      </>}>
      <div className="stack">
        <Field label="Actual cost (₹)" hint="Leave as is if it matched the estimate.">
          <input className="input" type="number" min="0" value={cost} onChange={e => setCost(e.target.value)} autoFocus />
        </Field>
        <div className="callout callout-info small">
          <IndianRupee size={16} style={{ flexShrink: 0 }} />
          <span>The cost is automatically recorded as a maintenance expense, so it shows up in Reports.</span>
        </div>
      </div>
    </Modal>
  );
}
