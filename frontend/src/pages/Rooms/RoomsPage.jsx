import React, { useMemo, useState } from 'react';
import { Search, Sparkles, Plus, Pencil, Trash2, BedDouble, Phone, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Badge, Modal, Drawer, ConfirmDialog, EmptyState, SkeletonCards, Field, Avatar } from '../../components/ui';
import Markdown from '../../components/AIChat/Markdown';
import { inr, titleCase } from '../../utils/format';

const IMAGES = ['/images/pg_1.webp', '/images/pg_2.avif', '/images/pg_3.avif', '/images/pg_4.webp'];
const CAPACITY = { single: 1, double: 2, triple: 3, dormitory: 6 };
const FEATURES = [
  ['hasAC', 'AC'], ['hasAttachedBathroom', 'Attached bath'], ['hasBalcony', 'Balcony'], ['hasParking', 'Parking'],
  ['hasWifi', 'WiFi'], ['hasTv', 'TV'], ['hasGeyser', 'Geyser']
];
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Has free beds' },
  { value: 'ac', label: 'AC' },
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' }
];

const EMPTY_FORM = {
  roomNumber: '', floor: 1, type: 'double', rent: '', deposit: '', maxOccupants: 2,
  genderPreference: 'any', furnishing: 'semi-furnished', hasAC: false, hasAttachedBathroom: false,
  hasBalcony: false, hasParking: false, hasWifi: true, hasTv: false, hasGeyser: false, description: '', status: 'auto'
};

const freeBeds = (r) => r.maxOccupants - (r.currentOccupants?.length || 0);
const imageFor = (r, i) => IMAGES[(parseInt(r.roomNumber, 10) || i) % IMAGES.length];

export default function RoomsPage() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const { data: rooms = [], loading, reload } = useApi('/rooms', { initial: [] });

  const [filter, setFilter] = useState('all');
  const [floor, setFloor] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const floors = useMemo(() => [...new Set((rooms || []).map(r => r.floor))].sort((a, b) => a - b), [rooms]);

  const visible = useMemo(() => (rooms || []).filter(r => {
    if (aiResult && !aiResult.numbers.includes(r.roomNumber)) return false;
    if (floor && String(r.floor) !== floor) return false;
    if (filter === 'free') return freeBeds(r) > 0 && r.status !== 'maintenance';
    if (filter === 'ac') return r.hasAC;
    if (['single', 'double', 'triple'].includes(filter)) return r.type === filter;
    return true;
  }), [rooms, filter, floor, aiResult]);

  const summary = useMemo(() => {
    const beds = (rooms || []).reduce((s, r) => s + r.maxOccupants, 0);
    const used = (rooms || []).reduce((s, r) => s + (r.currentOccupants?.length || 0), 0);
    return { rooms: rooms?.length || 0, beds, vacant: beds - used };
  }, [rooms]);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.post('/ai/chat', { message: `Find rooms: ${query}`, sessionId: 'rooms-search' });
      const card = res.cards?.find(c => c.type === 'rooms');
      const list = Array.isArray(card?.data) ? card.data : card?.data ? [card.data] : [];
      setAiResult({ text: res.response, numbers: list.map(r => r.roomNumber) });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => { setAiResult(null); setQuery(''); };

  const openEdit = (room) => {
    setSelected(null);
    setForm(room ? {
      ...EMPTY_FORM,
      ...Object.fromEntries(Object.keys(EMPTY_FORM).map(k => [k, room[k] ?? EMPTY_FORM[k]])),
      status: ['maintenance', 'reserved'].includes(room.status) ? room.status : 'auto',
      _id: room._id
    } : { ...EMPTY_FORM });
  };

  const setF = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'type') next.maxOccupants = CAPACITY[v] || 1;
    return next;
  });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, rent: Number(form.rent), deposit: form.deposit === '' ? Number(form.rent) : Number(form.deposit), floor: Number(form.floor), maxOccupants: Number(form.maxOccupants) };
      delete body._id;
      if (body.status === 'auto') body.status = 'available';
      if (form._id) {
        await api.put(`/rooms/${form._id}`, body);
        toast(`Room ${form.roomNumber} updated`);
      } else {
        delete body.status;
        await api.post('/rooms', body);
        toast(`Room ${form.roomNumber} added`);
      }
      setForm(null);
      reload({ silent: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/rooms/${toDelete._id}`);
      toast(`Room ${toDelete.roomNumber} deleted`);
      setToDelete(null);
      setSelected(null);
      reload({ silent: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={isOwner ? 'Rooms & Beds' : 'Rooms'}
        subtitle={`${summary.rooms} rooms · ${summary.beds} beds · ${summary.vacant} vacant`}
        actions={isOwner && <button className="btn btn-primary" onClick={() => openEdit(null)}><Plus size={16} />Add room</button>}
      />

      <form className="card searchbar" onSubmit={runSearch}>
        <Sparkles size={18} className="text-brand" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Try "AC room under ₹8000 on 2nd floor" or "double sharing for girls"' aria-label="Search rooms with AI" />
        {aiResult && <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}><X size={14} />Clear</button>}
        <button className="btn btn-primary" disabled={searching || !query.trim()}>
          {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}Search
        </button>
      </form>

      {aiResult && (
        <div className="callout callout-brand">
          <Sparkles size={18} className="text-brand" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="grow"><Markdown text={aiResult.text} /></div>
          <button className="btn btn-ghost btn-sm" onClick={clearSearch}>Clear</button>
        </div>
      )}

      <div className="row wrap between">
        <div className="row wrap" style={{ gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.value} className={`chip ${filter === f.value ? 'active' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>
          ))}
        </div>
        <select className="select" style={{ width: 150 }} value={floor} onChange={e => setFloor(e.target.value)} aria-label="Floor">
          <option value="">All floors</option>
          {floors.map(f => <option key={f} value={String(f)}>Floor {f}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid-auto"><SkeletonCards count={6} height={300} /></div>
      ) : !visible.length ? (
        <div className="card"><EmptyState icon={BedDouble} title="No rooms match" message="Try a different filter or clear the search." action={(aiResult || filter !== 'all' || floor) && <button className="btn btn-secondary btn-sm" onClick={() => { clearSearch(); setFilter('all'); setFloor(''); }}>Reset filters</button>} /></div>
      ) : (
        <div className="grid-auto">
          {visible.map((r, i) => {
            const free = freeBeds(r);
            const occupants = r.currentOccupants || [];
            return (
              <article key={r._id} className="card card-hover" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => setSelected(r)}>
                <div className="room-img">
                  <img src={imageFor(r, i)} alt={`Room ${r.roomNumber}`} loading="lazy" />
                  <Badge status={r.status} dot />
                  <span className="room-img-price">{inr(r.rent)}<span style={{ fontWeight: 500, fontSize: '0.75rem' }}>/mo</span></span>
                </div>
                <div className="card-body stack" style={{ paddingTop: 14 }}>
                  <div className="row between">
                    <div>
                      <h3 style={{ fontSize: '1.08rem', fontWeight: 800 }}>Room {r.roomNumber}</h3>
                      <div className="small muted capitalize">Floor {r.floor} · {r.type} sharing{r.genderPreference !== 'any' ? ` · ${r.genderPreference}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="bed-dots" style={{ justifyContent: 'flex-end' }}>
                        {Array.from({ length: r.maxOccupants }).map((_, k) => <span key={k} className={`bed-dot ${k < occupants.length ? 'filled' : ''}`} />)}
                      </div>
                      <div className={`tiny bold mt-1 ${free > 0 ? 'text-success' : 'faint'}`}>{free > 0 ? `${free} bed${free > 1 ? 's' : ''} free` : 'Full'}</div>
                    </div>
                  </div>
                  <div className="row wrap" style={{ gap: 5 }}>
                    {FEATURES.filter(([k]) => r[k]).map(([k, label]) => <span key={k} className="feature-tag">{label}</span>)}
                  </div>
                  <div className="small faint" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {isOwner
                      ? (occupants.length ? occupants.map(o => o.name).join(', ') : 'No occupants')
                      : `${occupants.length} of ${r.maxOccupants} beds taken`}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Room ${selected.roomNumber}` : ''}
        subtitle={selected && <span className="capitalize">Floor {selected.floor} · {selected.type} sharing · {selected.furnishing?.replace('-', ' ')}</span>}
        footer={isOwner && selected && <>
          <button className="btn btn-ghost" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={() => setToDelete(selected)}><Trash2 size={16} />Delete</button>
          <button className="btn btn-primary" onClick={() => openEdit(selected)}><Pencil size={16} />Edit room</button>
        </>}
      >
        {selected && (
          <div className="stack-lg">
            <div className="room-img" style={{ borderRadius: 'var(--radius-lg)', height: 200 }}>
              <img src={imageFor(selected, 0)} alt="" />
              <Badge status={selected.status} dot />
            </div>
            <div className="grid-2">
              <div className="card-soft" style={{ padding: 14 }}><div className="tiny faint bold">Rent / bed</div><div className="strong" style={{ fontSize: '1.2rem' }}>{inr(selected.rent)}</div></div>
              <div className="card-soft" style={{ padding: 14 }}><div className="tiny faint bold">Deposit</div><div className="strong" style={{ fontSize: '1.2rem' }}>{inr(selected.deposit)}</div></div>
              <div className="card-soft" style={{ padding: 14 }}><div className="tiny faint bold">Beds</div><div className="strong" style={{ fontSize: '1.2rem' }}>{selected.currentOccupants?.length || 0} / {selected.maxOccupants}</div></div>
              <div className="card-soft" style={{ padding: 14 }}><div className="tiny faint bold">For</div><div className="strong capitalize" style={{ fontSize: '1.2rem' }}>{selected.genderPreference === 'any' ? 'Anyone' : selected.genderPreference}</div></div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Amenities</div>
              <div className="row wrap" style={{ gap: 6 }}>
                {FEATURES.filter(([k]) => selected[k]).map(([k, l]) => <span key={k} className="feature-tag">{l}</span>)}
                {!FEATURES.some(([k]) => selected[k]) && <span className="faint small">Basic room</span>}
              </div>
            </div>
            {selected.description && <p className="muted">{selected.description}</p>}
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Occupants</div>
              {!selected.currentOccupants?.length && <div className="faint small">Nobody lives here yet.</div>}
              <div className="list">
                {(selected.currentOccupants || []).map(o => (
                  <div key={o._id} className="list-item">
                    <Avatar name={o.name} size="sm" />
                    <span className="grow bold">{isOwner ? o.name : o.name?.split(' ')[0]}</span>
                    {isOwner && o.phone && <a className="btn btn-secondary btn-xs" href={`tel:${o.phone}`}><Phone size={12} />{o.phone}</a>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?._id ? `Edit room ${form.roomNumber}` : 'Add a room'}
        size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn btn-primary" form="room-form" disabled={saving}>{saving && <Loader2 size={16} className="spin" />}{form?._id ? 'Save changes' : 'Add room'}</button>
        </>}
      >
        {form && (
          <form id="room-form" className="form-grid" onSubmit={save}>
            <Field label="Room number"><input className="input" required value={form.roomNumber} onChange={e => setF('roomNumber', e.target.value)} placeholder="e.g. 204" /></Field>
            <Field label="Floor"><input className="input" type="number" min="0" required value={form.floor} onChange={e => setF('floor', e.target.value)} /></Field>
            <Field label="Sharing type">
              <select className="select" value={form.type} onChange={e => setF('type', e.target.value)}>
                {Object.keys(CAPACITY).map(t => <option key={t} value={t}>{titleCase(t)}</option>)}
              </select>
            </Field>
            <Field label="Beds (capacity)"><input className="input" type="number" min="1" max="12" required value={form.maxOccupants} onChange={e => setF('maxOccupants', e.target.value)} /></Field>
            <Field label="Rent per bed (₹/month)"><input className="input" type="number" min="0" required value={form.rent} onChange={e => setF('rent', e.target.value)} /></Field>
            <Field label="Deposit (₹)" hint="Defaults to one month's rent"><input className="input" type="number" min="0" value={form.deposit} onChange={e => setF('deposit', e.target.value)} /></Field>
            <Field label="For">
              <select className="select" value={form.genderPreference} onChange={e => setF('genderPreference', e.target.value)}>
                <option value="any">Anyone</option><option value="male">Men</option><option value="female">Women</option>
              </select>
            </Field>
            <Field label="Furnishing">
              <select className="select" value={form.furnishing} onChange={e => setF('furnishing', e.target.value)}>
                <option value="fully-furnished">Fully furnished</option><option value="semi-furnished">Semi furnished</option><option value="unfurnished">Unfurnished</option>
              </select>
            </Field>
            {form._id && (
              <Field label="Status" className="span-2" hint="Auto = based on occupancy">
                <select className="select" value={form.status} onChange={e => setF('status', e.target.value)}>
                  <option value="auto">Auto</option><option value="maintenance">Under maintenance</option><option value="reserved">Reserved</option>
                </select>
              </Field>
            )}
            <div className="span-2">
              <div className="label" style={{ marginBottom: 8 }}>Amenities</div>
              <div className="row wrap" style={{ gap: 16 }}>
                {FEATURES.map(([k, l]) => (
                  <label key={k} className="check"><input type="checkbox" checked={!!form[k]} onChange={e => setF(k, e.target.checked)} />{l}</label>
                ))}
              </div>
            </div>
            <Field label="Description" className="span-2"><textarea className="textarea" rows={3} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Sunny corner room with a balcony…" /></Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete room ${toDelete?.roomNumber}?`}
        message="This can't be undone. Rooms with tenants must be emptied first."
        confirmLabel="Delete room"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
