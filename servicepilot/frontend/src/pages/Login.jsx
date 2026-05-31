import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Wrench, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, userProfile } = useAuth();
  const navigate = useNavigate();

  const getRolePath = (role) => {
    const paths = {
      service_manager: '/manager',
      service_adviser: '/adviser',
      job_controller: '/jc',
      parts_allocator: '/parts',
    };
    return paths[role] || '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const cred = await login(email, password);
      // Fetch profile to determine redirect
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/firebase');
      const profileSnap = await getDoc(doc(db, 'users', cred.user.uid));
      const profile = profileSnap.data();
      toast.success(`Welcome back, ${profile?.name || 'User'}!`);
      navigate(getRolePath(profile?.role));
    } catch (err) {
      toast.error(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-brand-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-600/30">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white font-display">ServicePilot</h1>
          <p className="text-surface-400 mt-1 text-sm">Automotive Service Center Management</p>
        </div>

        {/* Card */}
        <div className="bg-surface-800/60 glass backdrop-blur border border-surface-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-surface-300">Email address</label>
              <input
                type="email"
                className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500 focus:ring-brand-500"
                placeholder="you@servicepilot.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label text-surface-300">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500 focus:ring-brand-500 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200"
                  onClick={() => setShowPw(s => !s)}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full btn-lg mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-surface-500 text-sm mt-6">
            New team member?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
              Request access
            </Link>
          </p>
        </div>

        <p className="text-center text-surface-600 text-xs mt-6">
          © 2024 ServicePilot. All rights reserved.
        </p>
      </div>
    </div>
  );
}
