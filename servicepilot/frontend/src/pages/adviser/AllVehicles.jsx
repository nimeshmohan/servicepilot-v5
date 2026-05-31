import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeVehicles } from '@/utils/firestoreService';
import { formatDate, daysSince, downloadExcel } from '@/utils/helpers';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import VehicleTimeline from '@/components/shared/VehicleTimeline';
import { Search, Download, Eye } from 'lucide-react';

export default function AllVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      setVehicles(data.filter(v => v.adviserId === user.uid));
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  const filtered = vehicles.filter(v =>
    !search ||
    v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    v.jobCardNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const data = filtered.map(v => ({
      'Vehicle Number': v.vehicleNumber,
      'Customer Name': v.customerName,
      'Mobile': v.customerMobile,
      'Model': v.vehicleModel,
      'Repair Type': v.repairType,
      'Insurance': v.insuranceCompany,
      'Status': v.currentStatus,
      'Job Card': v.jobCardNumber,
      'Promise Date': formatDate(v.promisedDeliveryDate),
    }));
    downloadExcel(data, 'my_vehicles');
  };

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
        <input className="input pl-9" placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} />
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
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td className="font-mono font-semibold text-brand-600 dark:text-brand-400">{v.vehicleNumber}</td>
                    <td>
                      <div>{v.customerName}</div>
                      <div className="text-xs text-surface-400">{v.customerMobile}</div>
                    </td>
                    <td>{v.vehicleModel}</td>
                    <td className="text-sm">{v.insuranceCompany}</td>
                    <td><StatusBadge status={v.currentStatus} /></td>
                    <td className="font-mono text-sm">{v.jobCardNumber}</td>
                    <td>{formatDate(v.promisedDeliveryDate)}</td>
                    <td><span className="font-mono text-xs">{daysSince(v.createdAt)}d</span></td>
                    <td>
                      <button className="btn-ghost btn-sm p-1.5" onClick={() => setSelected(v)}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Vehicle Detail — ${selected?.vehicleNumber}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Vehicle Number" value={selected.vehicleNumber} mono />
              <Detail label="Model" value={selected.vehicleModel} />
              <Detail label="Customer" value={selected.customerName} />
              <Detail label="Mobile" value={selected.customerMobile} />
              <Detail label="Insurance" value={selected.insuranceCompany} />
              <Detail label="Job Card" value={selected.jobCardNumber} mono />
              <Detail label="Repair Type" value={selected.repairType} />
              <Detail label="Category" value={selected.repairCategory} />
              <Detail label="Promise Date" value={formatDate(selected.promisedDeliveryDate)} />
              <Detail label="Status"><StatusBadge status={selected.currentStatus} /></Detail>
            </div>
            {selected.remarks && (
              <div className="bg-surface-50 dark:bg-surface-700/30 rounded-xl p-3 text-sm text-surface-700 dark:text-surface-300">
                <span className="font-semibold text-surface-500 text-xs uppercase tracking-wide block mb-1">Remarks</span>
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
