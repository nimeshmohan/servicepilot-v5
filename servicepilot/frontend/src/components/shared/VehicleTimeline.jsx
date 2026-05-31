import React, { useEffect, useState } from 'react';
import { subscribeVehicleHistory } from '@/utils/firestoreService';
import { formatDateTime } from '@/utils/helpers';
import { STATUS_LABELS, STATUS_COLORS } from '@/utils/constants';
import { Clock, User } from 'lucide-react';

export default function VehicleTimeline({ vehicleId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!vehicleId) return;
    const unsub = subscribeVehicleHistory(vehicleId, setHistory);
    return unsub;
  }, [vehicleId]);

  if (!history.length) {
    return <div className="text-surface-400 text-sm py-4 text-center">No history yet</div>;
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const color = STATUS_COLORS[entry.currentStatus] || '#64748b';
        const isLast = i === history.length - 1;
        return (
          <div key={entry.id} className="timeline-item">
            {!isLast && <div className="timeline-line" />}
            <div
              className="timeline-dot w-7 h-7 flex-shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm text-surface-900 dark:text-white">
                    {STATUS_LABELS[entry.currentStatus] || entry.currentStatus}
                    {entry.subStatus && <span className="ml-1 text-surface-400 font-normal">— {entry.subStatus}</span>}
                  </div>
                  {entry.previousStatus && (
                    <div className="text-xs text-surface-400 mt-0.5">
                      From: {STATUS_LABELS[entry.previousStatus] || entry.previousStatus}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-surface-400 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(entry.timestamp)}
                </div>
              </div>
              {entry.remarks && (
                <div className="mt-1.5 text-sm text-surface-600 dark:text-surface-400 bg-surface-50 dark:bg-surface-700/30 rounded-lg px-3 py-2">
                  {entry.remarks}
                </div>
              )}
              {entry.updatedBy && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-surface-400">
                  <User className="w-3 h-3" />
                  Updated by: {entry.updatedByName || entry.updatedBy}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
