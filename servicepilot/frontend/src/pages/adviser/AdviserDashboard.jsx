import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { subscribeVehicles } from '@/utils/firestoreService';
import { formatDate, daysSince } from '@/utils/helpers';
import { VEHICLE_STATUSES } from '@/utils/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import { Car, Clock, CheckCircle, AlertTriangle, Plus, ArrowRight } from 'lucide-react';

export default function AdviserDashboard() {
  const { user, userProfile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      setVehicles(data);
      setLoading(false);
    }, { adviserId: user.uid });
    return unsub;
  }, [user.uid]);

  const stats = {
    total: vehicles.length,
    wda: vehicles.filter(v => v.currentStatus === 'WDA').length,
    wia: vehicles.filter(v => v.currentStatus === 'WIA').length,
    wca: vehicles.filter(v => v.currentStatus === 'WCA').length,
    wfa: vehicles.filter(v => v.currentStatus === 'WFA').length,
    active: vehicles.filter(v => !['Delivered'].includes(v.currentStatus)).length,
  };

  const recent = vehicles.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'},{' '}
            <span className="text-gradient">{userProfile?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-surface-500 mt-0.5 text-sm">Here's what's happening with your vehicles today</p>
        </div>
        <Link to="/adviser/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Intake
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total Vehicles" value={stats.total} color="brand" />
        <StatCard icon={Clock} label="Waiting (WDA/WIA)" value={stats.wda + stats.wia} color="yellow" />
        <StatCard icon={AlertTriangle} label="Pending Approval" value={stats.wca + stats.wfa} color="orange" />
        <StatCard icon={CheckCircle} label="Active Cases" value={stats.active} color="green" />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {['WDA', 'WIA', 'WCA', 'WFA'].map(status => (
          <div key={status} className="card p-4 text-center">
            <div className="text-2xl font-bold text-surface-900 dark:text-white mb-1">
              {vehicles.filter(v => v.currentStatus === status).length}
            </div>
            <StatusBadge status={status} size="sm" />
          </div>
        ))}
      </div>

      {/* Recent vehicles */}
      <div className="card">
        <div className="p-5 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between">
          <h2 className="font-bold text-surface-900 dark:text-white">Recent Vehicles</h2>
          <Link to="/adviser/all" className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div className="p-8 text-center text-surface-400">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="p-8 text-center">
              <Car className="w-10 h-10 text-surface-300 mx-auto mb-2" />
              <p className="text-surface-400 text-sm">No vehicles yet. <Link to="/adviser/new" className="text-brand-600">Create your first intake</Link></p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle No.</th>
                  <th>Customer</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Promise Date</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(v => (
                  <tr key={v.id}>
                    <td className="font-mono font-medium">{v.vehicleNumber}</td>
                    <td>{v.customerName}</td>
                    <td>{v.vehicleModel}</td>
                    <td><StatusBadge status={v.currentStatus} /></td>
                    <td>{formatDate(v.promisedDeliveryDate)}</td>
                    <td>
                      <span className={`font-mono text-xs ${daysSince(v.statusEnteredAt) > 2 ? 'text-red-500' : 'text-surface-500'}`}>
                        {daysSince(v.statusEnteredAt)}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    brand: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
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
