import React, { useEffect, useState } from 'react';
import { subscribeVehicles } from '@/utils/firestoreService';
import { daysSince, formatDate, downloadExcel } from '@/utils/helpers';
import { STATUS_COLORS } from '@/utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

export default function Analytics() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      setVehicles(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Last 7 days intake
  const intakeData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'MMM dd');
    const count = vehicles.filter(v => {
      const created = v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.createdAt);
      return format(created, 'MMM dd') === dateStr;
    }).length;
    return { date: dateStr, count };
  });

  // Model breakdown
  const modelData = vehicles.reduce((acc, v) => {
    acc[v.vehicleModel] = (acc[v.vehicleModel] || 0) + 1;
    return acc;
  }, {});
  const modelChart = Object.entries(modelData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Insurance breakdown
  const insuranceData = vehicles.reduce((acc, v) => {
    acc[v.insuranceCompany] = (acc[v.insuranceCompany] || 0) + 1;
    return acc;
  }, {});
  const insuranceChart = Object.entries(insuranceData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Status distribution
  const statusData = vehicles.reduce((acc, v) => {
    acc[v.currentStatus] = (acc[v.currentStatus] || 0) + 1;
    return acc;
  }, {});
  const statusChart = Object.entries(statusData).map(([name, value]) => ({ name, value }));

  // Repair type
  const repairData = vehicles.reduce((acc, v) => {
    acc[v.repairType] = (acc[v.repairType] || 0) + 1;
    return acc;
  }, {});

  // Avg days per status
  const avgDays = vehicles.reduce((acc, v) => {
    const d = daysSince(v.statusEnteredAt);
    if (!acc[v.currentStatus]) acc[v.currentStatus] = { total: 0, count: 0 };
    acc[v.currentStatus].total += d;
    acc[v.currentStatus].count += 1;
    return acc;
  }, {});
  const avgDaysChart = Object.entries(avgDays).map(([name, { total, count }]) => ({
    name, avg: Math.round(total / count)
  }));

  const COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#14b8a6', '#eab308'];

  const handleExport = () => {
    const data = vehicles.map(v => ({
      'Vehicle Number': v.vehicleNumber,
      'Model': v.vehicleModel,
      'Repair Type': v.repairType,
      'Category': v.repairCategory,
      'Status': v.currentStatus,
      'Insurance': v.insuranceCompany,
      'Adviser': v.adviserName,
      'Days in Status': daysSince(v.statusEnteredAt),
      'Intake Date': formatDate(v.createdAt),
    }));
    downloadExcel(data, 'analytics_report');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Analytics</h1>
          <p className="text-surface-500 text-sm mt-0.5">Workshop performance insights</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI label="Total Vehicles" value={vehicles.length} />
        <KPI label="Active" value={vehicles.filter(v => v.currentStatus !== 'Delivered').length} />
        <KPI label="Delivered" value={vehicles.filter(v => v.currentStatus === 'Delivered').length} />
        <KPI label="Minor Repairs" value={vehicles.filter(v => v.repairCategory === 'Minor').length} />
      </div>

      {/* Intake Trend */}
      <div className="card p-5">
        <h3 className="font-bold text-surface-900 dark:text-white mb-4">Vehicle Intake — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={intakeData}>
            <defs>
              <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="url(#intakeGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model breakdown */}
        <div className="card p-5">
          <h3 className="font-bold text-surface-900 dark:text-white mb-4">By Vehicle Model</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={modelChart} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insurance */}
        <div className="card p-5">
          <h3 className="font-bold text-surface-900 dark:text-white mb-4">By Insurance Company</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={insuranceChart} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                {insuranceChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Avg days per status */}
        <div className="card p-5">
          <h3 className="font-bold text-surface-900 dark:text-white mb-4">Avg Days Per Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgDaysChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {avgDaysChart.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Repair types */}
        <div className="card p-5">
          <h3 className="font-bold text-surface-900 dark:text-white mb-4">Repair Type Split</h3>
          <div className="space-y-4 pt-4">
            {Object.entries(repairData).map(([type, count]) => {
              const pct = vehicles.length > 0 ? Math.round((count / vehicles.length) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-surface-700 dark:text-surface-300">{type}</span>
                    <span className="font-semibold text-surface-900 dark:text-white">{count} <span className="text-surface-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="stat-card">
      <div className="text-3xl font-bold text-surface-900 dark:text-white">{value}</div>
      <div className="text-sm text-surface-500">{label}</div>
    </div>
  );
}
