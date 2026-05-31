import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeVehicles, updateVehicleStatus } from '@/utils/firestoreService';
import { formatDate, daysSince } from '@/utils/helpers';
import { WIP_SUBSTATUS, DELAY_THRESHOLDS } from '@/utils/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import VehicleTimeline from '@/components/shared/VehicleTimeline';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Eye, AlertTriangle } from 'lucide-react';

const JC_STATUSES = ['WFA', 'WIP', 'PNA', 'QC', 'Washing', 'RFD'];
const JC_NEXT = { WFA: 'WIP', WIP: 'QC', PNA: 'WIP', QC: 'Washing', Washing: 'RFD', RFD: 'Delivered' };

export default function JCDashboard() {
  const { user, userProfile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', subStatus: '', remarks: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      setVehicles(data.filter(v => JC_STATUSES.includes(v.currentStatus)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = vehicles.filter(v => {
    const matchSearch = !search ||
      v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.customerDetails?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.currentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    wfa: vehicles.filter(v => v.currentStatus === 'WFA').length,
    wip: vehicles.filter(v => v.currentStatus === 'WIP').length,
    pna: vehicles.filter(v => v.currentStatus === 'PNA').length,
    qc: vehicles.filter(v => v.currentStatus === 'QC').length,
    washing: vehicles.filter(v => v.currentStatus === 'Washing').length,
    rfd: vehicles.filter(v => v.currentStatus === 'RFD').length,
  };

  const openUpdate = (vehicle) => {
    setSelectedVehicle(vehicle);
    setUpdateForm({ status: JC_NEXT[vehicle.currentStatus] || vehicle.currentStatus, subStatus: '', remarks: '' });
    setShowUpdate(true);
  };

  const handleUpdate = async () => {
    if (!selectedVehicle || !updateForm.status) return;
    setUpdating(true);
    try {
      await updateVehicleStatus(selectedVehicle.id, {
        status: updateForm.status,
        subStatus: updateForm.subStatus || null,
        remarks: updateForm.remarks,
        updatedBy: userProfile?.name || user.email,
        updatedByRole: 'job_controller',
        previousStatus: selectedVehicle.currentStatus,
      });
      toast.success(`Status updated to ${updateForm.status}`);
      setShowUpdate(false);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Job Controller Dashboard</h1>
        <p className="text-surface-500 text-sm mt-0.5">Manage workshop progress — {vehicles.length} vehicles active</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'WFA', count: stats.wfa },
          { label: 'WIP', count: stats.wip },
          { label: 'PNA', count: stats.pna },
          { label: 'QC', count: stats.qc },
          { label: 'Washing', count: stats.washing },
          { label: 'RFD', count: stats.rfd },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.label ? 'all' : s.label)}
            className={`card p-3 text-center cursor-pointer transition-all ${statusFilter === s.label ? 'ring-2 ring-brand-500' : 'hover:shadow-md'}`}
          >
            <div className="text-xl font-bold text-surface-900 dark:text-white">{s.count}</div>
            <StatusBadge status={s.label} size="sm" />
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input className="input pl-9" placeholder="Search by vehicle no. or customer..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="p-8 text-center text-surface-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-surface-400">No vehicles in JC queue</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle No.</th><th>Customer</th><th>Model</th>
                  <th>Status</th><th>Sub Status</th><th>Days in Status</th>
                  <th>Adviser</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const days = daysSince(v.statusEnteredAt);
                  const threshold = DELAY_THRESHOLDS[v.currentStatus];
                  const delayed = threshold && days >= threshold;
                  return (
                    <tr key={v.id}>
                      <td className="font-mono font-semibold text-brand-600 dark:text-brand-400">{v.vehicleNumber}</td>
                      <td>
                        <div className="font-medium">{v.customerDetails?.name || '—'}</div>
                        <div className="text-xs text-surface-400">{v.jobCardNumber}</div>
                      </td>
                      <td>{v.vehicleModel}</td>
                      <td><StatusBadge status={v.currentStatus} /></td>
                      <td>
                        {v.subStatus ? (
                          <span className="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded-full text-surface-600 dark:text-surface-300">{v.subStatus}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {delayed && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          <span className={`font-mono text-sm font-semibold ${delayed ? 'text-red-500' : 'text-surface-600 dark:text-surface-400'}`}>
                            {days}d
                          </span>
                        </div>
                      </td>
                      <td className="text-sm">{v.adviserName || '—'}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn-ghost btn-sm p-1.5" onClick={() => { setSelectedVehicle(v); setShowTimeline(true); }}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button className="btn-primary btn-sm" onClick={() => openUpdate(v)}>
                            <RefreshCw className="w-3 h-3" /> Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Timeline Modal */}
      <Modal isOpen={showTimeline} onClose={() => setShowTimeline(false)} title={`Timeline — ${selectedVehicle?.vehicleNumber}`} size="lg">
        {selectedVehicle && <VehicleTimeline vehicleId={selectedVehicle.id} />}
      </Modal>

      {/* Update Modal */}
      <Modal isOpen={showUpdate} onClose={() => setShowUpdate(false)} title="Update Workshop Status" size="default">
        {selectedVehicle && (
          <div className="space-y-4">
            <div className="bg-surface-50 dark:bg-surface-700/30 rounded-xl p-4">
              <div className="font-semibold text-surface-900 dark:text-white">{selectedVehicle.vehicleNumber}</div>
              <div className="text-sm text-surface-500">{selectedVehicle.customerDetails?.name} · {selectedVehicle.vehicleModel}</div>
              <div className="mt-2">
                <StatusBadge status={selectedVehicle.currentStatus} />
              </div>
            </div>

            <div>
              <label className="label">New Status</label>
              <div className="grid grid-cols-3 gap-2">
                {['WIP', 'PNA', 'QC', 'Washing', 'RFD', 'Delivered'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setUpdateForm(f => ({ ...f, status: s }))}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      updateForm.status === s
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                        : 'border-surface-200 dark:border-surface-600 hover:border-surface-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {updateForm.status === 'WIP' && (
              <div>
                <label className="label">Work Sub-Status</label>
                <select className="select" value={updateForm.subStatus} onChange={e => setUpdateForm(f => ({ ...f, subStatus: e.target.value }))}>
                  <option value="">Select work stage</option>
                  {WIP_SUBSTATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="label">Remarks</label>
              <textarea className="input min-h-[80px]" placeholder="Describe the work done, issues found..." value={updateForm.remarks} onChange={e => setUpdateForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>

            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowUpdate(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdate} disabled={updating}>
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
