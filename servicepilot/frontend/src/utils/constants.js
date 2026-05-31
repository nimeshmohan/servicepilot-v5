export const ROLES = {
  SERVICE_MANAGER: 'service_manager',
  SERVICE_ADVISER: 'service_adviser',
  JOB_CONTROLLER: 'job_controller',
  PARTS_ALLOCATOR: 'parts_allocator',
};

export const ROLE_LABELS = {
  service_manager: 'Service Manager',
  service_adviser: 'Service Adviser',
  job_controller: 'Job Controller',
  parts_allocator: 'Parts Allocator',
};

export const VEHICLE_STATUSES = {
  WDA: 'WDA',
  WIA: 'WIA',
  WCA: 'WCA',
  WFA: 'WFA',
  WIP: 'WIP',
  PNA: 'PNA',
  QC: 'QC',
  WASHING: 'Washing',
  RFD: 'RFD',
  DELIVERED: 'Delivered',
};

export const STATUS_LABELS = {
  WDA: 'Waiting for Documents Approval',
  WIA: 'Waiting for Insurance Approval',
  WCA: 'Waiting for Customer Approval',
  WFA: 'Waiting for Allocation',       // ← renamed from "Waiting for Final Approval"
  WIP: 'Work In Progress',
  PNA: 'Parts Not Available',
  QC: 'Quality Check',
  Washing: 'Washing',
  RFD: 'Ready For Delivery',
  Delivered: 'Delivered',
};

export const STATUS_FLOW_ADVISER = ['WDA', 'WIA', 'WCA', 'WFA'];
export const STATUS_FLOW_JC = ['WIP', 'PNA', 'QC', 'Washing', 'RFD'];

export const WIP_SUBSTATUS = [
  'Denting',
  'Putty Work',
  'Painting',
  'Fitting',
  'Polishing',
  'Mechanical Work',
  'Resurvey',
];

export const VEHICLE_MODELS = [
  'Kylaq', 'Kushaq', 'Slavia', 'Kodiaq',
  'Rapid', 'Superb', 'Octavia', 'Yeti', 'Fabia', 'Others',
];

export const REPAIR_TYPES = ['ACC REP', 'BP'];
export const REPAIR_CATEGORIES = ['Minor', 'Major'];

export const INSURANCE_COMPANIES = [
  'ICICI Lombard', 'HDFC ERGO', 'Bajaj Allianz', 'New India Assurance',
  'United India Insurance', 'Oriental Insurance', 'National Insurance',
  'Reliance General', 'Tata AIG', 'Cholamandalam', 'Royal Sundaram',
  'Future Generali', 'Bharti AXA', 'Digit Insurance', 'Others',
];

// Only these 4 statuses are tracked for delays
export const DELAY_THRESHOLDS = {
  WFA: 5,   // Waiting for Allocation — 5 days
  WIA: 3,   // Waiting for Insurance Approval — 3 days
  RFD: 3,   // Ready For Delivery — 3 days
  PNA: 7,   // Parts Not Available — 7 days
};

export const STATUS_COLORS = {
  WDA: '#3b82f6',
  WIA: '#eab308',
  WCA: '#f97316',
  WFA: '#a855f7',
  WIP: '#6366f1',
  PNA: '#ef4444',
  QC: '#14b8a6',
  Washing: '#06b6d4',
  RFD: '#22c55e',
  Delivered: '#10b981',
};
