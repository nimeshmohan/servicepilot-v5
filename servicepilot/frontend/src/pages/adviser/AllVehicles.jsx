import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeVehicles, updateVehicle } from '@/utils/firestoreService';
import { formatDate, daysSince, downloadExcel } from '@/utils/helpers';
import { VEHICLE_MODELS, REPAIR_TYPES, REPAIR_CATEGORIES, INSURANCE_COMPANIES } from '@/utils/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import VehicleTimeline from '@/components/shared/VehicleTimeline';
import toast from 'react-hot-toast';
import { Search, Download, Eye, Pencil } from 'lucide-react';

export default function AllVehicles() {
  const { user, userProfile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);   // view modal
  const [editing, setEditing] = useState(null);      // edit modal
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Managers see all vehicles; advisers see only their own
  const isManager = userProfile?.role === 'service_manager';

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      setVehicles(isManager ? data : data.filter(v => v.adviserId === user.uid));
      setLoading(false);
    });
    return unsub;
  }, [user.uid, isManager]);

  const filtered = vehicles.filter(v =>
    !search ||
    v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.customerDetails?.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    v.jobCardNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (v) => {
    setEditForm({
      vehicleNumber:          v.vehicleNumber || '',
      vehicleModel:           v.vehicleModel || 'Kushaq',
      repairType:             v.repairType || 'ACC REP',
      repairCategory:         v.repairCategory || 'Minor',
      numberOfPanels:         v.numberOfPanels || '',
      jobCardNumber:          v.jobCardNumber || '',
      customerName:           v.customerDetails?.name  || v.customerName  || '',
      customerMobile:         v.customerDetails?.mobile || v.customerMobile || '',
      insuranceCompany:       v.customerDetails?.insuranceCompany || v.insuranceCompany || '',
      documentaryReceivedDate: toDateInput(v.documentaryReceivedDate),
      surveyApprovedDate:      toDateInput(v.surveyApprovedDate),
      promisedDeliveryDate:    toDateInput(v.promisedDeliveryDate),
      remarks:                v.remarks || '',
    });
    setEditing(v);
  };

  const handleSave = async () => {
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
        customerDetails: {
          name:             editForm.customerName.trim(),
          mobile:           editForm.customerMobile.trim(),
          insuranceCompany: editForm.insuranceCompany,
        },
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

  const handleExport = () => {
    const data = filtered.map(v => ({
      'Vehicle Number': v.vehicleNumber,
      'Customer Name':  v.customerDetails?.name  || v.customerName,
      'Mobile':         v.customerDetails?.mobile || v.customerMobile,
      'Model':          v.vehicleModel,
      'Repair Type':    v.repairType,
      'Insurance':      v.customerDetails?.insuranceCompany || v.insuranceCompany,
      'Status':         v.currentStatus,
      'Job Card':       v.jobCardNumber,
      'Promise Date':   formatDate(v.promisedDeliveryDate),
    }));
    downloadExcel(data, 'vehicles');
  };

  const set = (k) => (e) => setEditForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">All Vehicles</h1>
          <p className="text-surface-500 text-sm mt-0.5">{filtered.length} vehicles total</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input className="input pl-9" placeholder="Search by vehicle no., customer, job card..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="p-8 text-center text-surface-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-surface-400">No vehicles found</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle No.</th><th>Customer</th><th>Model</th>
                  <th>Insurance</th><th>Status</th><th>Job Card</th>
                  <th>Promise Date</th><th>Days</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const name = v.customerDetails?.name || v.customerName;
                  const mobile = v.customerDetails?.mobile || v.customerMobile;
                  return (
                    <tr key={v.id}>
                      <td className="font-mono font-semibold text-brand-600 dark:text-brand-400">{v.vehicleNumber}</td>
                      <td>
                        <div>{name}</div>
                        <div className="text-xs text-surface-400">{mobile}</div>
                      </td>
                      <td>{v.vehicleModel}</td>
                      <td className="text-sm">{v.customerDetails?.insuranceCompany || v.insuranceCompany}</td>
                      <td><StatusBadge status={v.currentStatus} /></td>
                      <td className="font-mono text-sm">{v.jobCardNumber || '—'}</td>
                      <td>{formatDate(v.promisedDeliveryDate)}</td>
                      <td><span className="font-mono text-xs">{daysSince(v.createdAt)}d</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn-ghost btn-sm p-1.5" title="View details" onClick={() => setSelected(v)}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button className="btn-ghost btn-sm p-1.5 text-brand-500 hover:text-brand-700" title="Edit details" onClick={() => openEdit(v)}>
                            <Pencil className="w-3.5 h-3.5" />
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

      {/* ── View Detail Modal ── */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Vehicle — ${selected?.vehicleNumber}`} size="lg">
        {selected && (
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Vehicle Number" value={selected.vehicleNumber} mono />
              <Detail label="Model"          value={selected.vehicleModel} />
              <Detail label="Customer"       value={selected.customerDetails?.name || selected.customerName} />
              <Detail label="Mobile"         value={selected.customerDetails?.mobile || selected.customerMobile} />
              <Detail label="Insurance"      value={selected.customerDetails?.insuranceCompany || selected.insuranceCompany} />
              <Detail label="Job Card"       value={selected.jobCardNumber} mono />
              <Detail label="Repair Type"    value={selected.repairType} />
              <Detail label="Category"       value={selected.repairCategory} />
              <Detail label="Promise Date"   value={formatDate(selected.promisedDeliveryDate)} />
              <Detail label="Status"><StatusBadge status={selected.currentStatus} /></Detail>
            </div>
            {selected.remarks && (
              <div className="bg-surface-50 dark:bg-surface-700/30 rounded-xl p-3 text-sm">
                <span className="font-semibold text-surface-400 text-xs uppercase tracking-wide block mb-1">Remarks</span>
                {selected.remarks}
              </div>
            )}
            <div>
              <h4 className="font-semibold text-surface-900 dark:text-white mb-3">Status Timeline</h4>
              <VehicleTimeline vehicleId={selected.id} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Edit Details Modal ── */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Edit Vehicle — ${editing?.vehicleNumber}`} size="xl">
        {editing && (
          <div className="space-y-5 p-1">

            {/* Vehicle Info */}
            <Section title="Vehicle Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Vehicle Number *">
                  <input className="input uppercase" value={editForm.vehicleNumber} onChange={set('vehicleNumber')} style={{ textTransform: 'uppercase' }} />
                </Field>
                <Field label="Vehicle Model">
                  <select className="select" value={editForm.vehicleModel} onChange={set('vehicleModel')}>
                    {VEHICLE_MODELS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Repair Type">
                  <select className="select" value={editForm.repairType} onChange={set('repairType')}>
                    {REPAIR_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Repair Category">
                  <select className="select" value={editForm.repairCategory} onChange={set('repairCategory')}>
                    {REPAIR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Number of Panels">
                  <input type="number" min="0" className="input" value={editForm.numberOfPanels} onChange={set('numberOfPanels')} />
                </Field>
                <Field label="Job Card Number">
                  <input className="input" placeholder="JC-2024-001" value={editForm.jobCardNumber} onChange={set('jobCardNumber')} />
                </Field>
              </div>
            </Section>

            {/* Customer Info */}
            <Section title="Customer Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Customer Name *">
                  <input className="input" value={editForm.customerName} onChange={set('customerName')} />
                </Field>
                <Field label="Mobile">
                  <input className="input" value={editForm.customerMobile} onChange={set('customerMobile')} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Insurance Company">
                    <select className="select" value={editForm.insuranceCompany} onChange={set('insuranceCompany')}>
                      {INSURANCE_COMPANIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </Section>

            {/* Dates */}
            <Section title="Important Dates">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Documentary Received">
                  <input type="date" className="input" value={editForm.documentaryReceivedDate} onChange={set('documentaryReceivedDate')} />
                </Field>
                <Field label="Survey Approved">
                  <input type="date" className="input" value={editForm.surveyApprovedDate} onChange={set('surveyApprovedDate')} />
                </Field>
                <Field label="Promised Delivery">
                  <input type="date" className="input" value={editForm.promisedDeliveryDate} onChange={set('promisedDeliveryDate')} />
                </Field>
              </div>
            </Section>

            {/* Remarks */}
            <Section title="Remarks">
              <textarea className="input min-h-[80px] resize-y" placeholder="Any notes..." value={editForm.remarks} onChange={set('remarks')} />
            </Section>

            <div className="flex gap-3 justify-end pt-1">
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(val) {
  if (!val) return '';
  // Firestore Timestamp
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString().split('T')[0];
  // Already a string
  if (typeof val === 'string') return val.split('T')[0];
  return '';
}

function Section({ title, children }) {
  return (
    <div className="bg-surface-50 dark:bg-surface-700/20 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Detail({ label, value, children, mono }) {
  return (
    <div>
      <div className="text-xs text-surface-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
      {children || <div className={`font-medium text-surface-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>}
    </div>
  );
}
