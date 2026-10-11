import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Inbox, Loader2 } from 'lucide-react';
import { STATUS_TONE, avatarColor, initials, titleCase } from '../../utils/format';

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="small bold text-brand" style={{ marginBottom: 4 }}>{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, icon: Icon, actions, children, className = '', bodyClass = 'card-body', style }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div className="card-header">
          <div className="grow">
            {title && <h3 className="card-title">{Icon && <Icon size={17} className="text-brand" />}{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="row-sm">{actions}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', foot, onClick, progress }) {
  const toneStyle = {
    brand: ['var(--brand-50)', 'var(--brand)'],
    success: ['var(--success-bg)', 'var(--success)'],
    warning: ['var(--warning-bg)', 'var(--warning)'],
    danger: ['var(--danger-bg)', 'var(--danger)'],
    info: ['var(--info-bg)', 'var(--info)'],
    violet: ['var(--violet-bg)', 'var(--violet)'],
    teal: ['var(--teal-bg)', 'var(--teal)']
  }[tone];
  return (
    <div className={`card stat ${onClick ? 'card-hover' : ''}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="stat-label">
        <span>{label}</span>
        {Icon && <span className="stat-icon" style={{ background: toneStyle[0], color: toneStyle[1] }}><Icon size={17} /></span>}
      </div>
      <div className="stat-value">{value}</div>
      {progress !== undefined && (
        <div className="progress"><span style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: toneStyle[1] }} /></div>
      )}
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export function Badge({ children, tone, status, dot, className = '', style }) {
  const t = tone || STATUS_TONE[status] || 'neutral';
  return (
    <span className={`badge tone-${t} ${dot ? 'badge-dot' : ''} ${className}`} style={style}>
      {children ?? titleCase(status || '')}
    </span>
  );
}

export function Avatar({ name, size = '', style }) {
  return (
    <span className={`avatar ${size ? `avatar-${size}` : ''}`} style={{ background: avatarColor(name), ...style }} title={name}>
      {initials(name)}
    </span>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size ? `modal-${size}` : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="muted small mt-1">{subtitle}</p>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="overlay drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div className="grow">
            <h2 className="modal-title">{title}</h2>
            {subtitle && <div className="muted small mt-1">{subtitle}</div>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ flex: 1 }}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </aside>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose, busy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={`btn btn-${tone === 'danger' ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={16} className="spin" />}{confirmLabel}
        </button>
      </>}
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon size={26} /></div>
      {title && <div className="empty-title">{title}</div>}
      {message && <p className="small" style={{ maxWidth: 360 }}>{message}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function SkeletonCards({ count = 4, height = 110 }) {
  return Array.from({ length: count }).map((_, i) => <Skeleton key={i} height={height} style={{ borderRadius: 18 }} />);
}

export function Spinner({ size = 18, label }) {
  return <span className="row-sm muted"><Loader2 size={size} className="spin" />{label}</span>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.icon && <t.icon size={15} />}{t.label}
          {t.count !== undefined && <span className="badge tone-neutral" style={{ height: 18, padding: '0 6px' }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger({ open, toggle: () => setOpen(o => !o) })}
      {open && (
        <div className="dropdown" style={align === 'left' ? { left: 0, right: 'auto' } : undefined} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Count-up number animation for KPIs */
export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('en-IN'), duration = 700 }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const initial = from.current;
    const target = Number(value) || 0;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(initial + (target - initial) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(display)}</>;
}
