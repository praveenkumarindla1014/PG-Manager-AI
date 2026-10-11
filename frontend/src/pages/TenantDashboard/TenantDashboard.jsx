import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, UtensilsCrossed, BedDouble, MessageSquareWarning, Megaphone, Sparkles, CheckCircle2,
  Smartphone, Receipt, ArrowRight, Plus, Users, Loader2, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast, useLiveRefresh } from '../../context/AppContext';
import { api } from '../../services/api';
import { Card, Badge, Skeleton, EmptyState, Modal, Field, Avatar } from '../../components/ui';
import { inr, greeting, firstName, formatDate, timeAgo, titleCase, MONTHS } from '../../utils/format';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', until: 10 },
  { key: 'lunch', label: 'Lunch', until: 15 },
  { key: 'snacks', label: 'Evening snacks', until: 18 },
  { key: 'dinner', label: 'Dinner', until: 24 }
];

const QUICK_ASKS = ["What's for dinner?", 'When is my rent due?', 'What time does the gate close?', 'My WiFi is slow'];

export default function TenantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const payments = useApi('/payments', { initial: [] });
  const payInfo = useApi('/payments/pay-info');
  const menu = useApi('/menu');
  const complaints = useApi('/complaints', { initial: [] });
  const notices = useApi('/notices', { initial: [] });
  const [roommates, setRoommates] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [txn, setTxn] = useState({ transactionId: '', method: 'upi', note: '' });
  const [submitting, setSubmitting] = useState(false);

  const room = user?.roomId;

  useEffect(() => {
    if (!room?._id) { setRoommates([]); return; }
    api.get(`/rooms/${room._id}`)
      .then(res => setRoommates((res.data.currentOccupants || []).filter(o => String(o._id) !== String(user._id))))
      .catch(() => setRoommates([]));
  }, [room?._id, user?._id]);

  useLiveRefresh(['payment-updated', 'complaint-updated'], () => {
    payments.reload({ silent: true });
    complaints.reload({ silent: true });
  });

  const now = new Date();
  const current = useMemo(
    () => (payments.data || []).find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payments.data]
  );
  const unpaid = (payments.data || []).filter(p => p.status !== 'paid');
  const due = current && current.status !== 'paid' ? current : unpaid[0];
  const reported = due?.notes?.startsWith('Tenant reported');

  const nextMeal = MEALS.find(m => now.getHours() < m.until) || MEALS[3];
  const meal = menu.data?.[nextMeal.key];
  const mealCalories = (meal?.items || []).reduce((s, i) => s + (Number(i.nutrition?.calories) || 0), 0);

  const upiLink = due && payInfo.data
    ? `upi://pay?pa=${encodeURIComponent(payInfo.data.upiId)}&pn=${encodeURIComponent(payInfo.data.payee)}&am=${due.amount}&cu=INR&tn=${encodeURIComponent(`Rent ${MONTHS[due.month - 1]} Room ${room?.roomNumber || ''}`)}`
    : null;

  const submitReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/payments/${due._id}/report`, txn);
      toast(res.message || 'Thanks! The owner will confirm soon.');
      setReportOpen(false);
      setTxn({ transactionId: '', method: 'upi', note: '' });
      payments.reload({ silent: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Opens the assistant; with a question, asks it straight away.
  const askAI = (message) => window.dispatchEvent(new CustomEvent('pg:open-ai', { detail: typeof message === 'string' ? { message } : undefined }));
  const myComplaints = (complaints.data || []).slice(0, 3);
  const latestNotices = (notices.data || []).slice(0, 3);

  return (
    <div className="page">
      <div className="hero-card">
        <div className="row between wrap" style={{ position: 'relative', zIndex: 1, gap: 18 }}>
          <div className="grow" style={{ minWidth: 240 }}>
            <div className="small bold" style={{ opacity: 0.85 }}>{room?.roomNumber ? `Room ${room.roomNumber} · Floor ${room.floor}` : 'Welcome to the PG'}</div>
            <h1 className="display" style={{ fontSize: '2rem', margin: '4px 0 8px' }}>{greeting()}, {firstName(user?.name)} 👋</h1>
            <p style={{ opacity: 0.92 }}>
              {due ? `Your rent of ${inr(due.amount)} is ${due.status === 'overdue' ? 'overdue' : `due on ${formatDate(due.dueDate, { day: 'numeric', month: 'short' })}`}.` : 'Your rent is all paid up. '}
              {meal?.items?.length ? ` ${nextMeal.label} today: ${meal.items[0].name}.` : ''}
            </p>
          </div>
          <button className="btn btn-white" onClick={() => askAI()}><Sparkles size={16} />Ask PG Buddy</button>
        </div>
        <div className="row wrap" style={{ position: 'relative', zIndex: 1, marginTop: 16, gap: 6 }}>
          {QUICK_ASKS.map(q => (
            <button key={q} className="chip" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => askAI(q)}>{q}</button>
          ))}
        </div>
      </div>

      <div className="grid-3">
        <Card title="Rent" icon={Wallet} subtitle={current ? `${MONTHS[current.month - 1]} ${current.year}` : 'This month'}>
          {payments.loading && !payments.data?.length ? (
            <Skeleton height={90} />
          ) : due ? (
            <div className="stack">
              <div className="row between">
                <span className="stat-value">{inr(due.amount)}</span>
                <Badge status={due.status} dot />
              </div>
              <div className="small muted row-sm"><Clock size={14} />Due {formatDate(due.dueDate)}{unpaid.length > 1 && ` · ${unpaid.length} months unpaid`}</div>
              {reported ? (
                <div className="callout callout-info small"><CheckCircle2 size={16} />You've reported this payment — waiting for the owner to confirm.</div>
              ) : (
                <div className="row wrap">
                  {upiLink && <a className="btn btn-primary btn-sm grow" href={upiLink}><Smartphone size={15} />Pay {inr(due.amount)} via UPI</a>}
                  <button className="btn btn-secondary btn-sm grow" onClick={() => setReportOpen(true)}><Receipt size={15} />I've paid</button>
                </div>
              )}
              {payInfo.data && <div className="tiny faint">UPI ID: <b>{payInfo.data.upiId}</b> · ₹{payInfo.data.lateFeePerWeek}/week late fee after the {payInfo.data.dueDay}th</div>}
            </div>
          ) : (
            <div className="stack-sm">
              <div className="row-sm text-success bold"><CheckCircle2 size={20} />All paid up</div>
              <p className="small muted">{current?.paidDate ? `Paid ${inr(current.amount)} on ${formatDate(current.paidDate)}. Thank you!` : 'No dues right now.'}</p>
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/payments')}>Payment history<ArrowRight size={14} /></button>
            </div>
          )}
        </Card>

        <Card title={nextMeal.label} icon={UtensilsCrossed} subtitle={meal?.timing || 'Today'}>
          {menu.loading && !menu.data ? (
            <Skeleton height={90} />
          ) : meal?.items?.length ? (
            <div className="stack-sm">
              {meal.items.map((it, i) => (
                <div key={i} className="row between small">
                  <span className="row-sm bold">
                    <i style={{ width: 9, height: 9, borderRadius: 2, border: `1.5px solid ${it.isVeg === false ? 'var(--danger)' : 'var(--success)'}`, display: 'inline-block' }} />
                    {it.name}
                  </span>
                  <span className="faint mono">{it.nutrition?.calories || '—'} kcal</span>
                </div>
              ))}
              <div className="divider" />
              <div className="row between tiny">
                <span className="faint">{mealCalories} kcal this meal</span>
                <button className="btn btn-ghost btn-xs" onClick={() => navigate('/menu')}>Full week<ArrowRight size={12} /></button>
              </div>
            </div>
          ) : (
            <EmptyState icon={UtensilsCrossed} title="Menu not set" message="The kitchen hasn't posted this meal yet." />
          )}
        </Card>

        <Card title="My room" icon={BedDouble} subtitle={room ? `${titleCase(room.type || '')} sharing · Floor ${room.floor}` : undefined}>
          {room ? (
            <div className="stack">
              <div className="row between">
                <span className="stat-value">Room {room.roomNumber}</span>
                <span className="small muted">{inr(room.rent)}/mo</span>
              </div>
              <div className="row wrap" style={{ gap: 5 }}>
                {room.hasAC && <span className="feature-tag">AC</span>}
                {room.hasAttachedBathroom && <span className="feature-tag">Attached bath</span>}
                {room.hasWifi && <span className="feature-tag">WiFi</span>}
                {room.hasGeyser && <span className="feature-tag">Geyser</span>}
                {room.hasBalcony && <span className="feature-tag">Balcony</span>}
              </div>
              <div className="stack-sm">
                <span className="tiny bold faint row-sm"><Users size={13} />Roommates</span>
                {roommates === null ? <Skeleton height={28} /> : roommates.length ? (
                  roommates.map(r => (
                    <div key={r._id} className="row-sm small"><Avatar name={r.name} size="sm" /><span className="bold">{r.name}</span></div>
                  ))
                ) : <span className="small muted">You have the room to yourself.</span>}
              </div>
            </div>
          ) : (
            <EmptyState icon={BedDouble} title="No room assigned yet" message="The owner will assign your bed soon." />
          )}
        </Card>
      </div>

      <div className="grid-2">
        <Card title="My complaints" icon={MessageSquareWarning}
          actions={<button className="btn btn-soft btn-sm" onClick={() => navigate('/complaints')}><Plus size={14} />Report an issue</button>}>
          {complaints.loading && !complaints.data?.length ? (
            <div className="stack">{[0, 1].map(i => <Skeleton key={i} height={44} />)}</div>
          ) : myComplaints.length ? (
            <div className="list">
              {myComplaints.map(c => (
                <div key={c._id} className="list-item">
                  <span style={{ fontSize: '1.2rem' }}>{c.sentimentEmoji || '😐'}</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="bold small ellipsis">{c.description}</div>
                    <div className="tiny faint">{titleCase(c.aiCategory)} · {timeAgo(c.createdAt)}{c.status !== 'resolved' && c.aiEstimatedTime ? ` · fix in ~${c.aiEstimatedTime}` : ''}</div>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={MessageSquareWarning} title="No complaints" message="Something broken? Tell PG Buddy or tap “Report an issue”." />
          )}
        </Card>

        <Card title="Notices" icon={Megaphone}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/notices')}>View all<ArrowRight size={14} /></button>}>
          {notices.loading && !notices.data?.length ? (
            <div className="stack">{[0, 1].map(i => <Skeleton key={i} height={52} />)}</div>
          ) : latestNotices.length ? (
            <div className="stack">
              {latestNotices.map(n => (
                <button key={n._id} className="card-soft" style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', borderColor: n.isRead ? undefined : 'var(--brand-100)', background: n.isRead ? undefined : 'var(--brand-50)' }}
                  onClick={() => navigate('/notices')}>
                  <div className="row between">
                    <span className="bold small ellipsis grow">{!n.isRead && <span className="text-brand">● </span>}{n.title}</span>
                    {['high', 'urgent'].includes(n.priority) && <Badge status={n.priority} />}
                  </div>
                  <div className="tiny muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 2 }}>{n.content}</div>
                  <div className="tiny faint mt-1">{timeAgo(n.createdAt)}</div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="No notices" message="Announcements from the owner will show up here." />
          )}
        </Card>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report your payment"
        subtitle={due ? `${inr(due.amount)} for ${MONTHS[due.month - 1]} ${due.year}` : undefined}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setReportOpen(false)}>Cancel</button>
          <button className="btn btn-primary" form="report-payment" type="submit" disabled={submitting}>
            {submitting && <Loader2 size={16} className="spin" />}Send to owner
          </button>
        </>}>
        <form id="report-payment" className="stack" onSubmit={submitReport}>
          <Field label="Payment method">
            <select className="select" value={txn.method} onChange={e => setTxn(t => ({ ...t, method: e.target.value }))}>
              <option value="upi">UPI</option>
              <option value="bank-transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
          </Field>
          <Field label="Transaction / UTR ID" hint="Found in your UPI app's payment details">
            <input className="input" value={txn.transactionId} onChange={e => setTxn(t => ({ ...t, transactionId: e.target.value }))} placeholder="e.g. 4281 9921 0034" required={txn.method !== 'cash'} />
          </Field>
          <Field label="Note (optional)">
            <input className="input" value={txn.note} onChange={e => setTxn(t => ({ ...t, note: e.target.value }))} placeholder="Anything the owner should know" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
