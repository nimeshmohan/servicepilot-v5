import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeVehicles } from '@/utils/firestoreService';
import { formatDate, daysSince, isDelayed, downloadExcel } from '@/utils/helpers';
import { DELAY_THRESHOLDS, STATUS_COLORS } from '@/utils/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import VehicleTimeline from '@/components/shared/VehicleTimeline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Car, Users, AlertTriangle, CheckCircle, Download, Search, Eye, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ALL_STATUSES = ['WDA', 'WIA', 'WCA', 'WFA', 'WIP', 'PNA', 'QC', 'Washing', 'RFD', 'Delivered'];

export default function ManagerDashboard() {
  const { userProfile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      setVehicles(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.currentStatus !== 'Delivered').length,
    delayed: vehicles.filter(v => {
      const threshold = DELAY_THRESHOLDS[v.currentStatus];
      return threshold && daysSince(v.statusEnteredAt) >= threshold;
    }).length,
    delivered: vehicles.filter(v => v.currentStatus === 'Delivered').length,
  };

  const chartData = ALL_STATUSES.slice(0, -1).map(s => ({
    name: s,
    count: vehicles.filter(v => v.currentStatus === s).length,
  })).filter(d => d.count > 0);

  const pieData = chartData;

  const filtered = vehicles.filter(v => {
    const matchSearch = !search ||
      v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      v.jobCardNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.currentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExport = () => {
    const data = vehicles.map(v => ({
      'Vehicle Number': v.vehicleNumber,
      'Customer Name': v.customerName,
      'Mobile': v.customerMobile,
      'Model': v.vehicleModel,
      'Repair Type': v.repairType,
      'Insurance': v.insuranceCompany,
      'Status': v.currentStatus,
      'Job Card': v.jobCardNumber,
      'Adviser': v.adviserName,
      'Promise Date': formatDate(v.promisedDeliveryDate),
      'Days in Status': daysSince(v.statusEnteredAt),
    }));
    downloadExcel(data, 'all_vehicles_report');
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Manager Dashboard
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">Complete workshop overview — real-time</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" /> Export All
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MgrStat icon={Car} label="Total Vehicles" value={stats.total} sub="All time" color="brand" />
        <MgrStat icon={TrendingUp} label="Active Cases" value={stats.active} sub="In progress" color="blue" />
        <MgrStat icon={AlertTriangle} label="Delayed" value={stats.delayed} sub="Needs attention" color="red" />
        <MgrStat icon={CheckCircle} label="Delivered" value={stats.delivered} sub="Completed" color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="card p-5">
          <h3 className="font-bold text-surface-900 dark:text-white mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="font-bold text-surface-900 dark:text-white mb-4">Vehicle Status Mix</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="count">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#0ea5e9'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Delayed Vehicles Alert */}
      {stats.delayed > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-700 dark:text-red-400">{stats.delayed} Delayed Vehicles</h3>
          </div>
          <div className="space-y-2">
            {vehicles.filter(v => {
              const threshold = DELAY_THRESHOLDS[v.currentStatus];
              return threshold && daysSince(v.statusEnteredAt) >= threshold;
            }).slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center gap-3 bg-white dark:bg-surface-800 rounded-xl p-3">
                <span className="font-mono font-semibold text-sm text-brand-600 dark:text-brand-400">{v.vehicleNumber}</span>
                <StatusBadge status={v.currentStatus} />
                <span className="text-red-500 font-semibold text-sm">{daysSince(v.statusEnteredAt)}d</span>
                <span className="text-surface-500 text-sm flex-1">{v.customerName}</span>
                <span className="text-surface-400 text-xs">Adviser: {v.adviserName || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Vehicles Table */}
      <div className="card">
        <div className="p-5 border-b border-surface-100 dark:border-surface-700 flex flex-col sm:flex-row gap-3">
          <h3 className="font-bold text-surface-900 dark:text-white">All Vehicles</h3>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input pl-9 text-sm py-2" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setStatusFilter('all')} className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All</button>
            {['WIP', 'PNA', 'QC', 'WFA', 'RFD'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>{s}</button>
            ))}
          </div>
        </div>

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
                  <th>Status</th><th>Adviser</th><th>Days</th>
                  <th>Promise Date</th><th>Actions</th>
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
                        <div className="font-medium">{v.customerName}</div>
                        <div className="text-xs text-surface-400">{v.jobCardNumber}</div>
                      </td>
                      <td>{v.vehicleModel}</td>
                      <td><StatusBadge status={v.currentStatus} /></td>
                      <td className="text-sm">{v.adviserName || '—'}</td>
                      <td>
                        <span className={`font-mono text-sm font-semibold flex items-center gap-1 ${delayed ? 'text-red-500' : 'text-surface-500'}`}>
                          {delayed && <AlertTriangle className="w-3 h-3" />}
                          {days}d
                        </span>
                      </td>
                      <td>{formatDate(v.promisedDeliveryDate)}</td>
                      <td>
                        <button className="btn-ghost btn-sm p-1.5" onClick={() => setSelected(v)}>
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Vehicle Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Vehicle — ${selected?.vehicleNumber}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Vehicle No.', selected.vehicleNumber, true],
                ['Model', selected.vehicleModel],
                ['Customer', selected.customerName],
                ['Mobile', selected.customerMobile],
                ['Insurance', selected.insuranceCompany],
                ['Job Card', selected.jobCardNumber, true],
                ['Repair Type', selected.repairType],
                ['Category', selected.repairCategory],
                ['Adviser', selected.adviserName],
                ['Promise Date', formatDate(selected.promisedDeliveryDate)],
              ].map(([label, value, mono]) => (
                <div key={label}>
                  <div className="text-xs text-surface-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
                  <div className={`font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
                </div>
              ))}
              <div>
                <div className="text-xs text-surface-400 font-medium uppercase tracking-wide mb-0.5">Status</div>
                <StatusBadge status={selected.currentStatus} />
              </div>
            </div>
            {selected.remarks && (
              <div className="bg-surface-50 dark:bg-surface-700/30 rounded-xl p-3 text-sm">
                <span className="font-semibold text-surface-400 text-xs uppercase block mb-1">Remarks</span>
                {selected.remarks}
              </div>
            )}
            <div>
              <h4 className="font-semibold mb-3">Status Timeline</h4>
              <VehicleTimeline vehicleId={selected.id} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function MgrStat({ icon: Icon, label, value, sub, color }) {
  const map = {
    brand: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  };
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${map[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-bold text-surface-900 dark:text-white">{value}</div>
      <div className="font-semibold text-sm text-surface-700 dark:text-surface-300">{label}</div>
      <div className="text-xs text-surface-400">{sub}</div>
    </div>
  );
}
