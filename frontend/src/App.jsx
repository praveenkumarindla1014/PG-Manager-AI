import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sparkles, Building2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, ThemeProvider, LiveProvider } from './context/AppContext';

import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import AIChatPanel from './components/AIChat/AIChatPanel';
import EmergencyAlert from './components/EmergencyAlert/EmergencyAlert';
import { Spinner } from './components/ui';

import LandingPage from './pages/Landing/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';

// Pages load on demand so the first screen is fast.
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard/OwnerDashboard'));
const TenantDashboard = lazy(() => import('./pages/TenantDashboard/TenantDashboard'));
const RoomsPage = lazy(() => import('./pages/Rooms/RoomsPage'));
const TenantsPage = lazy(() => import('./pages/Tenants/TenantsPage'));
const PaymentsPage = lazy(() => import('./pages/Payments/PaymentsPage'));
const ComplaintsPage = lazy(() => import('./pages/Complaints/ComplaintsPage'));
const MenuPage = lazy(() => import('./pages/Menu/MenuPage'));
const NoticesPage = lazy(() => import('./pages/Notices/NoticesPage'));
const MaintenancePage = lazy(() => import('./pages/Maintenance/MaintenancePage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBase/KnowledgeBasePage'));
const VisitorsPage = lazy(() => import('./pages/Visitors/VisitorsPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));

function FullScreenLoader() {
  return (
    <div className="center" style={{ height: '100vh', gap: 14 }}>
      <div className="brand-mark" style={{ width: 52, height: 52, borderRadius: 16, animation: 'float 2s ease-in-out infinite' }}><Building2 size={26} /></div>
      <Spinner label="Loading your PG…" />
    </div>
  );
}

function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard'} replace />;
  }
  return children;
}

function MainLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ctrl/Cmd + K opens the assistant from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setChatOpen(o => !o);
      }
    };
    const onOpen = () => setChatOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pg:open-ai', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pg:open-ai', onOpen);
    };
  }, []);

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const home = user.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard';

  return (
    <LiveProvider>
      <div className="app-shell">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenAI={() => setChatOpen(true)} />
        <div className="main">
          <Header onMenu={() => setSidebarOpen(true)} onOpenAI={() => setChatOpen(o => !o)} />
          <main className="content">
            <Suspense fallback={<div className="page"><Spinner label="Loading…" /></div>}>
              <Routes>
                <Route path="/owner-dashboard" element={<PrivateRoute allowedRoles={['owner']}><OwnerDashboard /></PrivateRoute>} />
                <Route path="/tenant-dashboard" element={<PrivateRoute allowedRoles={['tenant']}><TenantDashboard /></PrivateRoute>} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/tenants" element={<PrivateRoute allowedRoles={['owner']}><TenantsPage /></PrivateRoute>} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/complaints" element={<ComplaintsPage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/notices" element={<NoticesPage />} />
                <Route path="/visitors" element={<VisitorsPage />} />
                <Route path="/maintenance" element={<PrivateRoute allowedRoles={['owner']}><MaintenancePage /></PrivateRoute>} />
                <Route path="/reports" element={<PrivateRoute allowedRoles={['owner']}><ReportsPage /></PrivateRoute>} />
                <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to={home} replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        {!chatOpen && (
          <button className="ai-fab" onClick={() => setChatOpen(true)} aria-label="Open AI assistant">
            <Sparkles size={20} /><span className="desktop-only">Ask PG Buddy</span>
          </button>
        )}
        <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        <EmergencyAlert />
      </div>
    </LiveProvider>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to={user.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard'} replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
              <Route path="/*" element={<MainLayout />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
