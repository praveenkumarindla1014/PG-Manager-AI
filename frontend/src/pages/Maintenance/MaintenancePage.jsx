import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { Wrench, Calendar, Sparkles, AlertCircle, Plus } from 'lucide-react';

export default function MaintenancePage() {
  const [schedules, setSchedules] = useState([]);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/maintenance'),
      apiFetch('/maintenance/predictions')
    ]).then(([schedRes, predRes]) => {
      setSchedules(schedRes.data || []);
      setPredictions(predRes.data);
    }).catch(err => console.error(err));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>AI Maintenance & Schedule</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Failure Prediction & Natural Language Meeting Scheduling</p>
        </div>
      </div>

      {/* AI Predictions */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--primary)" /> AI Predictive Repair & Failure Monitor (Feature #16)
        </h3>

        <div className="grid-2">
          {predictions?.predictions?.map((p, idx) => (
            <div key={idx} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '0.9rem' }}>
                <span>Room {p.roomNumber || 'General'} - {p.type?.toUpperCase()}</span>
                <span className="badge badge-warning">{p.probability || 80}% Probability</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Reason: {p.reason || 'High complaint frequency in past 3 months'}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
                Est Cost: ₹{p.estimatedCost || 1500}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Tasks List */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--accent-cyan)" /> Scheduled Maintenance Tasks (Feature #23)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {schedules.map(s => (
            <div key={s._id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.1rem',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)'
            }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: '700' }}>{s.type?.toUpperCase()} — {s.description}</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Scheduled: {new Date(s.scheduledDate).toLocaleDateString()} | Assigned to: {s.assignedTo || 'Unassigned'}
                </p>
              </div>
              <span className="badge badge-primary">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
