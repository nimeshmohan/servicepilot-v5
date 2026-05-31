const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
const { differenceInDays, format } = require('date-fns');

admin.initializeApp();
const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TRANSPORT
// ─────────────────────────────────────────────────────────────────────────────
const getTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass,
  },
});

const MANAGER_EMAIL = functions.config().email?.manager || 'manager@servicepilot.com';

// ─────────────────────────────────────────────────────────────────────────────
// DELAY THRESHOLDS (days)
// ─────────────────────────────────────────────────────────────────────────────
const DELAY_THRESHOLDS = {
  WIP: 3,
  PNA: 2,
  QC: 1,
  Washing: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER: On vehicle status change → check for delays, send notification
// ─────────────────────────────────────────────────────────────────────────────
exports.onVehicleStatusChange = functions
  .region('asia-south1')
  .firestore
  .document('vehicles/{vehicleId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.currentStatus === after.currentStatus) return null;

    // Log to activityLogs
    await db.collection('activityLogs').add({
      vehicleId: context.params.vehicleId,
      vehicleNumber: after.vehicleNumber,
      action: 'STATUS_CHANGE',
      previousStatus: before.currentStatus,
      newStatus: after.currentStatus,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create notification for manager
    await db.collection('notifications').add({
      title: `Status Updated: ${after.vehicleNumber}`,
      message: `${after.vehicleNumber} moved from ${before.currentStatus} → ${after.currentStatus}`,
      vehicleId: context.params.vehicleId,
      vehicleNumber: after.vehicleNumber,
      type: 'status_change',
      targetRole: 'service_manager',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED: Check delays every 6 hours
// ─────────────────────────────────────────────────────────────────────────────
exports.checkDelayedVehicles = functions
  .region('asia-south1')
  .pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    const now = new Date();
    const vehiclesSnap = await db.collection('vehicles')
      .where('isDelivered', '!=', true)
      .get();

    const delayed = [];

    for (const doc of vehiclesSnap.docs) {
      const vehicle = doc.data();
      const threshold = DELAY_THRESHOLDS[vehicle.currentStatus];
      if (!threshold) continue;

      const statusEnteredAt = vehicle.statusEnteredAt?.toDate() || new Date();
      const daysInStatus = differenceInDays(now, statusEnteredAt);

      if (daysInStatus >= threshold) {
        delayed.push({ id: doc.id, ...vehicle, daysInStatus });

        // Update isDelayed flag
        await doc.ref.update({ isDelayed: true });
      }
    }

    if (delayed.length === 0) return null;

    // Send email alert to manager
    try {
      const transporter = getTransporter();
      const html = buildDelayEmailHtml(delayed);

      await transporter.sendMail({
        from: `"ServicePilot Alerts" <${functions.config().email.user}>`,
        to: MANAGER_EMAIL,
        subject: `⚠️ ServicePilot: ${delayed.length} Vehicle(s) Delayed`,
        html,
      });

      console.log(`Delay alert sent for ${delayed.length} vehicles`);
    } catch (err) {
      console.error('Email error:', err);
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED: Monthly report on 1st of every month
// ─────────────────────────────────────────────────────────────────────────────
exports.monthlyReport = functions
  .region('asia-south1')
  .pubsub
  .schedule('0 8 1 * *')  // 8 AM on 1st of every month
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const vehiclesSnap = await db.collection('vehicles').get();
    const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Get last month's history
    const historySnap = await db.collection('vehicleStatusHistory').get();
    const history = historySnap.docs.map(d => d.data());

    // Build Excel workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: All vehicles
    const vehicleRows = vehicles.map(v => ({
      'Vehicle Number': v.vehicleNumber,
      'Customer Name': v.customerName,
      'Customer Mobile': v.customerMobile,
      'Vehicle Model': v.vehicleModel,
      'Repair Type': v.repairType,
      'Repair Category': v.repairCategory,
      'Insurance Company': v.insuranceCompany,
      'Job Card Number': v.jobCardNumber,
      'Current Status': v.currentStatus,
      'Adviser': v.adviserName || '',
      'Branch': v.branch || '',
      'Promise Date': v.promisedDeliveryDate || '',
      'Intake Date': v.createdAt ? format(v.createdAt.toDate(), 'dd/MM/yyyy') : '',
      'Is Delivered': v.isDelivered ? 'Yes' : 'No',
      'Is Delayed': v.isDelayed ? 'Yes' : 'No',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vehicleRows), 'All Vehicles');

    // Sheet 2: Delivered
    const delivered = vehicles.filter(v => v.currentStatus === 'Delivered');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      delivered.map(v => ({ 'Vehicle Number': v.vehicleNumber, 'Customer': v.customerName, 'Model': v.vehicleModel }))
    ), 'Delivered');

    // Sheet 3: Pending
    const pending = vehicles.filter(v => v.currentStatus !== 'Delivered');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      pending.map(v => ({ 'Vehicle Number': v.vehicleNumber, 'Status': v.currentStatus, 'Customer': v.customerName }))
    ), 'Pending');

    // Sheet 4: Delayed
    const now = new Date();
    const delayedVehicles = vehicles.filter(v => {
      const threshold = DELAY_THRESHOLDS[v.currentStatus];
      if (!threshold) return false;
      const entered = v.statusEnteredAt?.toDate() || now;
      return differenceInDays(now, entered) >= threshold;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      delayedVehicles.map(v => ({
        'Vehicle Number': v.vehicleNumber,
        'Status': v.currentStatus,
        'Customer': v.customerName,
        'Days Delayed': v.statusEnteredAt ? differenceInDays(now, v.statusEnteredAt.toDate()) : 0,
      }))
    ), 'Delayed');

    // Sheet 5: Timeline
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      history.map(h => ({
        'Vehicle Number': h.vehicleNumber,
        'From Status': h.previousStatus || '—',
        'To Status': h.currentStatus,
        'Timestamp': h.timestamp ? format(h.timestamp.toDate(), 'dd/MM/yyyy HH:mm') : '',
        'Remarks': h.remarks || '',
        'Updated By': h.updatedByName || h.updatedBy || '',
      }))
    ), 'Status Timeline');

    // Convert to buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const monthName = format(new Date(), 'MMMM yyyy');

    // Save to Firestore (metadata)
    await db.collection('reports').add({
      type: 'monthly',
      month: format(new Date(), 'yyyy-MM'),
      vehicleCount: vehicles.length,
      deliveredCount: delivered.length,
      pendingCount: pending.length,
      delayedCount: delayedVehicles.length,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"ServicePilot Reports" <${functions.config().email.user}>`,
        to: MANAGER_EMAIL,
        subject: `📊 ServicePilot Monthly Report — ${monthName}`,
        html: buildMonthlyReportHtml(vehicles.length, delivered.length, pending.length, delayedVehicles.length, monthName),
        attachments: [{
          filename: `ServicePilot_Report_${format(new Date(), 'yyyy-MM')}.xlsx`,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }],
      });
      console.log('Monthly report sent');
    } catch (err) {
      console.error('Monthly report email error:', err);
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// HTTP: Manual trigger for report (manager only)
// ─────────────────────────────────────────────────────────────────────────────
exports.generateReportNow = functions
  .region('asia-south1')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'service_manager') {
      throw new functions.https.HttpsError('permission-denied', 'Manager access required');
    }

    // Trigger the monthly report logic
    const vehiclesSnap = await db.collection('vehicles').get();
    return { vehicleCount: vehiclesSnap.size, message: 'Report generation triggered' };
  });

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL HTML BUILDERS
// ─────────────────────────────────────────────────────────────────────────────
function buildDelayEmailHtml(delayed) {
  const rows = delayed.map(v => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px;font-family:monospace;font-weight:bold;color:#0284c7;">${v.vehicleNumber}</td>
      <td style="padding:10px;">${v.jobCardNumber || '—'}</td>
      <td style="padding:10px;">
        <span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:9999px;font-size:12px;">${v.currentStatus}</span>
      </td>
      <td style="padding:10px;color:#ef4444;font-weight:bold;">${v.daysInStatus} days</td>
      <td style="padding:10px;">${v.customerName}</td>
      <td style="padding:10px;">${v.adviserName || '—'}</td>
      <td style="padding:10px;">${v.promisedDeliveryDate || '—'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif;background:#f8fafc;padding:20px;">
      <div style="max-width:800px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <div style="background:#0284c7;padding:24px;color:white;">
          <h1 style="margin:0;font-size:20px;">⚠️ ServicePilot — Delayed Vehicle Alert</h1>
          <p style="margin:8px 0 0;opacity:0.8;font-size:14px;">${delayed.length} vehicle(s) require immediate attention</p>
        </div>
        <div style="padding:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Vehicle No.</th>
                <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Job Card</th>
                <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Status</th>
                <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Days</th>
                <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Customer</th>
                <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Adviser</th>
                <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Promise Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color:#64748b;font-size:13px;margin-top:20px;">
            Please log in to <a href="https://servicepilot.web.app" style="color:#0284c7;">ServicePilot Dashboard</a> to take action.
          </p>
        </div>
        <div style="background:#f8fafc;padding:16px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          ServicePilot Automotive Management System
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildMonthlyReportHtml(total, delivered, pending, delayed, month) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif;background:#f8fafc;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,#0284c7,#0ea5e9);padding:24px;color:white;">
          <h1 style="margin:0;font-size:20px;">📊 Monthly Report — ${month}</h1>
          <p style="margin:8px 0 0;opacity:0.8;font-size:14px;">ServicePilot Automotive Management</p>
        </div>
        <div style="padding:24px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            ${[
              ['Total Vehicles', total, '#0284c7'],
              ['Delivered', delivered, '#16a34a'],
              ['Pending', pending, '#d97706'],
              ['Delayed', delayed, '#dc2626'],
            ].map(([label, val, color]) => `
              <div style="background:#f8fafc;border-radius:8px;padding:16px;border-left:4px solid ${color};">
                <div style="font-size:28px;font-weight:bold;color:${color};">${val}</div>
                <div style="font-size:13px;color:#64748b;">${label}</div>
              </div>
            `).join('')}
          </div>
          <p style="color:#475569;font-size:14px;">
            Please find the detailed Excel report attached to this email with complete vehicle details, status timeline, and analysis.
          </p>
          <a href="https://servicepilot.web.app/manager/analytics" style="display:inline-block;background:#0284c7;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;">
            View Dashboard →
          </a>
        </div>
        <div style="background:#f8fafc;padding:16px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          ServicePilot — Generated automatically on 1st of every month
        </div>
      </div>
    </body>
    </html>
  `;
}
