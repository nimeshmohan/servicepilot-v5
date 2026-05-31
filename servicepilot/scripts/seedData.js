/**
 * ServicePilot — Seed Script
 * Creates demo users and vehicles in Firestore.
 *
 * Usage:
 *   1. Place your Firebase service account key at scripts/serviceAccountKey.json
 *   2. Run: node scripts/seedData.js
 *
 * ⚠️  Only run on a fresh / development Firebase project.
 *     This will create demo accounts with known passwords.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// ─── Demo Users ──────────────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    email: 'manager@servicepilot.demo',
    password: 'Demo@1234',
    name: 'Rajesh Kumar',
    mobile: '+91 98765 43210',
    role: 'service_manager',
    branch: 'Main Branch',
    status: 'active',
  },
  {
    email: 'adviser1@servicepilot.demo',
    password: 'Demo@1234',
    name: 'Priya Sharma',
    mobile: '+91 87654 32109',
    role: 'service_adviser',
    branch: 'Main Branch',
    status: 'active',
  },
  {
    email: 'adviser2@servicepilot.demo',
    password: 'Demo@1234',
    name: 'Arun Mehta',
    mobile: '+91 76543 21098',
    role: 'service_adviser',
    branch: 'Main Branch',
    status: 'active',
  },
  {
    email: 'jc@servicepilot.demo',
    password: 'Demo@1234',
    name: 'Suresh Nair',
    mobile: '+91 65432 10987',
    role: 'job_controller',
    branch: 'Main Branch',
    status: 'active',
  },
  {
    email: 'parts@servicepilot.demo',
    password: 'Demo@1234',
    name: 'Deepa Pillai',
    mobile: '+91 54321 09876',
    role: 'parts_allocator',
    branch: 'Main Branch',
    status: 'active',
  },
];

// ─── Vehicle Models & Insurance Companies ────────────────────────────────────

const MODELS = ['Kylaq', 'Kushaq', 'Slavia', 'Kodiaq', 'Rapid', 'Superb', 'Octavia'];
const INSURANCE = ['HDFC ERGO', 'New India', 'National Insurance', 'Bajaj Allianz', 'ICICI Lombard', 'Oriental', 'United India'];
const REPAIR_TYPES = ['ACC REP', 'BP'];
const REPAIR_CATEGORIES = ['Minor', 'Major'];
const STATUSES = ['WDA', 'WIA', 'WCA', 'WFA', 'WIP', 'PNA', 'QC', 'Washing', 'RFD'];
const WIP_SUBSTATUS = ['Denting', 'Putty Work', 'Painting', 'Fitting', 'Polishing', 'Mechanical Work'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return admin.firestore.Timestamp.fromDate(d); }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return admin.firestore.Timestamp.fromDate(d); }

function generateVehicleNumber() {
  const states = ['TN', 'KL', 'KA', 'AP', 'MH'];
  const nums = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
  const letters = 'ABCDEFGHKLMNPQRSTUVWXYZ';
  const l1 = letters[randomInt(0, letters.length - 1)];
  const l2 = letters[randomInt(0, letters.length - 1)];
  const num = String(randomInt(1000, 9999));
  return `${randomItem(states)} ${randomItem(nums)} ${l1}${l2} ${num}`;
}

// ─── Main Seed Function ───────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting ServicePilot seed...\n');

  // Create users
  const userIds = {};
  const adviserIds = [];

  for (const u of DEMO_USERS) {
    try {
      // Create Auth user
      let authUser;
      try {
        authUser = await auth.createUser({ email: u.email, password: u.password, displayName: u.name });
        console.log(`✅ Auth user created: ${u.email}`);
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          authUser = await auth.getUserByEmail(u.email);
          console.log(`⏭️  Auth user exists: ${u.email}`);
        } else throw err;
      }

      // Write Firestore user doc
      await db.collection('users').doc(authUser.uid).set({
        uid: authUser.uid,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        branch: u.branch,
        status: u.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      userIds[u.role] = userIds[u.role] || [];
      userIds[u.role].push({ uid: authUser.uid, name: u.name, email: u.email });
      if (u.role === 'service_adviser') adviserIds.push({ uid: authUser.uid, name: u.name });

      console.log(`   Firestore doc written for ${u.name}`);
    } catch (err) {
      console.error(`❌ Failed for ${u.email}:`, err.message);
    }
  }

  const managerId = userIds['service_manager']?.[0]?.uid;
  const jcId = userIds['job_controller']?.[0]?.uid;
  const jcName = userIds['job_controller']?.[0]?.name || 'JC User';

  // Create vehicles
  console.log('\n🚗 Creating demo vehicles...\n');

  const vehicleStatusCounts = {};
  for (const s of STATUSES) vehicleStatusCounts[s] = 0;

  const vehicleDefs = [
    // Adviser stage vehicles
    ...Array.from({ length: 4 }, () => ({ status: 'WDA', daysOld: randomInt(1, 3) })),
    ...Array.from({ length: 3 }, () => ({ status: 'WIA', daysOld: randomInt(1, 5) })),
    ...Array.from({ length: 3 }, () => ({ status: 'WCA', daysOld: randomInt(1, 7) })),
    ...Array.from({ length: 4 }, () => ({ status: 'WFA', daysOld: randomInt(1, 5) })),
    // JC stage vehicles
    ...Array.from({ length: 5 }, () => ({ status: 'WIP', daysOld: randomInt(1, 8), subStatus: randomItem(WIP_SUBSTATUS) })),
    ...Array.from({ length: 3 }, () => ({ status: 'PNA', daysOld: randomInt(1, 5) })),
    ...Array.from({ length: 2 }, () => ({ status: 'QC', daysOld: 1 })),
    ...Array.from({ length: 2 }, () => ({ status: 'Washing', daysOld: 1 })),
    ...Array.from({ length: 3 }, () => ({ status: 'RFD', daysOld: randomInt(1, 2) })),
  ];

  for (let i = 0; i < vehicleDefs.length; i++) {
    const def = vehicleDefs[i];
    const adviser = randomItem(adviserIds);
    const vehicleNumber = generateVehicleNumber();
    const model = randomItem(MODELS);
    const repairType = randomItem(REPAIR_TYPES);
    const repairCategory = randomItem(REPAIR_CATEGORIES);
    const insuranceCompany = randomItem(INSURANCE);
    const createdAt = daysAgo(def.daysOld + 2);
    const statusEnteredAt = daysAgo(def.daysOld);
    const isDelayed = (
      (def.status === 'WIP' && def.daysOld > 3) ||
      (def.status === 'PNA' && def.daysOld > 2) ||
      (def.status === 'QC' && def.daysOld > 1) ||
      (def.status === 'Washing' && def.daysOld > 1)
    );

    const vehicleData = {
      vehicleNumber,
      vehicleModel: model,
      repairType,
      repairCategory,
      numberOfPanels: randomInt(1, 8),
      jobCardNumber: `JC-${String(1000 + i).padStart(4, '0')}`,
      customerDetails: {
        name: `Customer ${String.fromCharCode(65 + i)} ${randomItem(['Kumar', 'Sharma', 'Singh', 'Nair', 'Pillai'])}`,
        mobile: `+91 ${randomInt(7, 9)}${String(randomInt(100000000, 999999999))}`,
        insuranceCompany,
      },
      adviserId: adviser.uid,
      adviserName: adviser.name,
      jcId: ['WIP', 'PNA', 'QC', 'Washing', 'RFD'].includes(def.status) ? jcId : null,
      jcName: ['WIP', 'PNA', 'QC', 'Washing', 'RFD'].includes(def.status) ? jcName : null,
      currentStatus: def.status,
      subStatus: def.subStatus || null,
      previousStatus: STATUSES[Math.max(0, STATUSES.indexOf(def.status) - 1)] || null,
      statusEnteredAt,
      documentaryReceivedDate: daysAgo(def.daysOld + 5),
      surveyApprovedDate: daysAgo(def.daysOld + 3),
      promisedDeliveryDate: daysFromNow(randomInt(3, 15)),
      remarks: `Demo vehicle for ${def.status} stage`,
      isDelayed,
      isDelivered: false,
      createdAt,
      updatedAt: statusEnteredAt,
    };

    const vehicleRef = await db.collection('vehicles').add(vehicleData);
    vehicleStatusCounts[def.status]++;

    // Add status history
    const historyStatuses = STATUSES.slice(0, STATUSES.indexOf(def.status) + 1);
    for (let j = 0; j < historyStatuses.length; j++) {
      const s = historyStatuses[j];
      await db.collection('vehicleStatusHistory').add({
        vehicleId: vehicleRef.id,
        vehicleNumber,
        status: s,
        previousStatus: j > 0 ? historyStatuses[j - 1] : null,
        remarks: `Status updated to ${s}`,
        updatedBy: adviser.name,
        updatedByRole: j <= 3 ? 'service_adviser' : 'job_controller',
        timestamp: daysAgo(def.daysOld + (historyStatuses.length - j - 1)),
      });
    }

    // Create partsTracking for PNA vehicles
    if (def.status === 'PNA') {
      const totalParts = randomInt(3, 10);
      const receivedParts = randomInt(0, Math.floor(totalParts / 2));
      await db.collection('partsTracking').doc(vehicleRef.id).set({
        vehicleId: vehicleRef.id,
        vehicleNumber,
        jobCardNumber: vehicleData.jobCardNumber,
        adviserId: adviser.uid,
        adviserName: adviser.name,
        orderStatus: randomItem(['Pending', 'Ordered', 'Partial']),
        orderDate: daysAgo(def.daysOld),
        etaDate: daysFromNow(randomInt(1, 5)),
        receivedDate: null,
        pendingItems: `Part A, Part B, Part C`.split(', ').slice(0, randomInt(1, 3)),
        backOrderItems: randomInt(0, 1) ? ['Special Part X'] : [],
        vendorName: randomItem(['Skoda Parts India', 'AutoParts Hub', 'Genuine Parts Ltd']),
        invoiceNumber: `INV-${String(randomInt(1000, 9999))}`,
        totalPartsCount: totalParts,
        receivedPartsCount: receivedParts,
        pendingPartsCount: totalParts - receivedParts,
        remarks: 'Demo parts tracking entry',
        updatedBy: jcName,
        updatedAt: daysAgo(def.daysOld),
        logs: [
          {
            action: 'Parts tracking created',
            updatedBy: jcName,
            timestamp: daysAgo(def.daysOld).toDate().toISOString(),
            orderStatus: 'Pending',
          }
        ],
        etaExceeded: def.daysOld > 2,
        createdAt: daysAgo(def.daysOld),
      });
    }

    process.stdout.write(`   ${i + 1}/${vehicleDefs.length} — ${vehicleNumber} [${def.status}]\n`);
  }

  // Summary
  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('  Demo Login Credentials');
  console.log('─────────────────────────────────────────');
  for (const u of DEMO_USERS) {
    const label = u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`  ${label.padEnd(20)} ${u.email}`);
    console.log(`  ${''.padEnd(20)} Password: ${u.password}\n`);
  }
  console.log('─────────────────────────────────────────');
  console.log('\n  Vehicle counts by status:');
  for (const [s, n] of Object.entries(vehicleStatusCounts)) {
    if (n > 0) console.log(`    ${s.padEnd(12)} ${n}`);
  }
  console.log('\n');
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
