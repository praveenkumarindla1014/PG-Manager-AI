export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const compactInr = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k`;
  return `₹${Math.round(v)}`;
};

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date) ? '—' : date.toLocaleDateString('en-IN', opts);
}

export function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d, { day: 'numeric', month: 'short' });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const titleCase = (s = '') => s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const firstName = (name = '') => name.split(' ')[0] || name;

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

// Stable pleasant colour per name (for avatars)
const AVATAR_COLORS = ['#e11d48', '#db2777', '#9333ea', '#4f46e5', '#0284c7', '#0d9488', '#16a34a', '#ca8a04', '#ea580c'];
export function avatarColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const STATUS_TONE = {
  paid: 'success', pending: 'warning', overdue: 'danger', partial: 'warning', 'not-generated': 'neutral',
  open: 'danger', 'in-progress': 'warning', resolved: 'success', closed: 'neutral',
  available: 'success', 'partially-occupied': 'info', occupied: 'neutral', maintenance: 'warning', reserved: 'info',
  scheduled: 'info', completed: 'success', cancelled: 'neutral',
  approved: 'success', rejected: 'danger', 'checked-out': 'neutral',
  low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger', emergency: 'danger'
};
