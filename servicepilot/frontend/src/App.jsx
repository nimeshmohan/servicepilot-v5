import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Auth pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';

// Adviser pages
import AdviserDashboard from './pages/adviser/AdviserDashboard';
import NewVehicleIntake from './pages/adviser/NewVehicleIntake';
import ReceivedVehicles from './pages/adviser/ReceivedVehicles';
import AllVehicles from './pages/adviser/AllVehicles';

// Manager pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import UserManagement from './pages/manager/UserManagement';
import Analytics from './pages/manager/Analytics';
import DelayedAlerts from './pages/manager/DelayedAlerts';

// JC pages
import JCDashboard from './pages/jc/JCDashboard';

// Parts pages
import PartsDashboard from './pages/parts/PartsDashboard';

const ALL_ROLES = ['service_manager', 'service_adviser', 'job_controller', 'parts_allocator'];

function withLayout(Component, roles) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <AppLayout>
        <Component />
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                fontFamily: 'Syne, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
              error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Profile (all roles) */}
            <Route path="/profile" element={withLayout(Profile, ALL_ROLES)} />

            {/* Service Adviser */}
            <Route path="/adviser" element={withLayout(AdviserDashboard, ['service_adviser'])} />
            <Route path="/adviser/new" element={withLayout(NewVehicleIntake, ['service_adviser'])} />
            <Route path="/adviser/received" element={withLayout(ReceivedVehicles, ['service_adviser'])} />
            <Route path="/adviser/status" element={withLayout(ReceivedVehicles, ['service_adviser'])} />
            <Route path="/adviser/all" element={withLayout(AllVehicles, ['service_adviser'])} />

            {/* Service Manager */}
            <Route path="/manager" element={withLayout(ManagerDashboard, ['service_manager'])} />
            <Route path="/manager/vehicles" element={withLayout(AllVehicles, ['service_manager'])} />
            <Route path="/manager/users" element={withLayout(UserManagement, ['service_manager'])} />
            <Route path="/manager/analytics" element={withLayout(Analytics, ['service_manager'])} />
            <Route path="/manager/alerts" element={withLayout(DelayedAlerts, ['service_manager'])} />

            {/* Job Controller */}
            <Route path="/jc" element={withLayout(JCDashboard, ['job_controller'])} />
            <Route path="/jc/vehicles" element={withLayout(JCDashboard, ['job_controller'])} />

            {/* Parts Allocator */}
            <Route path="/parts" element={withLayout(PartsDashboard, ['parts_allocator'])} />
            <Route path="/parts/vehicles" element={withLayout(PartsDashboard, ['parts_allocator'])} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
