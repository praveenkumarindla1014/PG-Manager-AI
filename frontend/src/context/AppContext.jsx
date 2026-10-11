import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { apiFetch, getToken } from '../services/api';
import { useAuth } from './AuthContext';

/* ---------------- Toasts ---------------- */
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 5500 : 3500);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map(t => {
            const I = Icon[t.type] || Info;
            return <div key={t.id} className={`toast toast-${t.type}`}><I size={18} />{t.message}</div>;
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------------- Theme ---------------- */
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('pg_theme') ||
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pg_theme', theme);
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/* ---------------- Realtime + notifications ---------------- */
const LiveContext = createContext(null);

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [emergency, setEmergency] = useState(null);
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Map());
  const socketRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications');
      setNotifications(res.data);
      setUnread(res.unread);
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    loadNotifications();
    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (n) => {
      setNotifications(list => [{ ...n, isRead: false }, ...list].slice(0, 40));
      setUnread(c => c + 1);
      if (n.type !== 'emergency') toast(n.title, 'info');
    });
    socket.on('emergency', (data) => {
      if (user.role === 'owner' || String(data.complaint?.tenant?._id) === String(user._id)) setEmergency(data);
    });
    // Fan out other events to page-level subscribers (live refresh).
    for (const evt of ['complaint-updated', 'payment-updated']) {
      socket.on(evt, (payload) => listeners.current.get(evt)?.forEach(fn => fn(payload)));
    }
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, loadNotifications, toast]);

  const subscribe = useCallback((event, fn) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event).add(fn);
    return () => listeners.current.get(event)?.delete(fn);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(list => list.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    await apiFetch('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  const markRead = useCallback(async (id) => {
    setNotifications(list => list.map(n => (n._id === id ? { ...n, isRead: true } : n)));
    setUnread(c => Math.max(0, c - 1));
    await apiFetch(`/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <LiveContext.Provider value={{ notifications, unread, markAllRead, markRead, emergency, setEmergency, subscribe, connected, reload: loadNotifications }}>
      {children}
    </LiveContext.Provider>
  );
}

export const useLive = () => useContext(LiveContext);

/** Re-run `fn` whenever one of the given realtime events arrives. */
export function useLiveRefresh(events, fn) {
  const live = useLive();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!live) return undefined;
    const offs = [].concat(events).map(e => live.subscribe(e, () => ref.current()));
    return () => offs.forEach(off => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, [].concat(events).join()]);
}

/* ---------------- Data loading hook ---------------- */
export function useApi(endpoint, { deps = [], initial = null, transform } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const load = useCallback(async ({ silent } = {}) => {
    if (!endpoint) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(endpoint);
      setData(transformRef.current ? transformRef.current(res) : res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  // When the AI assistant changes data (records a payment, logs a complaint…), refresh quietly.
  useEffect(() => {
    const onChange = () => load({ silent: true });
    window.addEventListener('pg:data-changed', onChange);
    return () => window.removeEventListener('pg:data-changed', onChange);
  }, [load]);

  return { data, setData, loading, error, reload: load };
}
