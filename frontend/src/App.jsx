import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import io from 'socket.io-client';

import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import AIChatPanel from './components/AIChat/AIChatPanel';
import EmergencyAlert from './components/EmergencyAlert/EmergencyAlert';

import LandingPage from './pages/Landing/LandingPage';
import OwnerDashboard from './pages/OwnerDashboard/OwnerDashboard';
import TenantDashboard from './pages/TenantDashboard/TenantDashboard';
import RoomsPage from './pages/Rooms/RoomsPage';
import TenantsPage from './pages/Tenants/TenantsPage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import ComplaintsPage from './pages/Complaints/ComplaintsPage';
import MenuPage from './pages/Menu/MenuPage';
import NoticesPage from './pages/Notices/NoticesPage';
import MaintenancePage from './pages/Maintenance/MaintenancePage';
import ReportsPage from './pages/Reports/ReportsPage';
import KnowledgeBasePage from './pages/KnowledgeBase/KnowledgeBasePage';

import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard'} replace />;
  }
  return children;
}

function MainLayout() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [emergencyData, setEmergencyData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const socket = io('http://localhost:5000');

    if (user?._id) {
      socket.emit('join-room', user._id);
    }

    socket.on('emergency', (data) => {
      console.log('🚨 Emergency alert received:', data);
      setEmergencyData(data);
    });

    return () => socket.disconnect();
  }, [user]);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header 
          toggleAIChat={() => setIsAIChatOpen(!isAIChatOpen)}
          isAIChatOpen={isAIChatOpen}
          hasEmergency={!!emergencyData}
        />
        <main className="content-area">
          <Routes>
            <Route path="/owner-dashboard" element={<PrivateRoute allowedRoles={['owner']}><OwnerDashboard /></PrivateRoute>} />
            <Route path="/tenant-dashboard" element={<PrivateRoute allowedRoles={['tenant']}><TenantDashboard /></PrivateRoute>} />
            <Route path="/rooms" element={<PrivateRoute><RoomsPage /></PrivateRoute>} />
            <Route path="/tenants" element={<PrivateRoute allowedRoles={['owner']}><TenantsPage /></PrivateRoute>} />
            <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
            <Route path="/complaints" element={<PrivateRoute><ComplaintsPage /></PrivateRoute>} />
            <Route path="/menu" element={<PrivateRoute><MenuPage /></PrivateRoute>} />
            <Route path="/notices" element={<PrivateRoute><NoticesPage /></PrivateRoute>} />
            <Route path="/maintenance" element={<PrivateRoute allowedRoles={['owner']}><MaintenancePage /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute allowedRoles={['owner']}><ReportsPage /></PrivateRoute>} />
            <Route path="/knowledge-base" element={<PrivateRoute><KnowledgeBasePage /></PrivateRoute>} />
            <Route path="*" element={<Navigate to={user?.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard'} replace />} />
          </Routes>
        </main>
      </div>

      <AIChatPanel isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
      <EmergencyAlert emergencyData={emergencyData} onClose={() => setEmergencyData(null)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
