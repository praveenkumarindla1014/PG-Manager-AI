import React, { useState } from 'react';
import {
  BarChart3, Download, Receipt, Lightbulb, Wallet, TrendingUp, TrendingDown, AlertCircle, Plus, Pencil, Trash2,
  Loader2, PiggyBank, BedDouble, Users, Sparkles, Minus
} from 'lucide-react';
import { useApi, useToast } from '../../context/AppContext';
import { api, downloadFile } from '../../services/api';
import { PageHeader, Card, StatCard, Badge, Tabs, Modal, Field, ConfirmDialog, EmptyState, Skeleton, SkeletonCards, AnimatedNumber } from '../../components/ui';
import { BarChart, HBars } from '../../components/ui/Charts';
import { inr, MONTHS, formatDate, titleCase } from '../../utils/format';

const CATEGORIES = ['food', 'electricity', 'water', 'gas', 'maintenance', 'salary', 'rent-building', 'internet', 'cleaning', 'pest-control', 'equipment', 'miscellaneous'];
const CAT_COLORS = ['#c8174f', '#f2a65a', '#0f766e', '#6d28d9', '#1d5fd1', '#ca8a04', '#db2777', '#16a34a', '#0284c7', '#ea580c', '#9333ea', '#57534e'];
const catColor = (c) => CAT_COLORS[Math.max(0, CATEGORIES.indexOf(c)) % CAT_COLORS.length];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState('overview');
  const [visited, setVisited] = useState({ overview: true });
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const changeTab = (t) => {
    setTab(t);
    setVisited(v => ({ ...v, [t]: true }));
  };

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const download = async () => {
    setDownloading(true);
    try {
      await downloadFile(`/reports/monthly-pdf?month=${month}&year=${year}`, `report-${year}-${month}.pdf`);
      toast('Report downloaded');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Reports & Expenses"
        subtitle="Profit and loss, spending and AI suggestions to grow your PG"
        actions={<>
          <select className="select" style={{ width: 140 }} value={month} onChange={e => setMonth(Number(e.target.value))} aria-label="Month">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="select" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))} aria-label="Year">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={download} disabled={downloading}>
            {downloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}PDF report
          </button>
        </>}
      />

      <Tabs value={tab} onChange={changeTab} tabs={[
        { value: 'overview', label: 'Overview', icon: BarChart3 },
        { value: 'expenses', label: 'Expenses', icon: Receipt },
        { value: 'insights', label: 'AI Insights', icon: Lightbulb }
      ]} />

      {tab === 'overview' && <Overview month={month} year={year} />}
      {visited.expenses && <div style={{ display: tab === 'expenses' ? 'contents' : 'none' }}><Expenses month={month} year={year} /></div>}
      {visited.insights && <div style={{ display: tab === 'insights' ? 'contents' : 'none' }}><Insights /></div>}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ month, year }) {
  const summary = useApi(`/payments/summary?month=${month}&year=${year}`);
  const trend = useApi('/reports/trend?months=6', { initial: [] });
  const s = summary.data;
  const cats = s ? Object.entries(s.expenseByCategory || {}).sort((a, b) => b[1] - a[1]) : [];

  return (
    <>
      {summary.loading && !s ? (
        <div className="grid-4"><SkeletonCards count={4} height={120} /></div>
      ) : s ? (
        <div className="grid-4">
          <StatCard label="Rent collected" icon={Wallet} tone="success" value={<AnimatedNumber value={s.collected} format={inr} />}
            progress={s.collectionRate} foot={`${s.collectionRate}% of ${inr(s.expected)} · ${s.paidCount} paid`} />
          <StatCard label="Pending" icon={AlertCircle} tone={s.pendingCount ? 'warning' : 'success'} value={<AnimatedNumber value={s.pending} format={inr} />}
            foot={s.pendingCount ? `${s.pendingCount} payment(s) · ${s.overdueCount} overdue` : 'Nothing outstanding'} />
          <StatCard label="Expenses" icon={Receipt} tone="info" value={<AnimatedNumber value={s.expenses} format={inr} />}
            foot={`${cats.length} categories`} />
          <StatCard label="Net profit" icon={PiggyBank} tone={s.profit >= 0 ? 'brand' : 'danger'} value={<AnimatedNumber value={s.profit} format={inr} />}
            foot={s.collected ? `${Math.round((s.profit / Math.max(1, s.collected)) * 100)}% margin` : s.label} />
        </div>
      ) : (
        <Card><EmptyState title="Couldn't load this month" message={summary.error} /></Card>
      )}

      <div className="grid-main">
        <Card title="Six-month trend" subtitle="Rent collected, expenses and profit" icon={TrendingUp}>
          {trend.loading && !trend.data?.length ? <Skeleton height={260} /> : (
            <BarChart data={trend.data || []} series={[
              { key: 'income', label: 'Collected', color: 'var(--brand)' },
              { key: 'expenses', label: 'Expenses', color: '#f2a65a' },
              { key: 'profit', label: 'Profit', color: '#0f766e' }
            ]} />
          )}
        </Card>
        <Card title="Where the money went" subtitle={s ? `${MONTHS[month - 1]} ${year}` : ''} icon={Receipt}>
          {summary.loading && !s ? <Skeleton height={220} /> : cats.length ? (
            <HBars items={cats.map(([c, v]) => ({ label: titleCase(c), value: v, display: inr(v), color: catColor(c) }))} />
          ) : (
            <EmptyState icon={Receipt} title="No expenses recorded" message="Add expenses in the Expenses tab." />
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- Expenses ---------------- */
const emptyForm = () => ({ category: 'food', amount: '', date: new Date().toISOString().slice(0, 10), description: '', vendorName: '' });

function Expenses({ month, year }) {
  const toast = useToast();
  const list = useApi(`/expenses?month=${month}&year=${year}`, { transform: res => res, initial: { data: [], total: 0 } });
  const predictions = useApi('/expenses/predictions');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const expenses = list.data?.data || [];

  const save = async (e) => {
    e.preventDefault();
    if (!(Number(form.amount) > 0)) return toast('Enter an amount greater than zero', 'error');
    setSaving(true);
    try {
      const body = { ...form, amount: Number(form.amount) };
      if (form._id) await api.put(`/expenses/${form._id}`, body);
      else await api.post('/expenses', body);
      toast(form._id ? 'Expense updated' : 'Expense added');
      setForm(null);
      list.reload({ silent: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.del(`/expenses/${toDelete._id}`);
      toast('Expense deleted');
      setToDelete(null);
      list.reload({ silent: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const pred = predictions.data;
  const predCats = pred ? Object.entries(pred.byCategory || {}).sort((a, b) => b[1].predictedNextMonth - a[1].predictedNextMonth) : [];
  const TrendIcon = { increasing: TrendingUp, decreasing: TrendingDown, stable: Minus };

  return (
    <div className="grid-main">
      <Card title={`Expenses · ${MONTHS[month - 1]} ${year}`} subtitle={`${expenses.length} entries · total ${inr(list.data?.total)}`} icon={Receipt}
        bodyClass="card-body" actions={<button className="btn btn-primary btn-sm" onClick={() => setForm(emptyForm())}><Plus size={15} />Add expense</button>}>
        {list.loading && !expenses.length ? (
          <div className="stack">{[0, 1, 2, 3].map(i => <Skeleton key={i} height={40} />)}</div>
        ) : expenses.length ? (
          <div className="table-wrap" style={{ margin: '0 -20px -20px' }}>
            <table className="table">
              <thead><tr><th>Date</th><th>Category</th><th>Details</th><th className="num">Amount</th><th /></tr></thead>
              <tbody>
                {expenses.map(x => (
                  <tr key={x._id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(x.date, { day: 'numeric', month: 'short' })}</td>
                    <td><span className="row-sm"><i style={{ width: 8, height: 8, borderRadius: 2, background: catColor(x.category), display: 'inline-block' }} /><span className="bold">{titleCase(x.category)}</span></span></td>
                    <td><div className="small ellipsis" style={{ maxWidth: 260 }}>{x.description || '—'}</div>{x.vendorName && <div className="tiny faint">{x.vendorName}</div>}</td>
                    <td className="num bold">{inr(x.amount)}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-icon btn-xs" title="Edit" onClick={() => setForm({ ...x, date: new Date(x.date).toISOString().slice(0, 10), vendorName: x.vendorName || '', description: x.description || '' })}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-icon btn-xs" title="Delete" onClick={() => setToDelete(x)}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Receipt} title="No expenses this month" message="Track groceries, bills and salaries to see your real profit."
            action={<button className="btn btn-soft btn-sm" onClick={() => setForm(emptyForm())}><Plus size={14} />Add the first one</button>} />
        )}
      </Card>

      <Card title="Next month forecast" subtitle="Based on the last 6 months" icon={Sparkles}>
        {predictions.loading && !pred ? (
          <div className="stack"><Skeleton height={34} width="60%" />{[0, 1, 2, 3].map(i => <Skeleton key={i} height={22} />)}</div>
        ) : pred && predCats.length ? (
          <div className="stack">
            <div>
              <div className="stat-value">{inr(pred.totalPredictedNextMonth)}</div>
              <div className="small muted">expected total spend</div>
            </div>
            <div className="list">
              {predCats.map(([c, p]) => {
                const I = TrendIcon[p.trend] || Minus;
                return (
                  <div key={c} className="list-item small">
                    <i style={{ width: 8, height: 8, borderRadius: 2, background: catColor(c), display: 'inline-block' }} />
                    <span className="grow bold">{titleCase(c)}</span>
                    <I size={14} className={p.trend === 'increasing' ? 'text-danger' : p.trend === 'decreasing' ? 'text-success' : 'faint'} />
                    <span className="mono">{inr(p.predictedNextMonth)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="Not enough history yet" message="Add a few months of expenses to get a forecast." />
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit expense' : 'Add expense'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="expense-form" disabled={saving}>{saving && <Loader2 size={16} className="spin" />}Save</button>
        </>}>
        {form && (
          <form id="expense-form" className="form-grid" onSubmit={save}>
            <Field label="Category">
              <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{titleCase(c)}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)">
              <input className="input" type="number" min="1" step="1" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 3500" autoFocus />
            </Field>
            <Field label="Date">
              <input className="input" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Vendor / paid to">
              <input className="input" value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} placeholder="Optional" />
            </Field>
            <Field label="Description" className="span-2">
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly groceries" />
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} busy={deleting}
        title="Delete this expense?" confirmLabel="Delete"
        message={toDelete ? `${titleCase(toDelete.category)} · ${inr(toDelete.amount)} on ${formatDate(toDelete.date)}. This can't be undone.` : ''} />
    </div>
  );
}

/* ---------------- AI insights ---------------- */
function Insights() {
  const revenue = useApi('/reports/revenue-optimization');
  const occupancy = useApi('/reports/occupancy-prediction');
  const rent = useApi('/payments/predictions');

  const loadingBlock = (label) => (
    <div className="stack">
      <span className="row-sm small muted"><Loader2 size={14} className="spin" />{label}</span>
      {[0, 1, 2].map(i => <Skeleton key={i} height={20} width={`${90 - i * 12}%`} />)}
    </div>
  );

  const rv = revenue.data;
  const oc = occupancy.data;
  const rp = rent.data;

  return (
    <>
      <div className="grid-2">
        <Card title="Revenue optimizer" subtitle="Pricing and vacancy suggestions" icon={TrendingUp}>
          {revenue.loading && !rv ? loadingBlock('Analysing room prices…') : rv ? (
            <div className="stack">
              {rv.estimatedRevenueIncrease > 0 && (
                <div className="callout callout-success"><TrendingUp size={18} /><span>Potential extra revenue: <b>{inr(rv.estimatedRevenueIncrease)}/month</b></span></div>
              )}
              {rv.underpricedRooms?.length > 0 && (
                <div className="stack-sm">
                  <span className="label">Rooms you could price higher</span>
                  {rv.underpricedRooms.map((r, i) => (
                    <div key={i} className="card-soft" style={{ padding: '10px 12px' }}>
                      <div className="row between">
                        <span className="bold">Room {r.roomNumber}</span>
                        <span className="small"><span className="faint" style={{ textDecoration: 'line-through' }}>{inr(r.currentRent)}</span> → <b className="text-success">{inr(r.suggestedRent)}</b></span>
                      </div>
                      {r.reason && <div className="tiny muted mt-1">{r.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
              {rv.discountSuggestions?.length > 0 && (
                <div className="stack-sm">
                  <span className="label">Offers to fill vacancies</span>
                  {rv.discountSuggestions.map((d, i) => (
                    <div key={i} className="small"><Badge tone="brand">{d.discount}</Badge> <b>{d.target}</b>{d.reason && <span className="muted"> — {d.reason}</span>}</div>
                  ))}
                </div>
              )}
              {rv.generalSuggestions?.length > 0 && (
                <ul className="small" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {rv.generalSuggestions.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              )}
            </div>
          ) : <EmptyState icon={TrendingUp} title="Suggestions unavailable" message={revenue.error} />}
        </Card>

        <Card title="Occupancy forecast" subtitle="Next month" icon={BedDouble}>
          {occupancy.loading && !oc ? loadingBlock('Forecasting occupancy…') : oc ? (
            <div className="stack">
              <div className="row" style={{ gap: 24 }}>
                <div>
                  <div className="tiny faint bold">NOW</div>
                  <div className="stat-value">{oc.currentOccupancy}%</div>
                </div>
                {oc.predictedOccupancy !== undefined && (
                  <div>
                    <div className="tiny faint bold">PREDICTED</div>
                    <div className="stat-value text-brand">{Math.round(oc.predictedOccupancy)}%</div>
                  </div>
                )}
                {oc.trend && <Badge tone={oc.trend === 'increasing' ? 'success' : oc.trend === 'decreasing' ? 'danger' : 'neutral'}>{oc.trend}</Badge>}
              </div>
              {oc.movingOutSoon > 0 && <div className="small muted">{oc.movingOutSoon} resident(s) moving out in the next 30 days.</div>}
              {oc.reasoning && <p className="small muted">{oc.reasoning}</p>}
              {oc.recommendations?.length > 0 && (
                <ul className="small" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {oc.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          ) : <EmptyState icon={BedDouble} title="Forecast unavailable" message={occupancy.error} />}
        </Card>
      </div>

      <Card title="Rent payment risk" subtitle="Who is likely to pay late next month, based on history" icon={Users}
        actions={rp?.summary && (
          <div className="row-sm">
            <Badge tone="danger">{rp.summary.highRisk || 0} high</Badge>
            <Badge tone="warning">{rp.summary.mediumRisk || 0} medium</Badge>
            <Badge tone="success">{rp.summary.lowRisk || 0} low</Badge>
          </div>
        )}>
        {rent.loading && !rp ? loadingBlock('Studying payment history…') : rp?.predictions?.length ? (
          <div className="table-wrap" style={{ margin: '0 -20px -20px' }}>
            <table className="table">
              <thead><tr><th>Tenant</th><th>Room</th><th>Pattern</th><th className="num">Avg days late</th><th style={{ width: 200 }}>Late probability</th></tr></thead>
              <tbody>
                {rp.predictions.map((p, i) => {
                  const color = p.risk === 'high' ? 'var(--danger)' : p.risk === 'medium' ? 'var(--warning)' : 'var(--success)';
                  return (
                    <tr key={i}>
                      <td className="bold">{p.tenantName}</td>
                      <td>{p.roomNumber || '—'}</td>
                      <td><Badge tone={p.risk === 'high' ? 'danger' : p.risk === 'medium' ? 'warning' : 'success'}>{p.behavior}</Badge></td>
                      <td className="num">{p.averageDaysLate}</td>
                      <td>
                        <div className="row-sm">
                          <div className="progress grow"><span style={{ width: `${p.lateProbability}%`, background: color }} /></div>
                          <span className="tiny bold mono" style={{ width: 34, textAlign: 'right' }}>{p.lateProbability}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={Users} title="No prediction data" message={rent.error || 'Payment history will appear here.'} />}
      </Card>
    </>
  );
}
