import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, PhoneCall, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLive } from '../../context/AppContext';
import { titleCase, timeAgo } from '../../utils/format';

const DEFAULT_STEPS = {
  immediateAction: 'Move everyone to a safe place and contact emergency services if anyone is at risk.',
  contacts: ['Emergency: 112']
};

export default function EmergencyAlert() {
  const live = useLive();
  const navigate = useNavigate();
  const data = live?.emergency;

  // Audible alert so the owner notices even if the tab is in the background.
  useEffect(() => {
    if (!data) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach(t => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.15, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.3);
      });
    } catch { /* audio not allowed */ }
  }, [data]);

  if (!data) return null;
  const steps = data.steps || DEFAULT_STEPS;
  const close = () => live.setEmergency(null);
  const contacts = steps.contacts || [];

  return createPortal(
    <div className="overlay emergency-overlay">
      <div className="modal emergency-card" role="alertdialog" aria-modal="true">
        <div style={{ background: 'var(--danger)', color: '#fff', padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center' }}>
            <ShieldAlert size={26} />
          </div>
          <div className="grow">
            <div className="tiny bold" style={{ letterSpacing: '0.1em', opacity: 0.9 }}>EMERGENCY ALERT · {titleCase(data.type || 'general')}</div>
            <div className="display" style={{ fontSize: '1.35rem' }}>Immediate attention needed</div>
          </div>
          <button className="btn btn-icon btn-sm" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }} onClick={close} aria-label="Dismiss"><X size={18} /></button>
        </div>
        <div className="modal-body stack">
          <div className="callout callout-danger">
            <div className="stack-sm">
              <div className="bold">{data.complaint?.description || data.message}</div>
              <div className="small muted row-sm wrap">
                <MapPin size={14} />
                {data.complaint?.room?.roomNumber ? `Room ${data.complaint.room.roomNumber}` : 'Building'}
                {data.complaint?.tenant?.name && <> · reported by {data.complaint.tenant.name}</>}
                {data.complaint?.createdAt && <> · {timeAgo(data.complaint.createdAt)}</>}
              </div>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>What to do right now</div>
            <p style={{ fontWeight: 600 }}>{steps.immediateAction}</p>
          </div>
          <div className="row wrap">
            {(contacts.length ? contacts : ['Emergency: 112']).map(c => {
              const num = c.match(/\d{3,}/)?.[0];
              return (
                <a key={c} href={num ? `tel:${num}` : undefined} className="btn btn-danger" style={{ flex: '1 1 160px' }}>
                  <PhoneCall size={16} />{c}
                </a>
              );
            })}
            {data.complaint?.tenant?.phone && (
              <a href={`tel:${data.complaint.tenant.phone}`} className="btn btn-secondary" style={{ flex: '1 1 160px' }}>
                <PhoneCall size={16} />Call {data.complaint.tenant.name.split(' ')[0]}
              </a>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={close}>Dismiss</button>
          <button className="btn btn-primary" onClick={() => { close(); navigate('/complaints'); }}>Open complaint</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
