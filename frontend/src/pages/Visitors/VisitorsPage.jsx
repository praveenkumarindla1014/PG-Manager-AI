import React, { useState } from 'react';
import { DoorOpen, UserPlus, Check, X, LogOut, Phone, Clock, Users, Info, Loader2, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Badge, Modal, EmptyState, Skeleton, Field, Avatar, Tabs, ConfirmDialog } from '../../components/ui';
import { formatDate, formatTime, titleCase } from '../../utils/format';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMPTY = { name: '', phone: '', purpose: '', numberOfGuests: 1, idProofType: 'aadhaar', idProofNumber: '', vehicleNumber: '', tenantVisiting: '' };

export default function VisitorsPage() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(isOwner ? 'today' : 'all');
  const endpoint = !isOwner || tab === 'all' ? '/visitors' : tab === 'pending' ? '/visitors?status=pending' : `/visitors?date=${todayISO()}`;
  const { data: visitors = [], loading, reload } = useApi(endpoint, { initial: [] });
  const { data: pending = [], reload: reloadPending } = useApi(isOwner ? '/visitors?status=pending' : null, { initial: [] });
  const { data: tenants = [] } = useApi(isOwner ? '/tenants' : null, { initial: [] });

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [cancel, setCancel] = useState(null);

  const refresh = () => { reload({ silent: true }); if (isOwner) reloadPending({ silent: true }); };

  const act = async (v, action) => {
    setBusyId(v._id);
    try {
      await api.put(`/visitors/${v._id}`, { action });
      toast(action === 'approve' ? `${v.name} let in` : action === 'reject' ? `${v.name} turned away` : `${v.name} checked out`);
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, numberOfGuests: Number(form.numberOfGuests) || 1 };
      if (!isOwner) { delete body.idProofType; delete body.idProofNumber; delete body.vehicleNumber; delete body.tenantVisiting; }
      Object.keys(body).forEach(k => body[k] === '' && delete body[k]);
      await api.post('/visitors', body);
      toast(isOwner ? `${form.name} checked in` : `${form.name} is pre-registered — the gate will be informed`);
      setForm(null);
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    try {
      await api.del(`/visitors/${cancel._id}`);
      toast('Visit cancelled');
      setCancel(null);
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const list = visitors || [];
  const inside = list.filter(v => v.status === 'approved' && !v.checkOut).length;

  return (
    <div className="page">
      <PageHeader
        title={isOwner ? 'Visitors' : 'My visitors'}
        subtitle={isOwner ? 'Gate register — approve, check in and check out guests' : 'Let the gate know when someone is coming to see you'}
        actions={<button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}><UserPlus size={16} />{isOwner ? 'Log visitor' : 'Expecting a guest?'}</button>}
      />

      <div className="callout callout-info">
        <Info size={18} className="text-brand" style={{ flexShrink: 0, color: 'var(--info)' }} />
        <div className="small"><b>Visiting hours are 10 AM – 8 PM.</b> Overnight stays aren't allowed and every visitor signs the gate register{isOwner ? '' : '. Pre-registering your guest makes their entry quicker'}.</div>
      </div>

      {isOwner && (
        <div className="row wrap between">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'today', label: 'Today', icon: Clock },
            { value: 'pending', label: 'Awaiting approval', count: pending?.length || 0 },
            { value: 'all', label: 'All' }
          ]} />
          {tab === 'today' && <span className="small muted"><b>{list.length}</b> today · <b>{inside}</b> inside now</span>}
        </div>
      )}

      {loading ? (
        <div className="grid-auto">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={150} style={{ borderRadius: 18 }} />)}</div>
      ) : !list.length ? (
        <div className="card">
          <EmptyState
            icon={DoorOpen}
            title={tab === 'pending' ? 'No one waiting at the gate' : 'No visitors yet'}
            message={isOwner ? 'Visitors logged at the gate or pre-registered by residents will appear here.' : 'Pre-register a friend or family member so they get in smoothly.'}
            action={<button className="btn btn-soft btn-sm" onClick={() => setForm({ ...EMPTY })}><UserPlus size={14} />{isOwner ? 'Log visitor' : 'Add a guest'}</button>}
          />
        </div>
      ) : (
        <div className="grid-auto">
          {list.map(v => (
            <article key={v._id} className="card card-body stack" style={{ paddingTop: 18 }}>
              <div className="row">
                <Avatar name={v.name} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="bold ellipsis">{v.name}{v.numberOfGuests > 1 && <span className="faint small"> +{v.numberOfGuests - 1}</span>}</div>
                  <div className="small muted ellipsis">{v.purpose}</div>
                </div>
                <Badge status={v.status} dot />
              </div>
              <div className="stack-sm small muted">
                {(v.tenantVisiting?.name || v.roomVisiting) && (
                  <div className="row-sm"><Users size={14} />Visiting {v.tenantVisiting?.name || 'resident'}{v.roomVisiting ? ` · Room ${v.roomVisiting}` : ''}</div>
                )}
                <div className="row-sm"><Clock size={14} />{formatDate(v.checkIn, { day: 'numeric', month: 'short' })}, {formatTime(v.checkIn)}{v.checkOut ? ` → ${formatTime(v.checkOut)}` : ''}</div>
                {isOwner && v.phone && v.phone !== 'Not provided' && <div className="row-sm"><Phone size={14} /><a href={`tel:${v.phone}`}>{v.phone}</a></div>}
                {isOwner && v.idProofType && <div className="row-sm"><Info size={14} />{titleCase(v.idProofType)}{v.idProofNumber ? ` · ${v.idProofNumber}` : ''}</div>}
                {isOwner && v.vehicleNumber && <div className="row-sm"><Car size={14} />{v.vehicleNumber}</div>}
              </div>
              {isOwner && v.status === 'pending' && (
                <div className="row">
                  <button className="btn btn-success btn-sm grow" disabled={busyId === v._id} onClick={() => act(v, 'approve')}><Check size={15} />Approve</button>
                  <button className="btn btn-secondary btn-sm grow" disabled={busyId === v._id} onClick={() => act(v, 'reject')}><X size={15} />Reject</button>
                </div>
              )}
              {isOwner && v.status === 'approved' && !v.checkOut && (
                <button className="btn btn-secondary btn-sm" disabled={busyId === v._id} onClick={() => act(v, 'check-out')}><LogOut size={15} />Check out</button>
              )}
              {!isOwner && v.status === 'pending' && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setCancel(v)}><X size={15} />Cancel visit</button>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={isOwner ? 'Log a visitor' : 'Pre-register a guest'}
        subtitle={isOwner ? 'Visitors you log are checked in straight away.' : "The owner will approve them when they arrive."}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn btn-primary" form="visitor-form" disabled={saving}>{saving && <Loader2 size={16} className="spin" />}{isOwner ? 'Check in' : 'Pre-register'}</button>
        </>}
      >
        {form && (
          <form id="visitor-form" className="form-grid" onSubmit={submit}>
            <Field label="Visitor name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Purpose" className="span-2"><input className="input" required value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder={isOwner ? 'e.g. Room enquiry, meeting son' : 'e.g. Mom visiting, friend dropping books'} /></Field>
            <Field label="Number of people"><input className="input" type="number" min="1" max="10" value={form.numberOfGuests} onChange={e => setForm({ ...form, numberOfGuests: e.target.value })} /></Field>
            {isOwner && (
              <>
                <Field label="Visiting">
                  <select className="select" value={form.tenantVisiting} onChange={e => setForm({ ...form, tenantVisiting: e.target.value })}>
                    <option value="">Office / enquiry</option>
                    {(tenants || []).map(t => <option key={t._id} value={t._id}>{t.name}{t.roomId ? ` · Room ${t.roomId.roomNumber}` : ''}</option>)}
                  </select>
                </Field>
                <Field label="ID proof">
                  <select className="select" value={form.idProofType} onChange={e => setForm({ ...form, idProofType: e.target.value })}>
                    <option value="aadhaar">Aadhaar</option><option value="pan">PAN</option><option value="driving-license">Driving licence</option><option value="passport">Passport</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field label="ID number"><input className="input" value={form.idProofNumber} onChange={e => setForm({ ...form, idProofNumber: e.target.value })} /></Field>
                <Field label="Vehicle number" className="span-2"><input className="input" value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="Optional" /></Field>
              </>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancel}
        title="Cancel this visit?"
        message={`${cancel?.name || 'Your guest'} will be removed from the gate list.`}
        confirmLabel="Cancel visit"
        onConfirm={doCancel}
        onClose={() => setCancel(null)}
      />
    </div>
  );
}
