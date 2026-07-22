import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  CreditCard, 
  AlertCircle, 
  Utensils, 
  Bell, 
  Wrench, 
  FileText, 
  BookOpen, 
  Sparkles
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const navItems = isOwner ? [
    { path: '/owner-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/rooms', label: 'Rooms & Vacancy', icon: Home },
    { path: '/tenants', label: 'Tenants & Verification', icon: Users },
    { path: '/payments', label: 'Rent & Payments', icon: CreditCard },
    { path: '/complaints', label: 'Complaint Box', icon: AlertCircle },
    { path: '/menu', label: 'Weekly Food Menu', icon: Utensils },
    { path: '/notices', label: 'Smart Notices', icon: Bell },
    { path: '/maintenance', label: 'Maintenance Schedule', icon: Wrench },
    { path: '/reports', label: 'Reports & Expenses', icon: FileText },
    { path: '/knowledge-base', label: 'Rules & Knowledge Base', icon: BookOpen }
  ] : [
    { path: '/tenant-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { path: '/rooms', label: 'Find Rooms', icon: Home },
    { path: '/payments', label: 'My Rent Payments', icon: CreditCard },
    { path: '/complaints', label: 'Report Issue', icon: AlertCircle },
    { path: '/menu', label: 'Weekly Food Menu', icon: Utensils },
    { path: '/notices', label: 'Announcements', icon: Bell },
    { path: '/knowledge-base', label: 'PG Rules & Policy', icon: BookOpen }
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100%',
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.25rem',
      boxShadow: '2px 0 10px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0.25rem' }}>
        <img src="/build_icon.png" alt="PG Manager Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            PG Manager<sup style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>TM</sup>
          </h2>
          <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
            <Sparkles size={10} /> Smart AI
          </span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.7rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              color: isActive ? 'var(--primary)' : '#475569',
              background: isActive ? 'rgba(208, 18, 78, 0.08)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              fontWeight: isActive ? '700' : '500',
              textDecoration: 'none',
              transition: 'var(--transition)'
            })}
          >
            <item.icon size={18} />
            <span style={{ fontSize: '0.88rem' }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{
        padding: '0.85rem',
        marginTop: 'auto',
        background: '#f8fafc',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.85rem'
          }}>
            {user?.name?.[0] || 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#0f172a' }}>{user?.name}</p>
            <p style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
