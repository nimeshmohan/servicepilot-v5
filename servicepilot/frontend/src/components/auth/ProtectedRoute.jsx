import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Wrench } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div className="text-surface-400 text-sm">Loading ServicePilot...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && userProfile && !allowedRoles.includes(userProfile.role)) {
    // Redirect to appropriate dashboard
    const paths = {
      service_manager: '/manager',
      service_adviser: '/adviser',
      job_controller: '/jc',
      parts_allocator: '/parts',
    };
    return <Navigate to={paths[userProfile.role] || '/login'} replace />;
  }

  return children;
}
