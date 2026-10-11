import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, Moon, Sun, LogOut, UserCog, Sparkles, CheckCheck, MessageSquareWarning, Wallet, Megaphone, DoorOpen, Wrench, ShieldAlert, Info, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLive, useTheme } from '../../context/AppContext';
import { Avatar, Dropdown } from '../ui';
import { timeAgo, firstName } from '../../utils/format';

const TITLES = {
  '/owner-dashboard': 'Dashboard', '/tenant-dashboard': 'Home', '/rooms': 'Rooms', '/tenants': 'Tenants',
  '/payments': 'Rent & Payments', '/complaints': 'Complaints', '/menu': 'Food Menu', '/notices': 'Notices',
  '/maintenance': 'Maintenance', '/reports': 'Reports', '/knowledge-base': 'Rules & Policies', '/visitors': 'Visitors', '/profile': 'Profile'
};

const TYPE_ICON = {
  complaint: MessageSquareWarning, payment: Wallet, notice: Megaphone, visitor: DoorOpen,
  maintenance: Wrench, emergency: ShieldAlert, system: Info
};

export default function Header({ onMenu, onOpenAI }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const live = useLive();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-icon mobile-only" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <div className="grow">
        <div className="bold" style={{ fontSize: '0.95rem' }}>{TITLES[pathname] || 'PG Manager'}</div>
        <div className="tiny faint desktop-only row-sm">
          <span className="pulse-dot" style={{ background: live?.connected ? 'var(--success)' : 'var(--ink-3)', animation: live?.connected ? undefined : 'none' }} />
          {live?.connected ? 'Live' : 'Connecting…'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <button className="btn btn-soft desktop-only" onClick={onOpenAI}>
        <Sparkles size={16} /> Ask AI
      </button>

      <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle dark mode" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
        {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      <Dropdown trigger={({ toggle }) => (
        <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label="Notifications" style={{ position: 'relative' }}>
          <Bell size={19} />
          {live?.unread > 0 && (
            <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: 'var(--brand)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid var(--bg)' }}>
              {live.unread > 9 ? '9+' : live.unread}
            </span>
          )}
        </button>
      )}>
        <div style={{ width: 'min(360px, calc(100vw - 32px))' }} onClick={e => e.stopPropagation()}>
          <div className="row between" style={{ padding: '6px 8px 10px' }}>
            <span className="bold">Notifications</span>
            {live?.unread > 0 && <button className="btn btn-ghost btn-xs" onClick={live.markAllRead}><CheckCheck size={14} />Mark all read</button>}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {!live?.notifications?.length && <div className="empty small" style={{ padding: 28 }}>You're all caught up ✨</div>}
            {live?.notifications?.map(n => {
              const Icon = TYPE_ICON[n.type] || Info;
              return (
                <button key={n._id} className="dropdown-item" style={{ alignItems: 'flex-start', background: n.isRead ? undefined : 'var(--brand-50)', marginBottom: 2 }}
                  onClick={() => { live.markRead(n._id); if (n.link) navigate(n.link); }}>
                  <span className="stat-icon" style={{ width: 30, height: 30, background: n.type === 'emergency' ? 'var(--danger-bg)' : 'var(--surface-3)', color: n.type === 'emergency' ? 'var(--danger)' : 'var(--ink-2)' }}><Icon size={15} /></span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: 'var(--ink)', fontWeight: n.isRead ? 600 : 750 }}>{n.title}</span>
                    {n.message && <span className="tiny muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 500 }}>{n.message}</span>}
                    <span className="tiny faint" style={{ fontWeight: 500 }}>{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Dropdown>

      <Dropdown trigger={({ toggle }) => (
        <button className="btn btn-ghost" onClick={toggle} style={{ padding: '0 6px', height: 42 }} aria-label="Account menu">
          <Avatar name={user?.name} size="sm" />
          <span className="desktop-only small bold">{firstName(user?.name)}</span>
        </button>
      )}>
        <div style={{ padding: '8px 10px 10px' }}>
          <div className="bold">{user?.name}</div>
          <div className="tiny faint">{user?.email}</div>
        </div>
        <div className="divider" />
        <button className="dropdown-item" onClick={() => navigate('/profile')}><UserCog size={16} />Profile & settings</button>
        <button className="dropdown-item" onClick={() => navigate('/')}><Home size={16} />Public homepage</button>
        <button className="dropdown-item" onClick={() => { logout(); navigate('/login'); }} style={{ color: 'var(--danger)' }}><LogOut size={16} />Log out</button>
      </Dropdown>
    </header>
  );
}
