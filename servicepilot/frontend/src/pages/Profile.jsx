import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '@/firebase';
import { User, Lock, Phone, Building2, Shield, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROLE_LABELS } from '@/utils/constants';

export default function Profile() {
  const { user, userProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: userProfile?.name || '',
    mobile: userProfile?.mobile || '',
    branch: userProfile?.branch || '',
  });

  const [pwForm, setPwForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const handleProfileSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        branch: form.branch.trim(),
        updatedAt: new Date(),
      });
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwForm.current) return toast.error('Enter current password');
    if (pwForm.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (pwForm.next !== pwForm.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, pwForm.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, pwForm.next);
      toast.success('Password changed successfully');
      setPwForm({ current: '', next: '', confirm: '' });
      setChangingPw(false);
    } catch (err) {
      if (err.code === 'auth/wrong-password') toast.error('Current password is incorrect');
      else toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = ROLE_LABELS[userProfile?.role] || userProfile?.role || 'Unknown';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gradient">My Profile</h1>
        <p className="text-surface-500 mt-1 text-sm">Manage your account information</p>
      </div>

      {/* Avatar + Role Card */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {(userProfile?.name || user?.email || 'U')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-surface-900 dark:text-white text-lg truncate">
            {userProfile?.name || 'User'}
          </div>
          <div className="text-surface-500 text-sm truncate">{user?.email}</div>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <Shield className="w-3 h-3" />
              {roleLabel}
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-surface-400">
          <div>Status</div>
          <div className={`font-semibold mt-0.5 ${userProfile?.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
            {userProfile?.status === 'active' ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            Personal Information
          </h2>
          {!editing && (
            <button className="btn btn-secondary text-sm py-1.5 px-3" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Full Name</label>
            {editing ? (
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            ) : (
              <div className="text-sm font-medium text-surface-900 dark:text-white">{userProfile?.name || '—'}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Email</label>
            <div className="text-sm font-medium text-surface-900 dark:text-white">{user?.email}</div>
            <div className="text-xs text-surface-400 mt-0.5">Cannot be changed</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Mobile
            </label>
            {editing ? (
              <input className="input" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            ) : (
              <div className="text-sm font-medium text-surface-900 dark:text-white">{userProfile?.mobile || '—'}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Branch
            </label>
            {editing ? (
              <input className="input" value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} placeholder="Branch name" />
            ) : (
              <div className="text-sm font-medium text-surface-900 dark:text-white">{userProfile?.branch || '—'}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Role</label>
            <div className="text-sm font-medium text-surface-900 dark:text-white">{roleLabel}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Member Since</label>
            <div className="text-sm font-medium text-surface-900 dark:text-white">
              {userProfile?.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>
        </div>

        {editing && (
          <div className="flex gap-2 pt-2">
            <button className="btn btn-primary flex items-center gap-2" onClick={handleProfileSave} disabled={loading}>
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={loading}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-500" />
            Change Password
          </h2>
          {!changingPw && (
            <button className="btn btn-secondary text-sm py-1.5 px-3" onClick={() => setChangingPw(true)}>
              Change
            </button>
          )}
        </div>

        {changingPw && (
          <div className="space-y-3">
            {['current', 'next', 'confirm'].map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-surface-500 mb-1">
                  {field === 'current' ? 'Current Password' : field === 'next' ? 'New Password' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPw[field] ? 'text' : 'password'}
                    className="input pr-10"
                    value={pwForm[field]}
                    onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                  >
                    {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button className="btn btn-primary flex items-center gap-2" onClick={handlePasswordChange} disabled={loading}>
                <CheckCircle className="w-4 h-4" /> {loading ? 'Updating...' : 'Update Password'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setChangingPw(false); setPwForm({ current: '', next: '', confirm: '' }); }} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {!changingPw && (
          <p className="text-sm text-surface-400">Use a strong password with at least 6 characters.</p>
        )}
      </div>
    </div>
  );
}
