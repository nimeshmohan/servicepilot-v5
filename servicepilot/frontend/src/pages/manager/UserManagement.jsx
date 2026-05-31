import React, { useEffect, useState } from 'react';
import { subscribeUsers, updateUser } from '@/utils/firestoreService';
import { useAuth } from '@/context/AuthContext';
import { ROLES, ROLE_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/helpers';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import { UserPlus, Search, Edit2, UserCheck, UserX, Users } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';

export default function UserManagement() {
  const { createUser, userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', email: '', mobile: '', role: 'service_adviser', branch: '', password: '',
  });

  useEffect(() => {
    const unsub = subscribeUsers(setUsers);
    return unsub;
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return toast.error('Fill required fields');
    setCreating(true);
    try {
      await createUser(newUser.email, newUser.password, {
        name: newUser.name,
        mobile: newUser.mobile,
        role: newUser.role,
        branch: newUser.branch,
      });
      toast.success('User created!');
      setShowCreate(false);
      setNewUser({ name: '', email: '', mobile: '', role: 'service_adviser', branch: '', password: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await updateUser(user.id, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'disabled'}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Reset email sent to ${email}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    try {
      await updateUser(editUser.id, {
        name: editUser.name,
        mobile: editUser.mobile,
        role: editUser.role,
        branch: editUser.branch,
      });
      toast.success('User updated');
      setShowEdit(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const roleStats = Object.entries(ROLE_LABELS).map(([key, label]) => ({
    role: key,
    label,
    count: users.filter(u => u.role === key).length,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Team Members</h1>
          <p className="text-surface-500 text-sm mt-0.5">{users.length} registered users</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {roleStats.map(s => (
          <div key={s.role} className="card p-4">
            <div className="text-2xl font-bold text-surface-900 dark:text-white">{s.count}</div>
            <div className="text-sm text-surface-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input className="input pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>User</th><th>Role</th><th>Branch</th><th>Mobile</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-700 dark:text-brand-300 text-xs font-bold">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-surface-900 dark:text-white">{u.name}</div>
                        <div className="text-xs text-surface-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded-lg font-medium">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="text-sm">{u.branch || '—'}</td>
                  <td className="text-sm">{u.mobile || '—'}</td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {u.status === 'active' ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost btn-sm p-1.5" onClick={() => { setEditUser({ ...u }); setShowEdit(true); }} title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className={`btn btn-sm ${u.status === 'active' ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                        onClick={() => handleToggleStatus(u)}
                        title={u.status === 'active' ? 'Disable user' : 'Enable user'}
                      >
                        {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button className="btn-ghost btn-sm px-2 text-xs" onClick={() => handleResetPassword(u.email)}>
                        Reset PW
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New Team Member">
        <div className="space-y-4">
          {[
            { name: 'name', label: 'Full Name *', placeholder: 'John Smith' },
            { name: 'email', label: 'Email *', placeholder: 'john@workshop.com', type: 'email' },
            { name: 'mobile', label: 'Mobile', placeholder: '9876543210' },
            { name: 'branch', label: 'Branch', placeholder: 'Main Branch' },
            { name: 'password', label: 'Temporary Password *', placeholder: '••••••••', type: 'password' },
          ].map(f => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input
                type={f.type || 'text'}
                className="input"
                placeholder={f.placeholder}
                value={newUser[f.name]}
                onChange={e => setNewUser(u => ({ ...u, [f.name]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="label">Role</label>
            <select className="select" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit User">
        {editUser && (
          <div className="space-y-4">
            {['name', 'mobile', 'branch'].map(f => (
              <div key={f}>
                <label className="label capitalize">{f}</label>
                <input className="input" value={editUser[f] || ''} onChange={e => setEditUser(u => ({ ...u, [f]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="label">Role</label>
              <select className="select" value={editUser.role} onChange={e => setEditUser(u => ({ ...u, role: e.target.value }))}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditSave}>Save Changes</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
