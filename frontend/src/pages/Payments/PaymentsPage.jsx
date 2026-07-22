import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { CreditCard, TrendingUp, AlertTriangle, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    Promise.all([
      apiFetch('/payments'),
      apiFetch('/payments/predictions')
    ]).then(([payRes, predRes]) => {
      setPayments(payRes.data || []);
      setPredictions(predRes.data);
    }).catch(err => console.error(err));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Rent Payments & AI Predictions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fraud Detection & Payment Behavior Analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('list')}>
            <CreditCard size={16} /> Transactions
          </button>
          <button className={`btn ${activeTab === 'predictions' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('predictions')}>
            <TrendingUp size={16} /> AI Rent Prediction
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Tenant</th>
                <th style={{ padding: '0.75rem' }}>Room</th>
                <th style={{ padding: '0.75rem' }}>Amount</th>
                <th style={{ padding: '0.75rem' }}>Month/Year</th>
                <th style={{ padding: '0.75rem' }}>Method</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{p.tenant?.name || 'Tenant'}</td>
                  <td style={{ padding: '0.75rem' }}>Room {p.room?.roomNumber || '?'}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--accent-emerald)', fontWeight: '700' }}>₹{p.amount?.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '0.75rem' }}>{p.month}/{p.year}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'uppercase' }}>{p.method}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge badge-${p.status === 'paid' ? 'success' : 'warning'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary)" /> AI Rent Behavior Predictions (Feature #10)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {predictions?.predictions?.map((pred, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `4px solid ${pred.risk === 'high' ? '#f43f5e' : pred.risk === 'medium' ? '#f59e0b' : '#10b981'}`
              }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '700' }}>{pred.tenantName} (Room {pred.roomNumber})</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Avg {pred.averageDaysLate} days late | Late Probability: {pred.lateProbability}%
                  </p>
                </div>
                <span className={`badge badge-${pred.risk === 'high' ? 'danger' : pred.risk === 'medium' ? 'warning' : 'success'}`}>
                  {pred.behavior}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
