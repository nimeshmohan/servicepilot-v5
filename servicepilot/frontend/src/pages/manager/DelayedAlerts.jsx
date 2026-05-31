import React, { useEffect, useState } from 'react';
import { subscribeVehicles } from '@/utils/firestoreService';
import { daysSince, formatDate } from '@/utils/helpers';
import { DELAY_THRESHOLDS, STATUS_LABELS } from '@/utils/constants';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import VehicleTimeline from '@/components/shared/VehicleTimeline';
import { AlertTriangle, Eye } from 'lucide-react';

export default function DelayedAlerts() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsub = subscribeVehicles((data) => {
      setVehicles(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const delayed = vehicles.filter(v => {
    const threshold = DELAY_THRESHOLDS[v.currentStatus];
    return threshold && daysSince(v.statusEnteredAt) >= threshold;
  }).sort((a, b) => daysSince(b.statusEnteredAt) - daysSince(a.statusEnteredAt));

  const critical = delayed.filter(v => daysSince(v.statusEnteredAt) >= (DELAY_THRESHOLDS[v.currentStatus] || 0) * 2);
  const warning  = delayed.filter(v => daysSince(v.statusEnteredAt) <  (DELAY_THRESHOLDS[v.currentStatus] || 0) * 2);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" /> Delayed Alerts
        </h1>
        <p className="text-surface-500 text-sm mt-0.5">
          {delayed.length} vehicle{delayed.length !== 1 ? 's' : ''} exceeding expected turnaround time
        </p>
      </div>

      {/* Summary cards — only the 4 tracked statuses */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(DELAY_THRESHOLDS).map(([status, days]) => {
          const count = delayed.filter(v => v.currentStatus === status).length;
          return (
            <div key={status} className={`card p-4 border-l-4 ${count > 0 ? 'border-l-red-500' : 'border-l-surface-200 dark:border-l-surface-700'}`}>
              <div className="text-2xl font-bold text-surface-900 dark:text-white">{count}</div>
              <StatusBadge status={status} size="sm" />
              <div className="text-xs text-surface-400 mt-1">Threshold: &gt;{days}d</div>
              <div className="text-xs text-surface-300 mt-0.5 truncate">{STATUS_LABELS[status]}</div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="p-8 text-center text-surface-400">Loading...</div>
      ) : delayed.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7 text-green-500" />
          </div>
          <h3 className="font-bold text-surface-900 dark:text-white mb-1">All Clear!</h3>
          <p className="text-surface-400 text-sm">No vehicles are currently delayed.</p>
        </div>
      ) : (
        <>
          {critical.length > 0 && (
            <Section title="Critical Delays" items={critical} onView={setSelected} color="red" />
          )}
          {warning.length > 0 && (
            <Section title="Warning" items={warning} onView={setSelected} color="orange" />
          )}
        </>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Timeline — ${selected?.vehicleNumber}`} size="lg">
        {selected && <VehicleTimeline vehicleId={selected.id} />}
      </Modal>
    </div>
  );
}

function Section({ title, items, onView, color }) {
  return (
    <div>
      <h3 className={`font-bold mb-3 flex items-center gap-2 ${color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
        <AlertTriangle className="w-4 h-4" /> {title} ({items.length})
      </h3>
      <div className="space-y-2">
        {items.map(v => {
          const days = daysSince(v.statusEnteredAt);
          const threshold = DELAY_THRESHOLDS[v.currentStatus];
          const overBy = days - threshold;
          const customerName = v.customerDetails?.name || v.customerName || '—';
          return (
            <div key={v.id} className={`card p-4 flex items-center gap-4 border-l-4 ${color === 'red' ? 'border-l-red-500' : 'border-l-orange-400'}`}>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <div className="text-xs text-surface-400">Vehicle</div>
                  <div className="font-mono font-semibold text-brand-600 dark:text-brand-400">{v.vehicleNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-surface-400">Customer</div>
                  <div className="font-medium text-sm">{customerName}</div>
                </div>
                <div>
                  <div className="text-xs text-surface-400">Status</div>
                  <StatusBadge status={v.currentStatus} />
                </div>
                <div>
                  <div className="text-xs text-surface-400">Days in Status / Over</div>
                  <div className="font-semibold text-sm">
                    <span className="text-red-500">{days}d</span>
                    <span className="text-surface-400 font-normal ml-1">/ +{overBy}d over</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-400">Adviser</div>
                  <div className="text-sm">{v.adviserName || '—'}</div>
                </div>
              </div>
              <button className="btn-ghost btn-sm p-1.5 flex-shrink-0" onClick={() => onView(v)}>
                <Eye className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
