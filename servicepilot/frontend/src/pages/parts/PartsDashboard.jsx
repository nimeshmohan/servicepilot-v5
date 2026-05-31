import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribePartsTracking, updatePartsTracking } from '@/utils/firestoreService';
import { formatDate, formatDateTime, daysSince } from '@/utils/helpers';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import { Package, Search, RefreshCw, AlertTriangle, Clock, CheckCircle, FileText } from 'lucide-react';

const ORDER_STATUSES = ['Pending', 'Ordered', 'Partially Received', 'Fully Received', 'Back Order'];

export default function PartsDashboard() {
  const { user, userProfile } = useAuth();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateForm, setUpdateForm] = useState({});
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = subscribePartsTracking((data) => {
      setParts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = parts.filter(p =>
    !search ||
    p.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.jobCardNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: parts.length,
    pending: parts.filter(p => p.orderStatus === 'Pending').length,
    ordered: parts.filter(p => p.orderStatus === 'Ordered').length,
    backOrder: parts.filter(p => p.orderStatus === 'Back Order').length,
    received: parts.filter(p => p.orderStatus === 'Fully Received').length,
  };

  const openUpdate = (part) => {
    setSelected(part);
    setUpdateForm({
      orderStatus: part.orderStatus || 'Pending',
      orderDate: part.orderDate || '',
      etaDate: part.etaDate || '',
      receivedDate: part.receivedDate || '',
      vendorName: part.vendorName || '',
      invoiceNumber: part.invoiceNumber || '',
      totalPartsCount: part.totalPartsCount || 0,
      receivedPartsCount: part.receivedPartsCount || 0,
      pendingPartsCount: part.pendingPartsCount || 0,
      pendingItems: part.pendingItems || '',
      backOrderItems: part.backOrderItems || '',
      remarks: '',
    });
    setShowUpdate(true);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      await updatePartsTracking(selected.id, {
        ...updateForm,
        pendingPartsCount: (updateForm.totalPartsCount || 0) - (updateForm.receivedPartsCount || 0),
      }, userProfile?.name || user.uid);
      toast.success('Parts tracking updated!');
      setShowUpdate(false);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const isEtaExceeded = (part) => {
    if (!part.etaDate || part.orderStatus === 'Fully Received') return false;
    return new Date(part.etaDate) < new Date();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Parts Allocator Dashboard</h1>
        <p className="text-surface-500 text-sm mt-0.5">Track PNA vehicles and parts availability</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total PNA" value={stats.total} color="purple" />
        <StatCard icon={Clock} label="Pending Order" value={stats.pending} color="yellow" />
        <StatCard icon={AlertTriangle} label="Back Order" value={stats.backOrder} color="red" />
        <StatCard icon={CheckCircle} label="Parts Received" value={stats.received} color="green" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input className="input pl-9" placeholder="Search by vehicle number or job card..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="p-8 text-center text-surface-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Package className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">No PNA vehicles in queue</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle No.</th><th>Job Card</th><th>Order Status</th>
                  <th>ETA Date</th><th>Parts Progress</th><th>Vendor</th>
                  <th>Days</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const exceeded = isEtaExceeded(p);
                  const progress = p.totalPartsCount > 0
                    ? Math.round((p.receivedPartsCount / p.totalPartsCount) * 100)
                    : 0;
                  return (
                    <tr key={p.id}>
                      <td className="font-mono font-semibold text-brand-600 dark:text-brand-400">
                        {p.vehicleNumber}
                      </td>
                      <td className="font-mono text-sm">{p.jobCardNumber || '—'}</td>
                      <td>
                        <OrderStatusBadge status={p.orderStatus} />
                      </td>
                      <td>
                        <div className={exceeded ? 'text-red-500 flex items-center gap-1' : ''}>
                          {exceeded && <AlertTriangle className="w-3 h-3" />}
                          {p.etaDate || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-surface-500">{p.receivedPartsCount}/{p.totalPartsCount}</span>
                        </div>
                      </td>
                      <td className="text-sm">{p.vendorName || '—'}</td>
                      <td>
                        <span className={`font-mono text-xs ${exceeded ? 'text-red-500 font-bold' : 'text-surface-500'}`}>
                          {daysSince(p.createdAt)}d
                        </span>
                      </td>
                      <td>
                        <button className="btn-primary btn-sm" onClick={() => openUpdate(p)}>
                          <RefreshCw className="w-3 h-3" /> Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Update Modal */}
      <Modal isOpen={showUpdate} onClose={() => setShowUpdate(false)} title={`Update Parts — ${selected?.vehicleNumber}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Order Status</label>
                <select className="select" value={updateForm.orderStatus} onChange={e => setUpdateForm(f => ({ ...f, orderStatus: e.target.value }))}>
                  {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Vendor Name</label>
                <input className="input" placeholder="Vendor" value={updateForm.vendorName} onChange={e => setUpdateForm(f => ({ ...f, vendorName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Order Date</label>
                <input type="date" className="input" value={updateForm.orderDate} onChange={e => setUpdateForm(f => ({ ...f, orderDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">ETA Date</label>
                <input type="date" className="input" value={updateForm.etaDate} onChange={e => setUpdateForm(f => ({ ...f, etaDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Received Date</label>
                <input type="date" className="input" value={updateForm.receivedDate} onChange={e => setUpdateForm(f => ({ ...f, receivedDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Invoice Number</label>
                <input className="input" placeholder="INV-001" value={updateForm.invoiceNumber} onChange={e => setUpdateForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
              </div>
              <div>
                <label className="label">Total Parts</label>
                <input type="number" min="0" className="input" value={updateForm.totalPartsCount} onChange={e => setUpdateForm(f => ({ ...f, totalPartsCount: +e.target.value }))} />
              </div>
              <div>
                <label className="label">Received Parts</label>
                <input type="number" min="0" className="input" value={updateForm.receivedPartsCount} onChange={e => setUpdateForm(f => ({ ...f, receivedPartsCount: +e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Pending Items</label>
                <textarea className="input" placeholder="List pending parts..." value={updateForm.pendingItems} onChange={e => setUpdateForm(f => ({ ...f, pendingItems: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Back Order Items</label>
                <textarea className="input" placeholder="Back-ordered parts..." value={updateForm.backOrderItems} onChange={e => setUpdateForm(f => ({ ...f, backOrderItems: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Remarks</label>
                <textarea className="input" placeholder="Additional notes..." value={updateForm.remarks} onChange={e => setUpdateForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>

            {/* Previous Logs */}
            {selected.logs?.length > 0 && (
              <div>
                <label className="label">Update History</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...selected.logs].reverse().map((log, i) => (
                    <div key={i} className="bg-surface-50 dark:bg-surface-700/30 rounded-lg p-3 text-xs">
                      <div className="flex justify-between text-surface-400 mb-1">
                        <span>{log.updatedBy}</span>
                        <span>{log.updatedAt}</span>
                      </div>
                      <span className="font-medium">{log.orderStatus}</span>
                      {log.remarks && <span className="text-surface-500"> — {log.remarks}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowUpdate(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdate} disabled={updating}>
                {updating ? 'Saving...' : 'Save Update'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  };
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-surface-900 dark:text-white">{value}</div>
      <div className="text-xs text-surface-500">{label}</div>
    </div>
  );
}

function OrderStatusBadge({ status }) {
  const map = {
    'Pending': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    'Ordered': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    'Partially Received': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    'Fully Received': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    'Back Order': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  };
  return (
    <span className={`badge ${map[status] || 'badge'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status || 'Unknown'}
    </span>
  );
}
