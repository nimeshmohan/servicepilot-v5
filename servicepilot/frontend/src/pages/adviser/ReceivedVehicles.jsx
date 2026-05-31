import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeVehicles, updateVehicleStatus } from '@/utils/firestoreService';
import { formatDate, daysSince } from '@/utils/helpers';
import { STATUS_FLOW_ADVISER } from '@/utils/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import VehicleTimeline from '@/components/shared/VehicleTimeline';
import toast from 'react-hot-toast';
import { Search, ChevronRight, Eye, RefreshCw } from 'lucide-react';

const ADVISER_STATUSES = ['WDA', 'WIA', 'WCA', 'WFA'];
const NEXT_STATUS = { WDA: 'WIA', WIA: 'WCA', WCA: 'WFA', WFA: 'WFA' };

export default function ReceivedVehicles() {
  const { user, userProfile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', remarks: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      // Only show adviser's vehicles that are in adviser statuses
      const filtered = data.filter(v =>
        v.adviserId === user.uid && ADVISER_STATUSES.includes(v.currentStatus)
      );
      setVehicles(filtered);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  const filtered = vehicles.filter(v => {
    const matchSearch = !search || v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      v.jobCardNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.currentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const openUpdateModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setUpdateForm({
      status: NEXT_STATUS[vehicle.currentStatus] || vehicle.currentStatus,
      remarks: '',
      jobCardNumber: vehicle.jobCardNumber || '',
    });
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedVehicle) return;
    setUpdating(true);
    try {
      await updateVehicleStatus(selectedVehicle.id, {
        status: updateForm.status,
        subStatus: null,
        remarks: updateForm.remarks,
        updatedBy: userProfile?.name || user.email,
        updatedByRole: 'service_adviser',
        previousStatus: selectedVehicle.currentStatus,
      });
      toast.success(`Status updated to ${updateForm.status}`);
      setShowUpdateModal(false);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Received Vehicles</h1>
          <p className="text-surface-500 text-sm mt-0.5">Vehicles in your queue — {filtered.length} active</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search by vehicle number, customer, job card..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', ...ADVISER_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="p-8 text-center text-surface-400">Loading vehicles...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-surface-400">No vehicles found</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle No.</th>
                  <th>Customer</th>
                  <th>Model</th>
                  <th>Insurance</th>
                  <th>Status</th>
                  <th>Days in Status</th>
                  <th>Promise Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const days = daysSince(v.statusEnteredAt);
                  const isOverdue = days > 2;
                  return (
                    <tr key={v.id}>
                      <td className="font-mono font-semibold text-brand-600 dark:text-brand-400">{v.vehicleNumber}</td>
                      <td>
                        <div className="font-medium">{v.customerName}</div>
                        <div className="text-xs text-surface-400">{v.customerMobile}</div>
                      </td>
                      <td>{v.vehicleModel}</td>
                      <td className="text-sm">{v.insuranceCompany}</td>
                      <td><StatusBadge status={v.currentStatus} /></td>
                      <td>
                        <span className={`font-mono text-sm font-semibold ${isOverdue ? 'text-red-500' : 'text-surface-600 dark:text-surface-400'}`}>
                          {days}d {isOverdue && '⚠️'}
                        </span>
                      </td>
                      <td>{formatDate(v.promisedDeliveryDate)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-ghost btn-sm p-1.5"
                            onClick={() => { setSelectedVehicle(v); setShowTimeline(true); }}
                            title="View Timeline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => openUpdateModal(v)}
                          >
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

      {/* Update Status Modal */}
      <Modal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} title="Update Vehicle Status">
        {selectedVehicle && (
          <div className="space-y-4">
            <div className="bg-surface-50 dark:bg-surface-700/30 rounded-xl p-4">
              <div className="text-sm font-semibold text-surface-900 dark:text-white">{selectedVehicle.vehicleNumber}</div>
              <div className="text-sm text-surface-500">{selectedVehicle.customerName} · {selectedVehicle.vehicleModel}</div>
              <div className="mt-2"><StatusBadge status={selectedVehicle.currentStatus} /></div>
            </div>
            <div>
              <label className="label">New Status</label>
              <select className="select" value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}>
                {ADVISER_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {updateForm.status === 'WFA' && (
              <div>
                <label className="label">
                  Job Card Number <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-surface-400 ml-1">(required to proceed to WFA)</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. JC-2024-001"
                  value={updateForm.jobCardNumber}
                  onChange={e => setUpdateForm(f => ({ ...f, jobCardNumber: e.target.value }))}
                />
                {!updateForm.jobCardNumber?.trim() && !selectedVehicle?.jobCardNumber && (
                  <p className="text-xs text-red-500 mt-1">Job card number must be entered before moving to Waiting for Allocation</p>
                )}
              </div>
            )}

            <div>
              <label className="label">Remarks</label>
              <textarea className="input min-h-[80px]" placeholder="Add a note about this status change..." value={updateForm.remarks} onChange={e => setUpdateForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
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
