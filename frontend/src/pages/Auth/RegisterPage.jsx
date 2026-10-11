import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', gender: 'female', age: '', occupation: 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '').slice(-10))) return setError('Please enter a valid 10-digit phone number.');
    setBusy(true);
    setError('');
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        gender: form.gender,
        age: form.age ? Number(form.age) : undefined,
        preferences: { occupation: form.occupation }
      });
      navigate(user.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Join your PG"
      subtitle="Create a resident account. Your owner will assign your room."
      footer={<>Already have an account? <Link to="/login" className="bold">Sign in</Link></>}
    >
      <form className="form-grid" onSubmit={submit}>
        <label className="field span-2">
          <span className="label">Full name</span>
          <input className="input" required value={form.name} onChange={set('name')} placeholder="Priya Sharma" autoFocus />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input className="input" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span className="label">Phone</span>
          <input className="input" type="tel" required value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
        </label>
        <label className="field">
          <span className="label">Gender</span>
          <select className="select" value={form.gender} onChange={set('gender')}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Age</span>
          <input className="input" type="number" min="16" max="80" value={form.age} onChange={set('age')} placeholder="22" />
        </label>
        <label className="field span-2">
          <span className="label">I am a</span>
          <div className="tabs" style={{ width: '100%' }}>
            {[['student', 'Student'], ['working-professional', 'Working professional'], ['other', 'Other']].map(([v, l]) => (
              <button type="button" key={v} className={`tab ${form.occupation === v ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setForm(f => ({ ...f, occupation: v }))}>{l}</button>
            ))}
          </div>
        </label>
        <label className="field span-2">
          <span className="label">Password</span>
          <input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="At least 6 characters" autoComplete="new-password" />
        </label>

        {error && <div className="callout callout-danger small span-2">{error}</div>}

        <button className="btn btn-primary btn-lg btn-block span-2" disabled={busy}>
          {busy && <Loader2 size={18} className="spin" />} Create account
        </button>
      </form>
    </AuthLayout>
  );
}
