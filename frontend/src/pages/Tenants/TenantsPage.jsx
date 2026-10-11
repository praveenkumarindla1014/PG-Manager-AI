import React, { useMemo, useState } from 'react';
import { Search, UserPlus, Phone, MessageCircle, Pencil, ArrowRightLeft, LogOut, ShieldCheck, ShieldAlert, ScanLine, Loader2, Copy, Check, Users, Mail, Home } from 'lucide-react';
import { useApi, useToast } from '../../context/AppContext';
import { api, fileToBase64 } from '../../services/api';
import { PageHeader, Badge, Modal, Drawer, ConfirmDialog, EmptyState, Skeleton, Field, Avatar, Tabs, Spinner } from '../../components/ui';
import { inr, formatDate, titleCase, MONTHS } from '../../utils/format';

const waLink = (phone, text = '') => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.length === 10 ? '91' + digits : digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

const EMPTY_TENANT = { name: '', email: '', phone: '', gender: 'male', age: '', address: '', aadhaarNumber: '', roomId: '', moveInDate: new Date().toISOString().slice(0, 10) };

export default function TenantsPage() {
  const toast = useToast();
  const [showPast, setShowPast] = useState(false);
  const { data: tenants = [], loading, reload } = useApi(showPast ? '/tenants?status=past' : '/tenants', { initial: [], deps: [showPast] });
  const { data: vacantRooms = [], reload: reloadRooms } = useApi('/rooms?vacant=true', { initial: [] });

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [edit, setEdit] = useState(null);
  const [move, setMove] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = tenants || [];
  const counts = {
    all: list.length,
    due: list.filter(t => ['pending', 'overdue', 'partial'].includes(t.rentStatus)).length,
    risky: list.filter(t => (t.violationScore || 0) > 0 || (t.paymentBehavior?.lateProbability || 0) >= 40).length,
    unverified: list.filter(t => !t.idVerified).length
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter(t => {
      if (q && !(t.name?.toLowerCase().includes(q) || t.phone?.includes(q) || t.roomId?.roomNumber?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q))) return false;
      if (tab === 'due') return ['pending', 'overdue', 'partial'].includes(t.rentStatus);
      if (tab === 'risky') return (t.violationScore || 0) > 0 || (t.paymentBehavior?.lateProbability || 0) >= 40;
      if (tab === 'unverified') return !t.idVerified;
      return true;
    });
  }, [list, search, tab]);

  const openProfile = async (t) => {
    setProfile({ ...t, payments: null, complaints: null });
    setProfileLoading(true);
    try {
      const res = await api.get(`/tenants/${t._id}`);
      setProfile({ ...t, ...res.data });
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshAll = () => { reload({ silent: true }); reloadRooms({ silent: true }); };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put(`/tenants/${edit._id}`, { name: edit.name, phone: edit.phone, gender: edit.gender, age: edit.age ? Number(edit.age) : undefined, address: edit.address, idVerified: edit.idVerified });
      toast('Tenant details saved');
      setEdit(null);
      if (profile?._id === res.data._id) setProfile(p => ({ ...p, ...res.data }));
      refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const doMove = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put(`/tenants/${move.tenant._id}/room`, { roomId: move.roomId });
      toast(`${move.tenant.name} moved to Room ${res.data.roomId?.roomNumber}`);
      setMove(null);
      if (profile) setProfile(p => ({ ...p, roomId: res.data.roomId }));
      refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const doCheckout = async (force = false) => {
    setBusy(true);
    try {
      await api.post(`/tenants/${checkout.tenant._id}/checkout`, force ? { force: true } : {});
      toast(`${checkout.tenant.name} checked out`);
      setCheckout(null);
      setProfile(null);
      refreshAll();
    } catch (err) {
      if (err.status === 400 && /unpaid/i.test(err.message)) setCheckout(c => ({ ...c, warning: err.message }));
      else toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Tenants"
        subtitle={showPast ? `${list.length} past residents` : `${list.length} people living here right now`}
        actions={<>
          <button className={`btn ${showPast ? 'btn-soft' : 'btn-secondary'}`} onClick={() => setShowPast(p => !p)}>{showPast ? 'Show current' : 'Past tenants'}</button>
          <button className="btn btn-primary" onClick={() => setAdding({ form: { ...EMPTY_TENANT } })}><UserPlus size={16} />Add tenant</button>
        </>}
      />

      <div className="row wrap between">
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'due', label: 'Rent due', count: counts.due },
          { value: 'risky', label: 'Risky', count: counts.risky },
          { value: 'unverified', label: 'Unverified', count: counts.unverified }
        ]} />
        <div className="input-group" style={{ width: 280, maxWidth: '100%' }}>
          <Search size={16} />
          <input className="input" placeholder="Search name, room or phone" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="card-body stack">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={44} />)}</div>
        ) : !visible.length ? (
          <EmptyState icon={Users} title={list.length ? 'No tenants match' : 'No tenants yet'} message={list.length ? 'Try another search or filter.' : 'Add your first resident to get started.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th><th>Room</th><th>Phone</th><th>Rent</th><th>Late risk</th><th>Joined</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(t => {
                  const risk = t.paymentBehavior?.lateProbability || 0;
                  return (
                    <tr key={t._id} style={{ cursor: 'pointer' }} onClick={() => openProfile(t)}>
                      <td>
                        <div className="row">
                          <Avatar name={t.name} size="sm" />
                          <div style={{ minWidth: 0 }}>
                            <div className="bold row-sm">{t.name}{t.idVerified ? <ShieldCheck size={14} className="text-success" /> : null}</div>
                            <div className="tiny faint capitalize">{titleCase(t.preferences?.occupation || '') || t.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{t.roomId ? <span className="bold">{t.roomId.roomNumber}</span> : <span className="faint">—</span>}</td>
                      <td><a href={`tel:${t.phone}`} onClick={e => e.stopPropagation()}>{t.phone}</a></td>
                      <td><Badge status={showPast ? 'closed' : t.rentStatus}>{showPast ? 'Moved out' : undefined}</Badge></td>
                      <td>
                        <span className={`bold ${risk >= 60 ? 'text-danger' : risk >= 30 ? 'text-warning' : 'text-success'}`}>{risk}%</span>
                        {t.openComplaints > 0 && <span className="tiny faint"> · {t.openComplaints} issue{t.openComplaints > 1 ? 's' : ''}</span>}
                      </td>
                      <td className="muted">{formatDate(t.moveInDate)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-sm" style={{ justifyContent: 'flex-end' }}>
                          {waLink(t.phone) && <a className="btn btn-ghost btn-icon btn-sm" href={waLink(t.phone)} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle size={16} /></a>}
                          {!showPast && <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => setEdit({ ...t })}><Pencil size={15} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Profile drawer ---------- */}
      <Drawer
        open={!!profile}
        onClose={() => setProfile(null)}
        title={profile?.name}
        subtitle={profile && <span className="row-sm wrap">{profile.roomId ? `Room ${profile.roomId.roomNumber}` : 'No room'} · joined {formatDate(profile.moveInDate)} {profile.idVerified ? <Badge tone="success">ID verified</Badge> : <Badge tone="warning">ID not verified</Badge>}</span>}
        footer={profile && profile.isActive !== false && !showPast && <>
          <button className="btn btn-ghost" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={() => setCheckout({ tenant: profile })}><LogOut size={16} />Check out</button>
          <button className="btn btn-secondary" onClick={() => setMove({ tenant: profile, roomId: '' })}><ArrowRightLeft size={16} />Move room</button>
          <button className="btn btn-primary" onClick={() => setEdit({ ...profile })}><Pencil size={16} />Edit</button>
        </>}
      >
        {profile && (
          <div className="stack-lg">
            <div className="row wrap">
              <a className="btn btn-secondary btn-sm" href={`tel:${profile.phone}`}><Phone size={14} />{profile.phone}</a>
              {waLink(profile.phone) && <a className="btn btn-whatsapp btn-sm" href={waLink(profile.phone, `Hi ${profile.name.split(' ')[0]}, `)} target="_blank" rel="noreferrer"><MessageCircle size={14} />WhatsApp</a>}
              <a className="btn btn-ghost btn-sm" href={`mailto:${profile.email}`}><Mail size={14} />Email</a>
            </div>

            <div className="grid-2">
              <Info label="Room" value={profile.roomId ? `${profile.roomId.roomNumber} · Floor ${profile.roomId.floor}` : '—'} />
              <Info label="Rent" value={profile.roomId ? inr(profile.roomId.rent) : '—'} />
              <Info label="Gender / age" value={`${titleCase(profile.gender || '—')}${profile.age ? ` · ${profile.age}` : ''}`} />
              <Info label="Occupation" value={titleCase(profile.preferences?.occupation || '—')} />
              <Info label="Late payment risk" value={`${profile.paymentBehavior?.lateProbability || 0}%`} />
              <Info label="Avg days late" value={profile.paymentBehavior?.averageDaysLate ?? 0} />
            </div>
            {profile.address && <Info label="Address" value={profile.address} />}

            {profile.preferences && (
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Lifestyle</div>
                <div className="row wrap" style={{ gap: 6 }}>
                  {[profile.preferences.foodPreference, profile.preferences.sleepTiming, profile.preferences.smokingPreference, profile.preferences.studyPreference]
                    .filter(v => v && v !== 'no-preference' && v !== 'any').map(v => <span key={v} className="feature-tag">{titleCase(v)}</span>)}
                  {(profile.preferences.interests || []).map(v => <span key={v} className="feature-tag">{titleCase(v)}</span>)}
                </div>
              </div>
            )}

            <div>
              <div className="label" style={{ marginBottom: 8 }}>Payment history</div>
              {profileLoading || !profile.payments ? <Spinner label="Loading…" /> : !profile.payments.length ? <div className="faint small">No payments yet.</div> : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table className="table">
                    <tbody>
                      {profile.payments.map(p => (
                        <tr key={p._id}>
                          <td>{MONTHS[p.month - 1]?.slice(0, 3)} {p.year}</td>
                          <td className="num bold">{inr(p.amount)}</td>
                          <td><Badge status={p.status} /></td>
                          <td className="tiny faint">{p.paidDate ? `${formatDate(p.paidDate, { day: 'numeric', month: 'short' })}${p.daysLate ? ` · ${p.daysLate}d late` : ''}` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="label" style={{ marginBottom: 8 }}>Complaints</div>
              {profile.complaints && !profile.complaints.length && <div className="faint small">No complaints raised.</div>}
              <div className="list">
                {(profile.complaints || []).map(c => (
                  <div key={c._id} className="list-item">
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="small bold ellipsis">{c.description}</div>
                      <div className="tiny faint">{titleCase(c.aiCategory)} · {formatDate(c.createdAt)}</div>
                    </div>
                    <Badge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ---------- Edit ---------- */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit?.name || ''}`}
        footer={<><button className="btn btn-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" form="edit-tenant" disabled={busy}>{busy && <Loader2 size={16} className="spin" />}Save</button></>}>
        {edit && (
          <form id="edit-tenant" className="form-grid" onSubmit={saveEdit}>
            <Field label="Full name"><input className="input" required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" required value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Gender">
              <select className="select" value={edit.gender || 'male'} onChange={e => setEdit({ ...edit, gender: e.target.value })}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </Field>
            <Field label="Age"><input className="input" type="number" min="15" max="99" value={edit.age || ''} onChange={e => setEdit({ ...edit, age: e.target.value })} /></Field>
            <Field label="Address" className="span-2"><textarea className="textarea" rows={2} value={edit.address || ''} onChange={e => setEdit({ ...edit, address: e.target.value })} /></Field>
            <label className="check span-2"><input type="checkbox" checked={!!edit.idVerified} onChange={e => setEdit({ ...edit, idVerified: e.target.checked })} />ID documents verified</label>
          </form>
        )}
      </Modal>

      {/* ---------- Move room ---------- */}
      <Modal open={!!move} onClose={() => setMove(null)} title={`Move ${move?.tenant?.name || ''}`} subtitle={move?.tenant?.roomId ? `Currently in Room ${move.tenant.roomId.roomNumber}` : undefined} size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setMove(null)}>Cancel</button><button className="btn btn-primary" form="move-form" disabled={busy || !move?.roomId}>{busy && <Loader2 size={16} className="spin" />}Move</button></>}>
        {move && (
          <form id="move-form" onSubmit={doMove}>
            <Field label="New room" hint="Only rooms with a free bed for this tenant are shown">
              <select className="select" required value={move.roomId} onChange={e => setMove({ ...move, roomId: e.target.value })}>
                <option value="">Choose a room…</option>
                {(vacantRooms || [])
                  .filter(r => r._id !== move.tenant.roomId?._id && (r.genderPreference === 'any' || r.genderPreference === move.tenant.gender))
                  .map(r => <option key={r._id} value={r._id}>Room {r.roomNumber} · {titleCase(r.type)} · {inr(r.rent)} · {r.maxOccupants - (r.currentOccupants?.length || 0)} free</option>)}
              </select>
            </Field>
          </form>
        )}
      </Modal>

      {/* ---------- Checkout ---------- */}
      <ConfirmDialog
        open={!!checkout}
        title={`Check out ${checkout?.tenant?.name || ''}?`}
        message={checkout?.warning ? `${checkout.warning}` : 'Their bed will be freed and their login deactivated. Payment history is kept.'}
        confirmLabel={checkout?.warning ? 'Check out anyway' : 'Check out'}
        busy={busy}
        onConfirm={() => doCheckout(!!checkout?.warning)}
        onClose={() => setCheckout(null)}
      />

      <AddTenantModal state={adding} setState={setAdding} rooms={vacantRooms || []} onDone={refreshAll} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="card-soft" style={{ padding: '10px 12px' }}>
      <div className="tiny faint bold">{label}</div>
      <div className="bold">{value}</div>
    </div>
  );
}

function AddTenantModal({ state, setState, rooms, onDone }) {
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const [ocr, setOcr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!state) return null;
  const { form, created } = state;
  const set = (k, v) => setState(s => ({ ...s, form: { ...s.form, [k]: v } }));
  const close = () => { setState(null); setOcr(null); setCopied(false); };

  const scan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setOcr(null);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await api.post('/tenants/ocr', { imageBase64 });
      const d = res.data || {};
      setOcr(d);
      if (d.error || (!d.name && !d.idNumber)) {
        toast("Couldn't read that card clearly — please fill in the details", 'error');
      } else {
        setState(s => ({
          ...s,
          form: {
            ...s.form,
            name: d.name || s.form.name,
            gender: ['male', 'female', 'other'].includes(String(d.gender).toLowerCase()) ? String(d.gender).toLowerCase() : s.form.gender,
            address: d.address || s.form.address,
            aadhaarNumber: d.idNumber || s.form.aadhaarNumber
          }
        }));
        toast('Details filled from Aadhaar');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setScanning(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, age: form.age ? Number(form.age) : undefined, roomId: form.roomId || undefined };
      if (!body.aadhaarNumber) delete body.aadhaarNumber;
      if (ocr && !ocr.error) body.extractedAadhaarData = { name: ocr.name, dob: ocr.dob, gender: ocr.gender, address: ocr.address, idNumber: ocr.idNumber };
      const res = await api.post('/tenants', body);
      toast(`${res.data.name} added`);
      setState(s => ({ ...s, created: { ...res.data, tempPassword: res.tempPassword, email: body.email } }));
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    const loginText = `Hi ${created.name.split(' ')[0]}! Welcome to the PG 🏠\n\nYour resident app login:\nEmail: ${created.email}\nPassword: ${created.tempPassword || '(the one you chose)'}\n\nOpen ${window.location.origin}/login — you can check rent, menu, raise complaints and chat with our AI assistant.`;
    return (
      <Modal open onClose={close} title="Tenant added 🎉" size="sm"
        footer={<button className="btn btn-primary" onClick={close}>Done</button>}>
        <div className="stack">
          <div className="callout callout-success">
            <div className="stack-sm">
              <div className="bold">{created.name}{created.roomId?.roomNumber ? ` · Room ${created.roomId.roomNumber}` : ''}</div>
              <div className="small">Email: <b>{created.email}</b></div>
              {created.tempPassword && <div className="small">Temporary password: <b className="mono">{created.tempPassword}</b></div>}
              <div className="tiny muted">The first month's rent due has been created automatically.</div>
            </div>
          </div>
          <div className="row wrap">
            <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(loginText); setCopied(true); }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy login details'}
            </button>
            {waLink(created.phone) && <a className="btn btn-whatsapp" href={waLink(created.phone, loginText)} target="_blank" rel="noreferrer"><MessageCircle size={16} />Send on WhatsApp</a>}
          </div>
        </div>
      </Modal>
    );
  }

  const roomOptions = rooms.filter(r => r.status !== 'maintenance' && (r.genderPreference === 'any' || r.genderPreference === form.gender));

  return (
    <Modal open onClose={close} title="Add a tenant" subtitle="Scan their Aadhaar to fill details automatically, then pick a bed." size="lg"
      footer={<><button className="btn btn-secondary" onClick={close}>Cancel</button><button className="btn btn-primary" form="add-tenant" disabled={saving}>{saving && <Loader2 size={16} className="spin" />}Add tenant</button></>}>
      <div className="stack-lg">
        <label className="card-soft row" style={{ padding: 14, cursor: scanning ? 'wait' : 'pointer', borderStyle: 'dashed' }}>
          <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand)' }}>{scanning ? <Loader2 size={17} className="spin" /> : <ScanLine size={17} />}</span>
          <span className="grow">
            <span className="bold small" style={{ display: 'block' }}>{scanning ? 'Reading the card with AI… this can take a few seconds' : 'Scan Aadhaar to auto-fill (optional)'}</span>
            <span className="tiny muted">Upload a clear photo of the front of the card</span>
          </span>
          <input type="file" accept="image/*" hidden disabled={scanning} onChange={scan} />
        </label>
        {ocr && !ocr.error && (ocr.name || ocr.idNumber) && (
          <div className="callout callout-info small">
            {ocr.isValid === false ? <ShieldAlert size={16} className="text-warning" /> : <ShieldCheck size={16} className="text-success" />}
            <span>Read with {ocr.confidence ?? '?'}% confidence{ocr.dob ? ` · DOB ${ocr.dob}` : ''}. Please double-check the details below.</span>
          </div>
        )}

        <form id="add-tenant" className="form-grid" onSubmit={submit}>
          <Field label="Full name"><input className="input" required value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Phone"><input className="input" required inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile" /></Field>
          <Field label="Email" hint="Used to log in to the resident app"><input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field>
          <div className="form-grid" style={{ gap: 10 }}>
            <Field label="Gender">
              <select className="select" value={form.gender} onChange={e => { set('gender', e.target.value); set('roomId', ''); }}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </Field>
            <Field label="Age"><input className="input" type="number" min="15" max="99" value={form.age} onChange={e => set('age', e.target.value)} /></Field>
          </div>
          <Field label="Room / bed">
            <select className="select" value={form.roomId} onChange={e => set('roomId', e.target.value)}>
              <option value="">Assign later</option>
              {roomOptions.map(r => <option key={r._id} value={r._id}>Room {r.roomNumber} · {titleCase(r.type)} · {inr(r.rent)} · {r.maxOccupants - (r.currentOccupants?.length || 0)} free</option>)}
            </select>
          </Field>
          <Field label="Move-in date"><input className="input" type="date" value={form.moveInDate} onChange={e => set('moveInDate', e.target.value)} /></Field>
          <Field label="Aadhaar number"><input className="input" value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value)} placeholder="XXXX XXXX XXXX" /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={e => set('address', e.target.value)} /></Field>
          {!roomOptions.length && <div className="span-2 callout callout-warning small"><Home size={16} />No free beds for {form.gender} residents right now — you can assign a room later.</div>}
        </form>
      </div>
    </Modal>
  );
}
