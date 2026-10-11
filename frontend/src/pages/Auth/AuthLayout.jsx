import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Sparkles, ShieldCheck, Languages } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)' }} className="auth-grid">
      <style>{`@media (max-width: 900px){ .auth-grid{ grid-template-columns: 1fr !important; } .auth-art{ display:none !important; } }`}</style>

      <div className="center" style={{ padding: '40px 24px', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="stack-lg">
          <Link to="/" className="row" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="brand-mark"><Building2 size={20} /></span>
            <span className="brand-name">PG Manager</span>
          </Link>
          <div>
            <h1 className="display" style={{ fontSize: '2.1rem' }}>{title}</h1>
            {subtitle && <p className="muted mt-2">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="small muted">{footer}</div>}
        </div>
      </div>

      <div className="auth-art" style={{ position: 'relative', overflow: 'hidden', background: '#2a0f19' }}>
        <img src="/images/pg_1.webp" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(176,18,74,0.75), rgba(30,10,18,0.85) 70%)' }} />
        <div style={{ position: 'relative', height: '100%', padding: '56px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: '#fff', gap: 22 }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', alignSelf: 'flex-start', height: 28, padding: '0 12px' }}>
            <Sparkles size={13} /> AI-first PG management
          </span>
          <h2 className="display" style={{ fontSize: '2.6rem', lineHeight: 1.1, maxWidth: 520 }}>
            Run your PG like it runs itself.
          </h2>
          <p style={{ opacity: 0.85, maxWidth: 480, fontSize: '1.02rem' }}>
            Rent reminders, complaints, menus, visitors and reports — handled by an assistant that talks to your residents in their own language.
          </p>
          <div className="row wrap" style={{ gap: 18, opacity: 0.9 }}>
            <span className="row-sm small bold"><ShieldCheck size={16} /> Secure, role-based access</span>
            <span className="row-sm small bold"><Languages size={16} /> 5 Indian languages</span>
          </div>
        </div>
      </div>
    </div>
  );
}
