import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeVehicles, updateVehicleStatus, updateVehicle } from '@/utils/firestoreService';
import { formatDate, daysSince } from '@/utils/helpers';
import { STATUS_FLOW_ADVISER, VEHICLE_MODELS, REPAIR_TYPES, REPAIR_CATEGORIES, INSURANCE_COMPANIES } from '@/utils/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import VehicleTimeline from '@/components/shared/VehicleTimeline';
import toast from 'react-hot-toast';
import { Search, Eye, RefreshCw, Pencil } from 'lucide-react';

const ADVISER_STATUSES = ['WDA', 'WIA', 'WCA', 'WFA'];
const FILTER_STATUSES  = ['WDA', 'WIA', 'WCA', 'WFA', 'RFD'];  // RFD shown in filter
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

  // Edit vehicle details
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      // Only show adviser's vehicles that are in adviser statuses
      const filtered = data.filter(v =>
        v.adviserId === user.uid && FILTER_STATUSES.includes(v.currentStatus)
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

    // Block WFA if no job card
    if (updateForm.status === 'WFA') {
      const jc = updateForm.jobCardNumber?.trim() || selectedVehicle.jobCardNumber?.trim();
      if (!jc) return toast.error('Job Card Number is required before moving to WFA');
    }

    setUpdating(true);
    try {
      // Save job card number to vehicle document if it was entered/changed
      const enteredJC = updateForm.jobCardNumber?.trim();
      const additionalData = {};
      if (enteredJC && enteredJC !== selectedVehicle.jobCardNumber) {
        additionalData.jobCardNumber = enteredJC;
      }

      await updateVehicleStatus(selectedVehicle.id, {
        status: updateForm.status,
        subStatus: null,
        remarks: updateForm.remarks,
        updatedBy: userProfile?.name || user.email,
        updatedByRole: 'service_adviser',
        previousStatus: selectedVehicle.currentStatus,
        additionalData,
      });
      toast.success(`Status updated to ${updateForm.status}`);
      setShowUpdateModal(false);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const openEdit = (v) => {
    setEditForm({
      vehicleNumber:           v.vehicleNumber || '',
      vehicleModel:            v.vehicleModel || 'Kushaq',
      repairType:              v.repairType || 'ACC REP',
      repairCategory:          v.repairCategory || 'Minor',
      numberOfPanels:          v.numberOfPanels || '',
      jobCardNumber:           v.jobCardNumber || '',
      customerName:            v.customerDetails?.name  || v.customerName  || '',
      customerMobile:          v.customerMobile || v.customerDetails?.mobile || '',
      insuranceCompany:        v.insuranceCompany || v.customerDetails?.insuranceCompany || '',
      documentaryReceivedDate: toDateInput(v.documentaryReceivedDate),
      surveyApprovedDate:      toDateInput(v.surveyApprovedDate),
      promisedDeliveryDate:    toDateInput(v.promisedDeliveryDate),
      remarks:                 v.remarks || '',
    });
    setEditing(v);
  };

  const handleSaveEdit = async () => {
    if (!editForm.vehicleNumber.trim()) return toast.error('Vehicle number is required');
    if (!editForm.customerName.trim())  return toast.error('Customer name is required');
    setSaving(true);
    try {
      await updateVehicle(editing.id, {
        vehicleNumber:    editForm.vehicleNumber.toUpperCase().trim(),
        vehicleModel:     editForm.vehicleModel,
        repairType:       editForm.repairType,
        repairCategory:   editForm.repairCategory,
        numberOfPanels:   editForm.numberOfPanels,
        jobCardNumber:    editForm.jobCardNumber.trim(),
        customerName:     editForm.customerName.trim(),
        customerMobile:   editForm.customerMobile.trim(),
        insuranceCompany: editForm.insuranceCompany,
        documentaryReceivedDate: editForm.documentaryReceivedDate || null,
        surveyApprovedDate:      editForm.surveyApprovedDate      || null,
        promisedDeliveryDate:    editForm.promisedDeliveryDate    || null,
        remarks:                 editForm.remarks.trim(),
      });
      toast.success('Vehicle details updated');
      setEditing(null);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const setF = (k) => (e) => setEditForm(f => ({ ...f, [k]: e.target.value }));

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
          {['all', ...FILTER_STATUSES].map(s => (
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
      {/* Edit Details Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Edit Vehicle — ${editing?.vehicleNumber}`} size="xl">
        {editing && (
          <div className="space-y-4 p-1">
            <div className="bg-surface-50 dark:bg-surface-700/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Vehicle Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Vehicle Number *</label><input className="input uppercase" value={editForm.vehicleNumber} onChange={setF('vehicleNumber')} style={{ textTransform: 'uppercase' }} /></div>
                <div><label className="label">Vehicle Model</label><select className="select" value={editForm.vehicleModel} onChange={setF('vehicleModel')}>{VEHICLE_MODELS.map(m => <option key={m}>{m}</option>)}</select></div>
                <div><label className="label">Repair Type</label><select className="select" value={editForm.repairType} onChange={setF('repairType')}>{REPAIR_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="label">Repair Category</label><select className="select" value={editForm.repairCategory} onChange={setF('repairCategory')}>{REPAIR_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="label">Number of Panels</label><input type="number" min="0" className="input" value={editForm.numberOfPanels} onChange={setF('numberOfPanels')} /></div>
                <div><label className="label">Job Card Number</label><input className="input" value={editForm.jobCardNumber} onChange={setF('jobCardNumber')} /></div>
              </div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-700/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Customer Name *</label><input className="input" value={editForm.customerName} onChange={setF('customerName')} /></div>
                <div><label className="label">Mobile</label><input className="input" value={editForm.customerMobile} onChange={setF('customerMobile')} /></div>
                <div className="sm:col-span-2"><label className="label">Insurance Company</label><select className="select" value={editForm.insuranceCompany} onChange={setF('insuranceCompany')}>{INSURANCE_COMPANIES.map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-700/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Important Dates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="label">Documentary Received</label><input type="date" className="input" value={editForm.documentaryReceivedDate} onChange={setF('documentaryReceivedDate')} /></div>
                <div><label className="label">Survey Approved</label><input type="date" className="input" value={editForm.surveyApprovedDate} onChange={setF('surveyApprovedDate')} /></div>
                <div><label className="label">Promised Delivery</label><input type="date" className="input" value={editForm.promisedDeliveryDate} onChange={setF('promisedDeliveryDate')} /></div>
              </div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-700/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Remarks</h3>
              <textarea className="input min-h-[80px] resize-y" value={editForm.remarks} onChange={setF('remarks')} />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function toDateInput(val) {
  if (!val) return '';
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString().split('T')[0];
  if (typeof val === 'string') return val.split('T')[0];
  return '';
}
