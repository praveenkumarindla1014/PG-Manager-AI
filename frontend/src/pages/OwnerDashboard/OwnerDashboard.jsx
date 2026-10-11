import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble, Wallet, AlertCircle, MessageSquareWarning, Sparkles, Send, RefreshCw, ListChecks,
  Wrench, CalendarClock, ArrowRight, Lightbulb, DoorOpen, Users, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast, useLiveRefresh } from '../../context/AppContext';
import { api } from '../../services/api';
import { Card, StatCard, Badge, Skeleton, SkeletonCards, EmptyState, Modal, AnimatedNumber } from '../../components/ui';
import { BarChart, DonutChart, HBars } from '../../components/ui/Charts';
import { inr, compactInr, greeting, firstName, formatDate, timeAgo, titleCase } from '../../utils/format';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const dash = useApi('/reports/dashboard');
  const todo = useApi('/reports/todo', { initial: [] });
  const complaints = useApi('/complaints', { initial: [] });
  const [brief, setBrief] = useState({ data: null, loading: true });
  const [reminders, setReminders] = useState(null);
  const [sending, setSending] = useState(false);

  const loadBrief = async (refresh = false) => {
    setBrief(b => ({ ...b, loading: true }));
    try {
      const res = await api.get(`/reports/daily-summary${refresh ? '?refresh=true' : ''}`);
      setBrief({ data: res.data, loading: false });
    } catch (e) {
      setBrief({ data: null, loading: false });
      if (refresh) toast(e.message, 'error');
    }
  };

  // AI brief loads separately so KPIs appear instantly.
  React.useEffect(() => { loadBrief(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLiveRefresh(['complaint-updated', 'payment-updated'], () => {
    dash.reload({ silent: true });
    todo.reload({ silent: true });
    complaints.reload({ silent: true });
  });

  const sendReminders = async () => {
    setSending(true);
    try {
      const res = await api.post('/payments/reminders', {});
      if (!res.data.length) toast('Everyone has paid this month 🎉');
      else setReminders(res.data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const d = dash.data;
  const occ = d?.occupancy;
  const fin = d?.finance;
  const openComplaints = (complaints.data || []).filter(c => ['open', 'in-progress'].includes(c.status)).slice(0, 5);
  const headline = brief.data?.aiInsights?.[0];

  return (
    <div className="page">
      <div className="hero-card">
        <div className="row between wrap" style={{ position: 'relative', zIndex: 1, gap: 18 }}>
          <div className="grow" style={{ minWidth: 260 }}>
            <div className="small bold" style={{ opacity: 0.85 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1 className="display" style={{ fontSize: '2rem', margin: '4px 0 8px' }}>{greeting()}, {firstName(user?.name)} 👋</h1>
            <p style={{ opacity: 0.92, maxWidth: 620, minHeight: 22 }}>
              {brief.loading && !headline
                ? <span className="row-sm"><Loader2 size={15} className="spin" />PG Buddy is reading today's numbers…</span>
                : headline || (d ? `${occ.occupiedBeds} of ${occ.totalBeds} beds filled and ${inr(fin.collected)} collected so far this month.` : 'Here’s what’s happening at your PG today.')}
            </p>
          </div>
          <div className="row wrap">
            <button className="btn btn-white" onClick={() => window.dispatchEvent(new Event('pg:open-ai'))}><Sparkles size={16} />Ask AI</button>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }} onClick={sendReminders} disabled={sending}>
              {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}Send rent reminders
            </button>
          </div>
        </div>
      </div>

      {dash.loading && !d ? (
        <div className="grid-4"><SkeletonCards count={4} height={128} /></div>
      ) : d ? (
        <div className="grid-4">
          <StatCard label="Bed occupancy" icon={BedDouble} tone="brand"
            value={<><AnimatedNumber value={occ.occupancyRate} format={v => v.toFixed(1)} />%</>}
            progress={occ.occupancyRate}
            foot={`${occ.occupiedBeds}/${occ.totalBeds} beds · ${occ.vacantBeds} vacant`}
            onClick={() => navigate('/rooms')} />
          <StatCard label={`Collected · ${fin.label}`} icon={Wallet} tone="success"
            value={<AnimatedNumber value={fin.collected} format={v => inr(v)} />}
            progress={fin.collectionRate}
            foot={`${fin.collectionRate}% of ${inr(fin.expected)}`}
            onClick={() => navigate('/payments')} />
          <StatCard label="Pending rent" icon={AlertCircle} tone={fin.pendingCount ? 'warning' : 'success'}
            value={<AnimatedNumber value={fin.pending} format={v => inr(v)} />}
            foot={fin.pendingCount ? `${fin.pendingCount} tenant(s) · ${fin.overdueCount} overdue` : 'All rent collected 🎉'}
            onClick={() => navigate('/payments')} />
          <StatCard label="Open complaints" icon={MessageSquareWarning} tone={d.complaints.emergency ? 'danger' : 'info'}
            value={<AnimatedNumber value={d.complaints.open} />}
            foot={d.complaints.emergency ? <span className="text-danger bold">{d.complaints.emergency} emergency</span> : `${d.complaints.highPriority} high priority`}
            onClick={() => navigate('/complaints')} />
        </div>
      ) : (
        <Card><EmptyState title="Couldn't load the dashboard" message={dash.error} action={<button className="btn btn-secondary" onClick={() => dash.reload()}>Try again</button>} /></Card>
      )}

      {d && (
        <div className="grid-main">
          <Card title="Income vs expenses" subtitle="Last 6 months" icon={Wallet}
            actions={<span className="small muted">Profit this month <b className={fin.profit >= 0 ? 'text-success' : 'text-danger'}>{compactInr(fin.profit)}</b></span>}>
            <BarChart data={d.trend} series={[
              { key: 'income', label: 'Rent collected', color: 'var(--brand)' },
              { key: 'expenses', label: 'Expenses', color: '#f2a65a' }
            ]} />
          </Card>
          <Card title="Occupancy" subtitle={`${occ.totalRooms} rooms · ${d.tenants} residents`} icon={BedDouble}>
            <div className="stack-lg">
              <DonutChart size={150} centerValue={`${Math.round(occ.occupancyRate)}%`} centerLabel="occupied" segments={[
                { label: 'Occupied beds', value: occ.occupiedBeds, color: 'var(--brand)' },
                { label: 'Vacant beds', value: occ.vacantBeds, color: '#f2c94c' }
              ]} />
              <HBars items={occ.byFloor.map(f => ({ label: `Floor ${f.floor}`, value: f.occupied, max: f.beds, display: `${f.occupied}/${f.beds} beds` }))} />
            </div>
          </Card>
        </div>
      )}

      <div className="grid-main">
        <Card title="AI daily brief" subtitle={brief.data?.updatedAt ? `Updated ${timeAgo(brief.data.updatedAt)}` : 'Insights from today’s data'} icon={Lightbulb}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => loadBrief(true)} disabled={brief.loading}><RefreshCw size={14} className={brief.loading ? 'spin' : ''} />Refresh</button>}>
          {brief.loading && !brief.data ? (
            <div className="stack">{[0, 1, 2, 3].map(i => <Skeleton key={i} height={18} width={`${92 - i * 9}%`} />)}</div>
          ) : brief.data?.aiInsights?.length ? (
            <div className="stack">
              {brief.data.aiInsights.map((ins, i) => (
                <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="stat-icon" style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand)' }}><Sparkles size={13} /></span>
                  <span className="grow" style={{ paddingTop: 3 }}>{ins}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Lightbulb} title="No insights yet" message="Refresh to generate today's brief." />
          )}
        </Card>

        <Card title="Today's to-do" subtitle="Prioritised for you" icon={ListChecks}>
          {todo.loading && !todo.data?.length ? (
            <div className="stack">{[0, 1, 2].map(i => <Skeleton key={i} height={40} />)}</div>
          ) : todo.data?.length ? (
            <div className="list">
              {todo.data.slice(0, 7).map((t, i) => (
                <button key={i} className="list-item" style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  onClick={() => t.link && navigate(t.link)}>
                  <Badge status={t.priority} />
                  <span className="grow small">{t.task}</span>
                  <ArrowRight size={14} className="faint" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={ListChecks} title="Nothing urgent" message="You're on top of everything today ✨" />
          )}
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Open complaints" icon={MessageSquareWarning}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/complaints')}>View all<ArrowRight size={14} /></button>}>
          {complaints.loading && !complaints.data?.length ? (
            <div className="stack">{[0, 1, 2].map(i => <Skeleton key={i} height={44} />)}</div>
          ) : openComplaints.length ? (
            <div className="list">
              {openComplaints.map(c => (
                <div key={c._id} className="list-item">
                  <span style={{ fontSize: '1.2rem' }}>{c.sentimentEmoji || '😐'}</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="bold small ellipsis">{c.description}</div>
                    <div className="tiny faint">Room {c.room?.roomNumber || '—'} · {c.tenant?.name || 'Tenant'} · {timeAgo(c.createdAt)}</div>
                  </div>
                  {c.isEmergency ? <Badge tone="danger">Emergency</Badge> : <Badge status={c.aiPriority}>{titleCase(c.aiPriority)}</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={MessageSquareWarning} title="No open complaints" message="Residents are happy right now 🎉" />
          )}
        </Card>

        <Card title="Coming up" icon={CalendarClock}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/maintenance')}>Schedule<ArrowRight size={14} /></button>}>
          {d && (
            <div className="row wrap" style={{ marginBottom: 12, gap: 8 }}>
              <span className="feature-tag"><DoorOpen size={13} />{d.visitors.today} visitor(s) today</span>
              {d.visitors.pendingApproval > 0 && <Badge tone="warning">{d.visitors.pendingApproval} awaiting approval</Badge>}
              <span className="feature-tag"><Wallet size={13} />{inr(d.todayIncome)} collected today</span>
              <span className="feature-tag"><Users size={13} />{d.tenants} residents</span>
            </div>
          )}
          {d?.upcomingMaintenance?.length ? (
            <div className="list">
              {d.upcomingMaintenance.map(m => (
                <div key={m._id} className="list-item">
                  <span className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><Wrench size={16} /></span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="bold small ellipsis">{m.description}</div>
                    <div className="tiny faint">{titleCase(m.type)}{m.assignedTo ? ` · ${m.assignedTo}` : ''}</div>
                  </div>
                  <span className="tiny bold muted">{formatDate(m.scheduledDate, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </div>
          ) : !dash.loading && (
            <EmptyState icon={CalendarClock} title="Nothing scheduled this week" />
          )}
        </Card>
      </div>

      <Modal open={!!reminders} onClose={() => setReminders(null)} title="Rent reminders ready"
        subtitle="Residents were notified in the app. Tap to send each one on WhatsApp too."
        footer={<button className="btn btn-primary" onClick={() => setReminders(null)}>Done</button>}>
        <div className="stack">
          {reminders?.map((r, i) => (
            <div key={i} className="card-soft row" style={{ padding: '10px 12px' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="bold">{r.tenant} <span className="faint small">· Room {r.room}</span></div>
                <div className="tiny muted">{inr(r.amount)} · <Badge status={r.status} /></div>
              </div>
              {r.whatsappLink
                ? <a className="btn btn-whatsapp btn-sm" href={r.whatsappLink} target="_blank" rel="noreferrer"><Send size={14} />WhatsApp</a>
                : <span className="tiny faint">No phone</span>}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
