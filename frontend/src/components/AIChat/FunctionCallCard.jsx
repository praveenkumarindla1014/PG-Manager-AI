import React from 'react';
import { CheckCircle2, AlertTriangle, Code2 } from 'lucide-react';

export default function FunctionCallCard({ fn }) {
  return (
    <div style={{
      background: 'rgba(99, 102, 241, 0.08)',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.65rem 0.85rem',
      marginBottom: '0.65rem',
      fontSize: '0.8rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc', fontWeight: '600' }}>
          <Code2 size={14} />
          <span>Executed Action: {fn.name}</span>
        </div>
        {fn.success ? (
          <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
            <CheckCircle2 size={12} /> Success
          </span>
        ) : (
          <span style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
            <AlertTriangle size={12} /> Error
          </span>
        )}
      </div>

      {fn.args && Object.keys(fn.args).length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '0.4rem 0.6rem',
          borderRadius: '4px',
          fontFamily: 'var(--font-code)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          {JSON.stringify(fn.args)}
        </div>
      )}
    </div>
  );
}
