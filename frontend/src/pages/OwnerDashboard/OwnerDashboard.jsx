import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { 
  Building2, 
  IndianRupee, 
  AlertCircle, 
  TrendingUp, 
  CheckSquare, 
  Sparkles, 
  Users, 
  Zap, 
  DollarSign, 
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

export default function OwnerDashboard() {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [riskyTenants, setRiskyTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/reports/daily-summary'),
      apiFetch('/reports/insights'),
      apiFetch('/tenants/risky')
    ]).then(([sumRes, insRes, riskRes]) => {
      setSummary(sumRes.data);
      setInsights(insRes.data);
      setRiskyTenants(riskRes.data || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Executive Dashboard...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Management Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Real-time property metrics & business intelligence</p>
        </div>
        <span className="badge badge-cyan" style={{ padding: '0.35rem 0.75rem' }}>
          <Sparkles size={12} /> Daily Executive Brief
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid-4">
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Occupancy Rate</span>
            <Building2 size={18} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{summary?.occupancyRate || 0}%</h3>
          <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <ArrowUpRight size={12} /> {summary?.occupiedRooms || 0} / {summary?.totalRooms || 0} Rooms Occupied
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Monthly Income</span>
            <IndianRupee size={18} color="var(--accent-emerald)" />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>₹{(summary?.todayIncome || 0).toLocaleString('en-IN')}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Pending Rent: ₹{(summary?.pendingRent || 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Pending Issues</span>
            <AlertCircle size={18} color="var(--accent-amber)" />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{summary?.pendingComplaints || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: '#fb7185', marginTop: '0.25rem' }}>
            {summary?.emergencyComplaints || 0} Urgent Items
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Visitors Today</span>
            <Users size={18} color="var(--accent-cyan)" />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{summary?.todayVisitors || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Checked In
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Business Insights */}
        <div className="glass-card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Zap size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Daily Business Insights</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {summary?.aiInsights && summary.aiInsights.map((insight, idx) => (
              <div key={idx} style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--primary)',
                fontSize: '0.84rem'
              }}>
                ✨ {insight}
              </div>
            ))}
          </div>
        </div>

        {/* Smart To-Do List */}
        <div className="glass-card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <CheckSquare size={18} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Smart Action Checklist</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {summary?.todoList && summary.todoList.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.85rem',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass)'
              }}>
                <span style={{ fontSize: '0.82rem' }}>{item.task}</span>
                <span className={`badge badge-${item.priority === 'high' ? 'danger' : 'warning'}`} style={{ fontSize: '0.65rem' }}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risky Tenant Monitor */}
      <div className="glass-card" style={{ padding: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertTriangle size={18} color="#f43f5e" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Risk & Payment Behavior Monitor</h3>
        </div>
        {riskyTenants.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No risky tenants detected. All residents are in good standing! 🎉</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {riskyTenants.map((t, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(244, 63, 94, 0.06)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '700' }}>{t.name} (Room {t.roomId?.roomNumber || '?'})</h4>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Risk Index: {t.violationScore}/100 | Late Payment Probability: {t.paymentBehavior?.lateProbability || 0}%
                  </p>
                </div>
                <span className="badge badge-danger">Attention Required</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
