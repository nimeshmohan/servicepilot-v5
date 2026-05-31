import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { subscribeVehicles } from '@/utils/firestoreService';
import { daysSince } from '@/utils/helpers';
import { DELAY_THRESHOLDS } from '@/utils/constants';
import toast from 'react-hot-toast';
import {
  Wrench, LayoutDashboard, Car, ClipboardList, Plus, Users,
  LogOut, Sun, Moon, Menu, X,
  BarChart3, Package, AlertTriangle, UserCircle
} from 'lucide-react';
import { ROLE_LABELS } from '@/utils/constants';

const navByRole = {
  service_manager: [
    { label: 'Dashboard',      icon: LayoutDashboard, path: '/manager' },
    { label: 'All Vehicles',   icon: Car,             path: '/manager/vehicles' },
    { label: 'Team Members',   icon: Users,           path: '/manager/users' },
    { label: 'Analytics',      icon: BarChart3,       path: '/manager/analytics' },
    { label: 'Delayed Alerts', icon: AlertTriangle,   path: '/manager/alerts', badge: true },
    { label: 'Profile',        icon: UserCircle,      path: '/profile' },
  ],
  service_adviser: [
    { label: 'Dashboard',      icon: LayoutDashboard, path: '/adviser' },
    { label: 'New Intake',     icon: Plus,            path: '/adviser/new' },
    { label: 'Received',       icon: ClipboardList,   path: '/adviser/received' },
    { label: 'Vehicle Status', icon: Car,             path: '/adviser/status' },
    { label: 'All Vehicles',   icon: ClipboardList,   path: '/adviser/all' },
    { label: 'Profile',        icon: UserCircle,      path: '/profile' },
  ],
  job_controller: [
    { label: 'Dashboard',      icon: LayoutDashboard, path: '/jc' },
    { label: 'WFA Vehicles',   icon: Car,             path: '/jc/vehicles' },
    { label: 'Profile',        icon: UserCircle,      path: '/profile' },
  ],
  parts_allocator: [
    { label: 'Dashboard',      icon: LayoutDashboard, path: '/parts' },
    { label: 'PNA Vehicles',   icon: Package,         path: '/parts/vehicles' },
    { label: 'Profile',        icon: UserCircle,      path: '/profile' },
  ],
};

export default function AppLayout({ children }) {
  const { userProfile, logout, role } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [delayedCount, setDelayedCount] = useState(0);

  // Subscribe to delayed vehicle count — only for manager
  useEffect(() => {
    if (role !== 'service_manager') return;
    const unsub = subscribeVehicles((data) => {
      const count = data.filter(v => {
        const threshold = DELAY_THRESHOLDS[v.currentStatus];
        return threshold && daysSince(v.statusEnteredAt) >= threshold;
      }).length;
      setDelayedCount(count);
    });
    return unsub;
  }, [role]);

  const nav = navByRole[role] || [];

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700/50 flex flex-col
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-100 dark:border-surface-700/50">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-surface-900 dark:text-white text-sm leading-tight">ServicePilot</div>
            <div className="text-xs text-surface-400 leading-tight">{ROLE_LABELS[role]}</div>
          </div>
          <button className="ml-auto lg:hidden text-surface-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length <= 2}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {/* Delayed alert badge */}
              {item.badge && delayedCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white leading-none">
                  {delayedCount > 99 ? '99+' : delayedCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-surface-100 dark:border-surface-700/50">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-700 dark:text-brand-300 text-xs font-bold">
                {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-surface-900 dark:text-white truncate">{userProfile?.name}</div>
              <div className="text-xs text-surface-400 truncate">{userProfile?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full mt-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur border-b border-surface-200 dark:border-surface-700/50 flex items-center px-4 gap-3">
          <button
            className="lg:hidden text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Delayed alert indicator in header for manager */}
          {role === 'service_manager' && delayedCount > 0 && (
            <button
              onClick={() => navigate('/manager/alerts')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {delayedCount} delayed
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="btn-ghost btn-sm p-2"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Branch badge */}
          {userProfile?.branch && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              <span className="text-xs font-medium text-brand-700 dark:text-brand-300">{userProfile.branch}</span>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
