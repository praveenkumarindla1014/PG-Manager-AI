import React, { useState } from 'react';
import { UserCog, Heart, KeyRound, Palette, Loader2, Save, Users, Moon, Sun, BedDouble, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast, useTheme } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Card, Badge, Avatar, Field, EmptyState } from '../../components/ui';
import { formatDate, titleCase } from '../../utils/format';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' }
];

const PREF_OPTIONS = {
  foodPreference: ['any', 'veg', 'non-veg', 'vegan'],
  sleepTiming: ['flexible', 'early-sleeper', 'night-owl'],
  smokingPreference: ['no-preference', 'non-smoker', 'smoker'],
  noisePreference: ['no-preference', 'silent', 'moderate', 'loud'],
  studyPreference: ['no-preference', 'quiet', 'moderate'],
  occupation: ['other', 'student', 'working-professional']
};

const PREF_LABELS = {
  foodPreference: 'Food', sleepTiming: 'Sleep schedule', smokingPreference: 'Smoking',
  noisePreference: 'Noise level', studyPreference: 'Study environment', occupation: 'Occupation'
};

export default function ProfilePage() {
  const { user, setUser, isOwner } = useAuth();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="page">
      <PageHeader title="Profile & settings" subtitle="Your details, preferences and account security" />

      <div className="card card-pad row wrap" style={{ gap: 18 }}>
        <Avatar name={user?.name} size="lg" />
        <div className="grow" style={{ minWidth: 200 }}>
          <div className="display" style={{ fontSize: '1.4rem' }}>{user?.name}</div>
          <div className="row wrap small muted mt-1" style={{ gap: 14 }}>
            <span className="row-sm"><Mail size={14} />{user?.email}</span>
            {user?.phone && <span className="row-sm"><Phone size={14} />{user.phone}</span>}
            {!isOwner && user?.roomId?.roomNumber && <span className="row-sm"><BedDouble size={14} />Room {user.roomId.roomNumber} · Floor {user.roomId.floor}</span>}
          </div>
        </div>
        <div className="row-sm wrap">
          <Badge tone="brand">{isOwner ? 'Owner' : 'Resident'}</Badge>
          {!isOwner && user?.moveInDate && <Badge tone="neutral">Since {formatDate(user.moveInDate, { month: 'short', year: 'numeric' })}</Badge>}
          {!isOwner && user?.idVerified && <Badge tone="success">ID verified</Badge>}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-lg">
          <PersonalForm user={user} setUser={setUser} toast={toast} />
          <PasswordForm toast={toast} />
        </div>
        <div className="stack-lg">
          {!isOwner && <PreferencesForm user={user} setUser={setUser} toast={toast} />}
          <Card title="Appearance" icon={Palette}>
            <div className="row between">
              <div>
                <div className="bold small">Dark mode</div>
                <div className="tiny faint">Easier on the eyes at night</div>
              </div>
              <button className="btn btn-secondary" onClick={toggleTheme}>
                {theme === 'dark' ? <><Sun size={16} />Switch to light</> : <><Moon size={16} />Switch to dark</>}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PersonalForm({ user, setUser, toast }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    gender: user?.gender || 'male',
    age: user?.age || '',
    address: user?.address || '',
    preferredLanguage: user?.preferredLanguage || 'en'
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Name cannot be empty', 'error');
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { ...form, age: form.age ? Number(form.age) : undefined });
      setUser(res.data);
      toast('Profile updated');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Personal details" icon={UserCog}>
      <form className="stack" onSubmit={save}>
        <div className="form-grid">
          <Field label="Full name"><input className="input" value={form.name} onChange={set('name')} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" /></Field>
          <Field label="Gender">
            <select className="select" value={form.gender} onChange={set('gender')}>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Age"><input className="input" type="number" min="15" max="100" value={form.age} onChange={set('age')} /></Field>
          <Field label="Home address" className="span-2"><input className="input" value={form.address} onChange={set('address')} placeholder="City, State" /></Field>
          <Field label="Preferred language" className="span-2" hint="Used for notices and the AI assistant.">
            <select className="select" value={form.preferredLanguage} onChange={set('preferredLanguage')}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
        </div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Save changes</button>
      </form>
    </Card>
  );
}

function PreferencesForm({ user, setUser, toast }) {
  const p = user?.preferences || {};
  const [prefs, setPrefs] = useState({
    foodPreference: p.foodPreference || 'any',
    sleepTiming: p.sleepTiming || 'flexible',
    smokingPreference: p.smokingPreference || 'no-preference',
    noisePreference: p.noisePreference || 'no-preference',
    studyPreference: p.studyPreference || 'no-preference',
    occupation: p.occupation || 'other',
    cleanlinessLevel: p.cleanlinessLevel || 3,
    interests: (p.interests || []).join(', ')
  });
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState(null);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        preferences: {
          ...p,
          ...prefs,
          cleanlinessLevel: Number(prefs.cleanlinessLevel),
          interests: prefs.interests.split(',').map(s => s.trim()).filter(Boolean)
        }
      });
      setUser(res.data);
      toast('Preferences saved');
      return true;
    } catch (e) {
      toast(e.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const findMatches = async () => {
    setMatching(true);
    try {
      const res = await api.post('/tenants/match-roommate', {});
      setMatches(res.data?.matches || []);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setMatching(false);
    }
  };

  return (
    <Card title="Lifestyle preferences" icon={Heart} subtitle="Helps us find roommates you'll get along with">
      <div className="stack">
        <div className="form-grid">
          {Object.entries(PREF_OPTIONS).map(([key, opts]) => (
            <Field key={key} label={PREF_LABELS[key]}>
              <select className="select" value={prefs[key]} onChange={e => setPrefs(s => ({ ...s, [key]: e.target.value }))}>
                {opts.map(o => <option key={o} value={o}>{titleCase(o)}</option>)}
              </select>
            </Field>
          ))}
          <Field label={`Cleanliness: ${prefs.cleanlinessLevel}/5`} className="span-2" hint="1 = relaxed, 5 = spotless">
            <input type="range" min="1" max="5" value={prefs.cleanlinessLevel} onChange={e => setPrefs(s => ({ ...s, cleanlinessLevel: e.target.value }))} style={{ accentColor: 'var(--brand)' }} />
          </Field>
          <Field label="Interests" className="span-2" hint="Comma separated, e.g. cricket, coding, music">
            <input className="input" value={prefs.interests} onChange={e => setPrefs(s => ({ ...s, interests: e.target.value }))} />
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={async () => { if (await save()) findMatches(); }} disabled={saving || matching}>
            {matching ? <Loader2 size={16} className="spin" /> : <Users size={16} />}Find compatible roommates
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Save</button>
        </div>

        {matches && (
          matches.length === 0 ? (
            <EmptyState icon={Users} title="No matches yet" message="Fill in more preferences and try again." />
          ) : (
            <div className="stack-sm">
              <span className="label">Best matches</span>
              {matches.slice(0, 5).map((m, i) => (
                <div key={i} className="card-soft row" style={{ padding: 12, alignItems: 'flex-start' }}>
                  <Avatar name={m.tenant?.name} size="sm" />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between">
                      <span className="bold small">{m.tenant?.name}{m.tenant?.roomNumber && <span className="faint"> · Room {m.tenant.roomNumber}</span>}</span>
                      <Badge tone={m.compatibilityScore >= 60 ? 'success' : m.compatibilityScore >= 35 ? 'info' : 'neutral'}>{m.compatibilityScore}% match</Badge>
                    </div>
                    <div className="tiny muted">{[titleCase(m.tenant?.occupation || ''), titleCase(m.tenant?.sleepTiming || '')].filter(Boolean).join(' · ')}</div>
                    {m.reasons?.length > 0 && (
                      <div className="row wrap mt-1" style={{ gap: 4 }}>
                        {m.reasons.map(r => <span key={r} className="feature-tag">{r}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Card>
  );
}

function PasswordForm({ toast }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) return toast('New password must be at least 6 characters', 'error');
    if (form.newPassword !== form.confirm) return toast("New passwords don't match", 'error');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast('Password updated');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Change password" icon={KeyRound}>
      <form className="stack" onSubmit={save}>
        <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} /></Field>
        <div className="form-grid">
          <Field label="New password"><input className="input" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} /></Field>
          <Field label="Confirm new password"><input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
        </div>
        <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} disabled={saving || !form.currentPassword || !form.newPassword}>
          {saving && <Loader2 size={16} className="spin" />}Update password
        </button>
      </form>
    </Card>
  );
}
