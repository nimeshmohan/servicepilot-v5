import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { STATUS_COLORS, STATUS_LABELS, DELAY_THRESHOLDS } from './constants';

export const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'dd MMM yyyy');
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'dd MMM yyyy, hh:mm a');
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return formatDistanceToNow(date, { addSuffix: true });
};

export const daysSince = (timestamp) => {
  if (!timestamp) return 0;
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return differenceInDays(new Date(), date);
};

export const isDelayed = (status, statusEnteredAt) => {
  const threshold = DELAY_THRESHOLDS[status];
  if (!threshold || !statusEnteredAt) return false;
  return daysSince(statusEnteredAt) >= threshold;
};

export const getStatusColor = (status) => STATUS_COLORS[status] || '#64748b';

export const getStatusLabel = (status) => STATUS_LABELS[status] || status;

export const getStatusBadgeClass = (status) => {
  const map = {
    WDA: 'badge-wda', WIA: 'badge-wia', WCA: 'badge-wca', WFA: 'badge-wfa',
    WIP: 'badge-wip', PNA: 'badge-pna', QC: 'badge-qc',
    Washing: 'badge-washing', RFD: 'badge-rfd', Delivered: 'badge-delivered',
  };
  return map[status] || 'badge';
};

export const generateVehicleId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `SP-${timestamp}-${random}`;
};

export const formatMobile = (mobile) => {
  if (!mobile) return '—';
  const cleaned = mobile.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return mobile;
};

export const downloadExcel = (data, filename) => {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  });
};

export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const classNames = (...classes) => classes.filter(Boolean).join(' ');

export const truncate = (str, n = 30) =>
  str && str.length > n ? str.slice(0, n) + '...' : str;
