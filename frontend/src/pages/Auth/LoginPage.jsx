import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, Crown, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const DEMO = [
  { label: 'Owner demo', icon: Crown, email: 'owner@smartpg.com', password: 'owner123' },
  { label: 'Resident demo', icon: User, email: 'priya@test.com', password: 'tenant123' }
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (e, creds) => {
    e?.preventDefault();
    const em = creds?.email ?? email;
    const pw = creds?.password ?? password;
    if (!em || !pw) return setError('Please enter your email and password.');
    setBusy(true);
    setError('');
    try {
      const user = await login(em, pw);
      const from = location.state?.from;
      navigate(from && from !== '/' ? from : user.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your PG or your stay."
      footer={<>New resident? <Link to="/register" className="bold">Create your account</Link></>}
    >
      <form className="stack" onSubmit={doLogin}>
        <label className="field">
          <span className="label">Email</span>
          <div className="input-group">
            <Mail size={16} />
            <input className="input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </div>
        </label>
        <label className="field">
          <span className="label">Password</span>
          <div className="input-group">
            <Lock size={16} />
            <input className="input" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 42 }} />
            <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 4 }} onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error && <div className="callout callout-danger small">{error}</div>}

        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy && <Loader2 size={18} className="spin" />} Sign in
        </button>
      </form>

      <div className="stack-sm">
        <div className="row small faint" style={{ gap: 10 }}>
          <span className="divider grow" /> or try a demo account <span className="divider grow" />
        </div>
        <div className="grid-2" style={{ gap: 10 }}>
          {DEMO.map(d => (
            <button key={d.email} className="btn btn-secondary" disabled={busy} onClick={() => { setEmail(d.email); setPassword(d.password); doLogin(null, d); }}>
              <d.icon size={16} /> {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
