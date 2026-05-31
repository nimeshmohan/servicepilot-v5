import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Wrench, ArrowRight } from 'lucide-react';
import { ROLES, ROLE_LABELS } from '@/utils/constants';

export default function Signup() {
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', password: '', confirmPassword: '',
    role: 'service_adviser', branch: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await createUser(form.email, form.password, {
        name: form.name,
        mobile: form.mobile,
        role: form.role,
        branch: form.branch,
      });
      toast.success('Account created! Waiting for manager approval.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = Object.entries(ROLE_LABELS).filter(([k]) => k !== 'service_manager');

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-brand-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-600/30">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ServicePilot</h1>
          <p className="text-surface-400 mt-1 text-sm">Create your team account</p>
        </div>

        <div className="bg-surface-800/60 glass backdrop-blur border border-surface-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Register</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label text-surface-300">Full Name</label>
                <input name="name" className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500" placeholder="John Smith" value={form.name} onChange={handleChange} required />
              </div>
              <div className="col-span-2">
                <label className="label text-surface-300">Email</label>
                <input name="email" type="email" className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500" placeholder="john@workshop.com" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label className="label text-surface-300">Mobile</label>
                <input name="mobile" className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500" placeholder="9876543210" value={form.mobile} onChange={handleChange} />
              </div>
              <div>
                <label className="label text-surface-300">Branch</label>
                <input name="branch" className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500" placeholder="Main Branch" value={form.branch} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <label className="label text-surface-300">Role</label>
                <select name="role" className="select bg-surface-700/50 border-surface-600 text-white" value={form.role} onChange={handleChange}>
                  {availableRoles.map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-surface-300">Password</label>
                <div className="relative">
                  <input name="password" type={showPw ? 'text' : 'password'} className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500 pr-10" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400" onClick={() => setShowPw(s => !s)}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label text-surface-300">Confirm</label>
                <input name="confirmPassword" type="password" className="input bg-surface-700/50 border-surface-600 text-white placeholder-surface-500" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg mt-2">
              {loading ? 'Creating account...' : <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4" /></span>}
            </button>
          </form>

          <p className="text-center text-surface-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
