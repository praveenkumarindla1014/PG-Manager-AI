import React, { useMemo, useState } from 'react';
import {
  Wallet, ChevronLeft, ChevronRight, CalendarPlus, MessageCircle, Plus, CheckCircle2, Clock, AlertTriangle,
  IndianRupee, TrendingUp, Copy, Smartphone, Send, Flame, Receipt, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast, useLiveRefresh } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Card, StatCard, Badge, Avatar, Modal, Tabs, Field, EmptyState, Skeleton, SkeletonCards } from '../../components/ui';
import { inr, formatDate, MONTHS, titleCase } from '../../utils/format';

const METHODS = ['cash', 'upi', 'bank-transfer', 'card'];

export default function PaymentsPage() {
  const { isOwner } = useAuth();
  return isOwner ? <OwnerPayments /> : <TenantPayments />;
}

/* =========================================================
   Owner
   ========================================================= */
function OwnerPayments() {
  const toast = useToast();
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [reminders, setReminders] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [markTarget, setMarkTarget] = useState(null);

  const q = `month=${period.month}&year=${period.year}`;
  const summary = useApi(`/payments/summary?${q}`);
  const payments = useApi(`/payments?${q}`, { initial: [] });
  const reload = () => { summary.reload({ silent: true }); payments.reload({ silent: true }); };
  useLiveRefresh('payment-updated', reload);

  const shift = (delta) => setPeriod(p => {
    const d = new Date(p.year, p.month - 1 + delta, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
  const isCurrent = period.month === now.getMonth() + 1 && period.year === now.getFullYear();

  const list = payments.data || [];
  const counts = useMemo(() => ({
    all: list.length,
    pending: list.filter(p => p.status === 'pending' || p.status === 'partial').length,
    overdue: list.filter(p => p.status === 'overdue').length,
    paid: list.filter(p => p.status === 'paid').length
  }), [list]);
  const filtered = list.filter(p => filter === 'all' || p.status === filter || (filter === 'pending' && p.status === 'partial'));
  const sorted = [...filtered].sort((a, b) => {
    const order = { overdue: 0, pending: 1, partial: 1, paid: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3) || (a.tenant?.name || '').localeCompare(b.tenant?.name || '');
  });

  const generateDues = async () => {
    setBusy('dues');
    try {
      const res = await api.post('/payments/generate-dues');
      toast(res.message);
      reload();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  const sendReminders = async (paymentIds) => {
    setBusy('reminders');
    try {
      const res = await api.post('/payments/reminders', paymentIds ? { paymentIds } : {});
      if (!res.data.length) toast('Everyone has paid — no reminders needed 🎉');
      else setReminders(res.data);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  const s = summary.data;

  return (
    <div className="page">
      <PageHeader
        title="Rent & Payments"
        subtitle="Track collections, chase dues and confirm payments in one place."
        actions={<>
          <button className="btn btn-secondary" onClick={generateDues} disabled={busy === 'dues'}>
            {busy === 'dues' ? <Loader2 size={16} className="spin" /> : <CalendarPlus size={16} />}Generate this month's dues
          </button>
          <button className="btn btn-whatsapp" onClick={() => sendReminders()} disabled={busy === 'reminders'}>
            {busy === 'reminders' ? <Loader2 size={16} className="spin" /> : <MessageCircle size={16} />}Send reminders
          </button>
          <button className="btn btn-primary" onClick={() => setRecordOpen(true)}><Plus size={16} />Record payment</button>
        </>}
      />

      <div className="row between wrap">
        <div className="row card" style={{ padding: 4, borderRadius: 12 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <span className="bold" style={{ minWidth: 130, textAlign: 'center' }}>{MONTHS[period.month - 1]} {period.year}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => shift(1)} disabled={isCurrent} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <Tabs value={view} onChange={setView} tabs={[{ value: 'list', label: 'Transactions', icon: Receipt }, { value: 'ai', label: 'AI predictions', icon: TrendingUp }]} />
      </div>

      {view === 'list' ? (
        <>
          <div className="grid-4">
            {!s ? <SkeletonCards count={4} /> : <>
              <StatCard label="Expected rent" value={inr(s.expected)} icon={IndianRupee} tone="info" foot={`${s.paidCount + s.pendingCount} tenant dues`} />
              <StatCard label="Collected" value={inr(s.collected)} icon={CheckCircle2} tone="success" progress={s.collectionRate} foot={`${s.collectionRate}% collected · ${s.paidCount} paid`} />
              <StatCard label="Pending" value={inr(s.pending)} icon={Clock} tone="warning" foot={`${s.pendingCount} payment${s.pendingCount === 1 ? '' : 's'} outstanding`} />
              <StatCard label="Overdue" value={s.overdueCount} icon={AlertTriangle} tone="danger" foot={s.overdueCount ? 'Past the 5th — follow up today' : 'Nothing overdue 🎉'} />
            </>}
          </div>

          <Card
            title="Payments"
            icon={Wallet}
            actions={<Tabs value={filter} onChange={setFilter} tabs={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'pending', label: 'Pending', count: counts.pending },
              { value: 'overdue', label: 'Overdue', count: counts.overdue },
              { value: 'paid', label: 'Paid', count: counts.paid }
            ]} />}
            bodyClass=""
          >
            <div style={{ height: 14 }} />
            {payments.loading ? (
              <div className="card-body stack">{[0, 1, 2, 3].map(i => <Skeleton key={i} height={44} />)}</div>
            ) : !sorted.length ? (
              <EmptyState icon={Wallet} title="No payments here" message={list.length ? 'Try another filter.' : "No rent dues for this month yet — click “Generate this month's dues”."} />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Tenant</th><th>Room</th><th className="num">Amount</th><th>Due</th><th>Status</th><th>Paid</th><th /></tr>
                  </thead>
                  <tbody>
                    {sorted.map(p => {
                      const reported = p.status !== 'paid' && p.notes?.startsWith('Tenant reported') && p.transactionId;
                      return (
                        <tr key={p._id}>
                          <td>
                            <div className="row">
                              <Avatar name={p.tenant?.name || '?'} size="sm" />
                              <div style={{ minWidth: 0 }}>
                                <div className="bold ellipsis">{p.tenant?.name || 'Former tenant'}</div>
                                <div className="tiny faint">{p.tenant?.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td>{p.room?.roomNumber ? `Room ${p.room.roomNumber}` : '—'}</td>
                          <td className="num bold">{inr(p.amount)}{p.lateFee > 0 && <div className="tiny text-danger">+{inr(p.lateFee)} late fee</div>}</td>
                          <td className="small">{formatDate(p.dueDate, { day: 'numeric', month: 'short' })}</td>
                          <td>
                            <div className="row-sm wrap">
                              <Badge status={p.status} dot />
                              {reported && <Badge tone="info" style={{ textTransform: 'none' }}>Reported · {p.transactionId}</Badge>}
                            </div>
                          </td>
                          <td className="small">
                            {p.paidDate ? <>{formatDate(p.paidDate, { day: 'numeric', month: 'short' })}<div className="tiny faint">{titleCase(p.method || '')}{p.daysLate > 0 ? ` · ${p.daysLate}d late` : ''}</div></> : <span className="faint">—</span>}
                          </td>
                          <td>
                            {p.status !== 'paid' && (
                              <div className="row-sm" style={{ justifyContent: 'flex-end' }}>
                                <button className="btn btn-whatsapp btn-xs" onClick={() => sendReminders([p._id])} title="WhatsApp reminder"><MessageCircle size={13} /></button>
                                <button className="btn btn-success btn-xs" onClick={() => setMarkTarget(p)}><CheckCircle2 size={13} />Mark paid</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Predictions />
      )}

      <RemindersModal reminders={reminders} onClose={() => setReminders(null)} />
      <RecordPaymentModal open={recordOpen} onClose={() => setRecordOpen(false)} onDone={reload} />
      <MarkPaidModal payment={markTarget} onClose={() => setMarkTarget(null)} onDone={reload} />
    </div>
  );
}

function Predictions() {
  const { data, loading } = useApi('/payments/predictions');
  const preds = data?.predictions || [];
  const tone = { high: 'danger', medium: 'warning', low: 'success' };
  const color = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
  if (loading) return <div className="grid-auto"><SkeletonCards count={6} height={130} /></div>;
  return (
    <div className="stack-lg">
      <div className="grid-3">
        <StatCard label="High risk" value={data?.summary?.highRisk ?? 0} icon={AlertTriangle} tone="danger" foot="Likely to pay late" />
        <StatCard label="Medium risk" value={data?.summary?.mediumRisk ?? 0} icon={Clock} tone="warning" foot="Sometimes late" />
        <StatCard label="Reliable" value={data?.summary?.lowRisk ?? 0} icon={CheckCircle2} tone="success" foot="Usually on time" />
      </div>
      <div className="callout callout-brand">
        <TrendingUp size={18} className="text-brand" />
        <span>Predictions are based on each tenant's last six months of payments. Send a friendly nudge to high-risk tenants a few days before the 5th.</span>
      </div>
      {!preds.length ? <EmptyState icon={TrendingUp} title="Not enough history yet" message="Predictions appear once tenants have a few months of payment records." /> : (
        <div className="grid-auto">
          {preds.map((p, i) => (
            <div key={i} className="card card-pad stack-sm">
              <div className="row between">
                <div className="row">
                  <Avatar name={p.tenantName} size="sm" />
                  <div>
                    <div className="bold">{p.tenantName}</div>
                    <div className="tiny faint">Room {p.roomNumber || '—'} · {inr(p.rent)}/mo</div>
                  </div>
                </div>
                <Badge tone={tone[p.risk]}>{p.risk} risk</Badge>
              </div>
              <div className="row between small mt-2">
                <span className="muted">Late-payment probability</span>
                <span className="bold mono">{p.lateProbability}%</span>
              </div>
              <div className="progress"><span style={{ width: `${p.lateProbability}%`, background: color[p.risk] }} /></div>
              <div className="tiny muted">{p.behavior} · {p.latePayments} of {p.totalPayments} late · avg {p.averageDaysLate} day{p.averageDaysLate === 1 ? '' : 's'} late</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemindersModal({ reminders, onClose }) {
  const toast = useToast();
  return (
    <Modal open={!!reminders} onClose={onClose} title="WhatsApp reminders" subtitle="In-app reminders were sent too. Tap Send to open WhatsApp with the message ready." size="lg"
      footer={<button className="btn btn-secondary" onClick={onClose}>Done</button>}>
      <div className="stack">
        {reminders?.map((r, i) => (
          <div key={i} className="card-soft" style={{ padding: 14 }}>
            <div className="row between wrap">
              <div className="row">
                <Avatar name={r.tenant} size="sm" />
                <div>
                  <div className="bold">{r.tenant} <span className="faint small">· Room {r.room}</span></div>
                  <div className="tiny muted">{inr(r.amount)} · <Badge status={r.status} /></div>
                </div>
              </div>
              <div className="row-sm">
                <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(r.message); toast('Message copied'); }}><Copy size={14} />Copy</button>
                {r.whatsappLink
                  ? <a className="btn btn-whatsapp btn-sm" href={r.whatsappLink} target="_blank" rel="noreferrer"><Send size={14} />Send</a>
                  : <span className="tiny faint">No phone number</span>}
              </div>
            </div>
            <p className="small muted mt-2" style={{ whiteSpace: 'pre-wrap' }}>{r.message}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function RecordPaymentModal({ open, onClose, onDone }) {
  const toast = useToast();
  const { data: tenants } = useApi(open ? '/tenants' : null, { initial: [] });
  const [form, setForm] = useState({ tenant: '', amount: '', method: 'upi', transactionId: '' });
  const [saving, setSaving] = useState(false);

  const pickTenant = (id) => {
    const t = tenants.find(x => x._id === id);
    setForm(f => ({ ...f, tenant: id, amount: t?.roomId?.rent || f.amount }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tenant) return toast('Choose a tenant', 'error');
    setSaving(true);
    try {
      const res = await api.post('/payments', { ...form, amount: Number(form.amount) || undefined });
      toast(res.message || 'Payment recorded');
      setForm({ tenant: '', amount: '', method: 'upi', transactionId: '' });
      onDone();
      onClose();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record a payment" subtitle="Marks the tenant's oldest unpaid rent as paid, or records this month's rent."
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="spin" />}Record payment</button>
      </>}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Tenant" className="span-2">
          <select className="select" value={form.tenant} onChange={e => pickTenant(e.target.value)}>
            <option value="">Select a tenant…</option>
            {tenants.map(t => (
              <option key={t._id} value={t._id}>{t.name}{t.roomId ? ` — Room ${t.roomId.roomNumber}` : ''}{t.rentStatus && t.rentStatus !== 'paid' ? ` (${t.rentStatus})` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount (₹)">
          <input className="input" type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Room rent" />
        </Field>
        <Field label="Method">
          <select className="select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
            {METHODS.map(m => <option key={m} value={m}>{titleCase(m)}</option>)}
          </select>
        </Field>
        <Field label="Transaction ID (optional)" className="span-2">
          <input className="input" value={form.transactionId} onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="UPI reference / receipt no." />
        </Field>
      </form>
    </Modal>
  );
}

function MarkPaidModal({ payment, onClose, onDone }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [saving, setSaving] = useState(false);
  const [lastId, setLastId] = useState(null);

  if (payment && payment._id !== lastId) {
    setLastId(payment._id);
    setAmount(payment.amount);
    setMethod(payment.method && payment.method !== 'other' ? payment.method : 'upi');
  }

  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/payments/${payment._id}/mark-paid`, { amount: Number(amount), method });
      toast(res.message || 'Marked as paid');
      onDone();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal open={!!payment} onClose={onClose} title="Confirm payment" size="sm"
      subtitle={payment ? `${payment.tenant?.name} · ${MONTHS[payment.month - 1]} ${payment.year}` : ''}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-success" onClick={submit} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}Mark as paid</button>
      </>}>
      <div className="stack">
        {payment?.transactionId && <div className="callout callout-info small">Tenant reported transaction <b>{payment.transactionId}</b>. Check your bank/UPI app before confirming.</div>}
        <Field label="Amount received (₹)"><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="Method">
          <select className="select" value={method} onChange={e => setMethod(e.target.value)}>
            {METHODS.map(m => <option key={m} value={m}>{titleCase(m)}</option>)}
          </select>
        </Field>
        <p className="tiny faint">A late fee is added automatically if paid more than a week after the due date. The tenant gets a receipt notification.</p>
      </div>
    </Modal>
  );
}

/* =========================================================
   Tenant
   ========================================================= */
function TenantPayments() {
  const toast = useToast();
  const { data: history, loading, reload } = useApi('/payments', { initial: [] });
  const { data: payInfo } = useApi('/payments/pay-info');
  const [reportOpen, setReportOpen] = useState(false);
  useLiveRefresh('payment-updated', () => reload({ silent: true }));

  const now = new Date();
  const current = history.find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear());
  const oldestUnpaid = [...history].filter(p => p.status !== 'paid').sort((a, b) => a.year - b.year || a.month - b.month)[0];
  const focus = oldestUnpaid || current;

  const streak = useMemo(() => {
    let n = 0;
    for (const p of [...history].sort((a, b) => b.year - a.year || b.month - a.month)) {
      if (p.status !== 'paid') { if (n === 0) continue; break; }
      if ((p.daysLate || 0) === 0) n++;
      else break;
    }
    return n;
  }, [history]);

  const totalPaid = history.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount + (p.lateFee || 0), 0);
  const isPaid = focus?.status === 'paid';
  const awaiting = focus && !isPaid && focus.notes?.includes('Tenant reported');
  const upiLink = focus && payInfo
    ? `upi://pay?pa=${encodeURIComponent(payInfo.upiId)}&pn=${encodeURIComponent(payInfo.payee)}&am=${focus.amount}&cu=INR&tn=${encodeURIComponent(`Rent ${MONTHS[focus.month - 1]} ${focus.year}`)}`
    : null;

  return (
    <div className="page">
      <PageHeader title="My Rent" subtitle="Your dues, how to pay, and every payment you've made." />

      {loading ? <Skeleton height={180} style={{ borderRadius: 24 }} /> : !focus ? (
        <div className="card"><EmptyState icon={Wallet} title="No rent dues yet" message="Your rent for this month hasn't been generated. You'll get a notification when it's due." /></div>
      ) : (
        <div className="hero-card">
          <div className="row between wrap" style={{ position: 'relative', zIndex: 1, gap: 20 }}>
            <div className="stack-sm">
              <div className="small bold" style={{ opacity: 0.85 }}>{MONTHS[focus.month - 1]} {focus.year} rent</div>
              <div className="display" style={{ fontSize: '2.6rem', lineHeight: 1.1 }}>{inr(focus.amount)}</div>
              <div className="row-sm wrap small" style={{ opacity: 0.95 }}>
                {isPaid ? <><CheckCircle2 size={16} /> Paid on {formatDate(focus.paidDate)} — thank you!</>
                  : awaiting ? <><Clock size={16} /> Waiting for owner confirmation</>
                  : focus.status === 'overdue' ? <><AlertTriangle size={16} /> Overdue since {formatDate(focus.dueDate)} · ₹500/week late fee applies</>
                  : <><Clock size={16} /> Due by {formatDate(focus.dueDate)}</>}
              </div>
            </div>
            {!isPaid && (
              <div className="row wrap">
                {upiLink && <a className="btn btn-white btn-lg" href={upiLink}><Smartphone size={18} />Pay via UPI</a>}
                <button className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }} onClick={() => setReportOpen(true)}>
                  <Send size={17} />I've paid — notify owner
                </button>
              </div>
            )}
          </div>
          {!isPaid && payInfo && (
            <div className="small" style={{ marginTop: 14, opacity: 0.85, position: 'relative', zIndex: 1 }}>
              UPI ID: <b>{payInfo.upiId}</b> · Payee: {payInfo.payee}
              <button className="btn btn-xs" style={{ marginLeft: 8, background: 'rgba(255,255,255,0.18)', color: '#fff' }} onClick={() => { navigator.clipboard?.writeText(payInfo.upiId); toast('UPI ID copied'); }}><Copy size={12} />Copy</button>
            </div>
          )}
        </div>
      )}

      <div className="grid-3">
        <StatCard label="On-time streak" value={`${streak} month${streak === 1 ? '' : 's'}`} icon={Flame} tone="warning"
          foot={streak ? `You've paid on time ${streak} month${streak === 1 ? '' : 's'} in a row 🔥` : 'Pay before the 5th to start a streak'} />
        <StatCard label="Total paid" value={inr(totalPaid)} icon={IndianRupee} tone="success" foot={`${history.filter(p => p.status === 'paid').length} payments`} />
        <StatCard label="Due day" value={`${payInfo?.dueDay || 5}th`} icon={Clock} tone="info" foot={`Late fee ${inr(payInfo?.lateFeePerWeek || 500)}/week after due date`} />
      </div>

      <Card title="Payment history" icon={Receipt} bodyClass="">
        <div style={{ height: 14 }} />
        {loading ? <div className="card-body"><Skeleton height={120} /></div> : !history.length ? (
          <EmptyState icon={Receipt} title="No payments yet" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Month</th><th className="num">Amount</th><th>Status</th><th>Paid on</th><th className="num">Late fee</th></tr></thead>
              <tbody>
                {history.map(p => (
                  <tr key={p._id}>
                    <td className="bold">{MONTHS[p.month - 1]} {p.year}</td>
                    <td className="num">{inr(p.amount)}</td>
                    <td><Badge status={p.status} dot /></td>
                    <td className="small">{p.paidDate ? <>{formatDate(p.paidDate)}<div className="tiny faint">{titleCase(p.method || '')}{p.daysLate > 0 ? ` · ${p.daysLate}d late` : ' · on time'}</div></> : '—'}</td>
                    <td className="num">{p.lateFee ? <span className="text-danger">{inr(p.lateFee)}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ReportPaidModal open={reportOpen} payment={focus} onClose={() => setReportOpen(false)} onDone={() => reload({ silent: true })} />
    </div>
  );
}

function ReportPaidModal({ open, payment, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ method: 'upi', transactionId: '', note: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (form.method !== 'cash' && !form.transactionId.trim()) return toast('Please add the transaction / UPI reference ID', 'error');
    setSaving(true);
    try {
      const res = await api.post(`/payments/${payment._id}/report`, form);
      toast(res.message || 'Owner notified');
      setForm({ method: 'upi', transactionId: '', note: '' });
      onDone();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open && !!payment} onClose={onClose} title="Let the owner know you've paid"
      subtitle={payment ? `${inr(payment.amount)} · ${MONTHS[payment.month - 1]} ${payment.year}` : ''}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Send size={16} />}Notify owner</button>
      </>}>
      <div className="stack">
        <Field label="How did you pay?">
          <select className="select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
            {METHODS.map(m => <option key={m} value={m}>{titleCase(m)}</option>)}
          </select>
        </Field>
        <Field label="Transaction / UPI reference ID" hint="Find it in your UPI app's payment details (12 digits).">
          <input className="input" value={form.transactionId} onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="e.g. 427812345678" />
        </Field>
        <Field label="Note (optional)">
          <textarea className="textarea" style={{ minHeight: 70 }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Anything the owner should know" />
        </Field>
      </div>
    </Modal>
  );
}
