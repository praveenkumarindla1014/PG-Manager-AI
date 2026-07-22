import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { CreditCard, AlertCircle, Utensils, Bell, Users, ShieldCheck } from 'lucide-react';

export default function TenantDashboard() {
  const { user } = useAuth();
  const [rentStatus, setRentStatus] = useState(null);
  const [menu, setMenu] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('/payments?tenantId=' + user?._id),
      apiFetch('/menu'),
      apiFetch('/notices')
    ]).then(([payRes, menuRes, notRes]) => {
      setRentStatus(payRes.data?.[0]);
      setMenu(menuRes.data);
      setNotices(notRes.data || []);
    }).catch(err => console.error(err));
  }, [user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Tenant Portal</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI-assisted resident control panel</p>
      </div>

      <div className="grid-3">
        {/* Rent Card */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Rent Status</span>
            <CreditCard size={20} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
            {rentStatus?.status === 'paid' ? 'Paid ✓' : 'Due ₹' + (user?.roomId?.rent || 8000)}
          </h3>
          <span className={`badge badge-${rentStatus?.status === 'paid' ? 'success' : 'warning'}`} style={{ marginTop: '0.5rem' }}>
            {rentStatus?.status === 'paid' ? 'On Time' : 'Due by 5th'}
          </span>
        </div>

        {/* Room & Roommate */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Your Room</span>
            <Users size={20} color="var(--accent-cyan)" />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Room {user?.roomId?.roomNumber || 'Assigned'}</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {user?.roomId?.type || 'Double'} Sharing | Floor {user?.roomId?.floor || 1}
          </p>
        </div>

        {/* Food */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Today's Meal</span>
            <Utensils size={20} color="var(--accent-emerald)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
            {menu?.lunch?.items?.[0]?.name || 'Delicious Meal Ready'}
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem' }}>
            {menu?.totalNutrition?.calories || 2000} Total Calories
          </p>
        </div>
      </div>

      {/* Notices */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Bell size={18} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>PG Announcements & Notices</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notices.map((n, idx) => (
            <div key={idx} style={{
              padding: '0.85rem 1.1rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid var(--primary)'
            }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.25rem' }}>{n.title}</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{n.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
