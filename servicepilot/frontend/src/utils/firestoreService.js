import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, onSnapshot, serverTimestamp,
  arrayUnion, setDoc, limit,
} from 'firebase/firestore';
import { db } from '@/firebase';

// ─── USERS ───────────────────────────────────────────────────────────────────

export const getUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getUserById = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUser = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const subscribeUsers = (callback) => {
  const q = query(collection(db, 'users'));
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(docs);
  });
};

// ─── VEHICLES ────────────────────────────────────────────────────────────────

export const createVehicle = async (data) => {
  const ref = await addDoc(collection(db, 'vehicles'), {
    ...data,
    currentStatus: 'WDA',
    statusEnteredAt: serverTimestamp(),
    isDelayed: false,
    isDelivered: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Log initial status
  await addDoc(collection(db, 'vehicleStatusHistory'), {
    vehicleId: ref.id,
    vehicleNumber: data.vehicleNumber,
    status: 'WDA',
    previousStatus: null,
    remarks: data.remarks || 'Vehicle intake created',
    updatedBy: data.adviserName,
    updatedByRole: 'service_adviser',
    timestamp: serverTimestamp(),
  });

  return ref;
};

export const updateVehicleStatus = async (vehicleId, { status, subStatus, remarks, updatedBy, updatedByRole, previousStatus, additionalData = {} }) => {
  const vehicleRef = doc(db, 'vehicles', vehicleId);

  const updateData = {
    currentStatus: status,
    subStatus: subStatus || null,
    previousStatus,
    statusEnteredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDelivered: status === 'Delivered',
    ...additionalData,
  };

  await updateDoc(vehicleRef, updateData);

  // Log history
  await addDoc(collection(db, 'vehicleStatusHistory'), {
    vehicleId,
    status,
    subStatus: subStatus || null,
    previousStatus,
    remarks: remarks || '',
    updatedBy,
    updatedByRole,
    timestamp: serverTimestamp(),
  });

  // Auto-create parts tracking when entering PNA
  if (status === 'PNA') {
    const vehicleSnap = await getDoc(vehicleRef);
    const vehicle = vehicleSnap.data();
    await setDoc(doc(db, 'partsTracking', vehicleId), {
      vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      jobCardNumber: vehicle.jobCardNumber,
      adviserId: vehicle.adviserId,
      adviserName: vehicle.adviserName,
      orderStatus: 'Pending',
      orderDate: null,
      etaDate: null,
      receivedDate: null,
      pendingItems: [],
      backOrderItems: [],
      vendorName: '',
      invoiceNumber: '',
      totalPartsCount: 0,
      receivedPartsCount: 0,
      pendingPartsCount: 0,
      remarks: '',
      updatedBy,
      updatedAt: serverTimestamp(),
      logs: [],
      etaExceeded: false,
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
};

export const getVehicles = async (filters = {}) => {
  let q = collection(db, 'vehicles');
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.adviserId) constraints.unshift(where('adviserId', '==', filters.adviserId));
  if (filters.status) constraints.unshift(where('currentStatus', '==', filters.status));
  const snap = await getDocs(query(q, ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getVehicleById = async (id) => {
  const snap = await getDoc(doc(db, 'vehicles', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeVehicles = (callback, filters = {}) => {
  const constraints = [];
  if (filters.adviserId) constraints.push(where('adviserId', '==', filters.adviserId));
  if (filters.status) constraints.push(where('currentStatus', '==', filters.status));
  const q = query(collection(db, 'vehicles'), ...constraints);
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side to avoid composite index requirement
    docs.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    callback(docs);
  });
};

export const subscribeVehicleHistory = (vehicleId, callback) => {
  const q = query(
    collection(db, 'vehicleStatusHistory'),
    where('vehicleId', '==', vehicleId)
  );
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
    callback(docs);
  });
};

// ─── PARTS TRACKING ──────────────────────────────────────────────────────────

export const getPartsTracking = async (vehicleId) => {
  const snap = await getDoc(doc(db, 'partsTracking', vehicleId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribePartsTracking = (callback) => {
  const q = query(collection(db, 'partsTracking'));
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(docs);
  });
};

export const updatePartsTracking = async (vehicleId, data, updatedBy) => {
  const logEntry = {
    action: 'Parts updated',
    updatedBy,
    timestamp: new Date().toISOString(),
    orderStatus: data.orderStatus,
    receivedPartsCount: data.receivedPartsCount,
    pendingPartsCount: data.pendingPartsCount,
  };

  await updateDoc(doc(db, 'partsTracking', vehicleId), {
    ...data,
    updatedAt: serverTimestamp(),
    logs: arrayUnion(logEntry),
  });
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const createNotification = async (data) => {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
};

export const subscribeNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(20)
  );
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(docs);
  });
};

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export const getDashboardStats = async (adviserId = null) => {
  const constraints = adviserId ? [where('adviserId', '==', adviserId)] : [];
  const snap = await getDocs(query(collection(db, 'vehicles'), ...constraints));
  const vehicles = snap.docs.map(d => d.data());

  return {
    total: vehicles.length,
    byStatus: vehicles.reduce((acc, v) => {
      acc[v.currentStatus] = (acc[v.currentStatus] || 0) + 1;
      return acc;
    }, {}),
    delayed: vehicles.filter(v => v.isDelayed).length,
    delivered: vehicles.filter(v => v.isDelivered).length,
  };
};
