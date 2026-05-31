import React from 'react';
import { STATUS_LABELS } from '@/utils/constants';
import { getStatusBadgeClass } from '@/utils/helpers';

export default function StatusBadge({ status, showLabel = true, size = 'default' }) {
  if (!status) return null;
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={`${getStatusBadgeClass(status)} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {showLabel && (size === 'sm' ? status : label)}
    </span>
  );
}
