import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BedDouble, Users, Wallet, MessageSquareWarning, UtensilsCrossed, Megaphone,
  Wrench, BarChart3, BookOpen, DoorOpen, UserCog, Sparkles, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui';

const OWNER_NAV = [
  { section: 'Overview' },
  { path: '/owner-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'Property' },
  { path: '/rooms', label: 'Rooms & Beds', icon: BedDouble },
  { path: '/tenants', label: 'Tenants', icon: Users },
  { path: '/payments', label: 'Rent & Payments', icon: Wallet },
  { path: '/visitors', label: 'Visitors', icon: DoorOpen },
  { section: 'Operations' },
  { path: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench },
  { path: '/menu', label: 'Food Menu', icon: UtensilsCrossed },
  { path: '/notices', label: 'Notices', icon: Megaphone },
  { section: 'Business' },
  { path: '/reports', label: 'Reports & Expenses', icon: BarChart3 },
  { path: '/knowledge-base', label: 'Rules & Policies', icon: BookOpen }
];

const TENANT_NAV = [
  { section: 'My stay' },
  { path: '/tenant-dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/payments', label: 'My Rent', icon: Wallet },
  { path: '/complaints', label: 'Report an Issue', icon: MessageSquareWarning },
  { path: '/menu', label: 'Food Menu', icon: UtensilsCrossed },
  { path: '/notices', label: 'Notices', icon: Megaphone },
  { path: '/visitors', label: 'My Visitors', icon: DoorOpen },
  { section: 'Explore' },
  { path: '/rooms', label: 'Rooms', icon: BedDouble },
  { path: '/knowledge-base', label: 'PG Rules', icon: BookOpen }
];

export default function Sidebar({ open, onClose, onOpenAI }) {
  const { user } = useAuth();
  const nav = user?.role === 'owner' ? OWNER_NAV : TENANT_NAV;

  return (
    <>
      <div className={`sidebar-scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Building2 size={20} /></div>
          <div>
            <div className="brand-name">PG Manager</div>
            <div className="brand-sub">{user?.role === 'owner' ? 'Owner console' : 'Resident app'}</div>
          </div>
        </div>

        <nav style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2, margin: '0 -4px', padding: '0 4px' }}>
          {nav.map((item, i) => item.section
            ? <div key={i} className="nav-section">{item.section}</div>
            : (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        <button className="card-soft row" style={{ padding: '12px 14px', cursor: 'pointer', textAlign: 'left', border: '1px solid var(--brand-100)', background: 'var(--brand-50)' }} onClick={() => { onOpenAI(); onClose(); }}>
          <Sparkles size={18} className="text-brand" />
          <span className="grow">
            <span className="bold small" style={{ display: 'block' }}>Ask PG Buddy</span>
            <span className="tiny muted">Your AI assistant · Ctrl+K</span>
          </span>
        </button>

        <div className="sidebar-footer">
          <NavLink to="/profile" className="user-chip" onClick={onClose} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Avatar name={user?.name} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="bold small ellipsis" style={{ display: 'block' }}>{user?.name}</span>
              <span className="tiny faint">{user?.role === 'owner' ? 'Owner' : user?.roomId?.roomNumber ? `Room ${user.roomId.roomNumber}` : 'Resident'}</span>
            </span>
            <UserCog size={16} className="faint" />
          </NavLink>
        </div>
      </aside>
    </>
  );
}
