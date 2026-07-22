import React from 'react';
import { ShieldAlert, AlertTriangle, PhoneCall, X } from 'lucide-react';

export default function EmergencyAlert({ emergencyData, onClose }) {
  if (!emergencyData) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(11, 15, 25, 0.95)',
      backdropFilter: 'blur(16px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="glass-card emergency-active" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #f43f5e',
        boxShadow: '0 10px 40px rgba(244, 63, 94, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#f43f5e', fontWeight: '800' }}>
                EMERGENCY ALERT
              </h2>
              <span className="badge badge-danger">Immediate Action Needed</span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.4)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          borderLeft: '4px solid #f43f5e',
          marginBottom: '1.25rem'
        }}>
          <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.3rem' }}>
            {emergencyData.message || 'Emergency Issue Reported'}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Room: {emergencyData.complaint?.room?.roomNumber || 'Building'} | Category: {emergencyData.type}
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.88rem', color: '#fb7185', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={15} /> Safety Protocol:
          </h4>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Evacuate building floor immediately if gas leak or fire.</li>
            <li>Do not operate light switches or open flames.</li>
            <li>Emergency notifications dispatches sent to staff.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="tel:112" className="btn btn-danger" style={{ flex: 1, textDecoration: 'none' }}>
            <PhoneCall size={16} /> Call Emergency (112)
          </a>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
            Dismiss Alert
          </button>
        </div>
      </div>
    </div>
  );
}
