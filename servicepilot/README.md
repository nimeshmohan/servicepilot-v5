# 🔧 ServicePilot — Automotive Service Center Management System

A production-ready, full-stack web application for managing automotive service center workflows — from vehicle intake to delivery — built with React, Vite, Tailwind CSS, and Firebase.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Firebase Setup](#firebase-setup)
- [Environment Variables](#environment-variables)
- [Demo Data](#demo-data)
- [Deployment](#deployment)
- [User Roles](#user-roles)
- [Status Flow](#status-flow)
- [Cloud Functions](#cloud-functions)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Role-based Auth** | 4 roles: Manager, Adviser, Job Controller, Parts Allocator |
| **Vehicle Lifecycle** | Full WDA → Delivered status flow with history |
| **Real-time Updates** | Firestore live listeners across all dashboards |
| **Parts Tracking** | Auto-created when vehicle enters PNA status |
| **Email Alerts** | Delay notifications + monthly Excel reports |
| **Analytics** | Charts, KPIs, model/insurance breakdowns |
| **User Management** | Create/edit/disable users, reset passwords |
| **Dark Mode** | Full light/dark theme toggle |
| **Excel Export** | Download vehicle data as .xlsx |
| **Responsive** | Mobile-first sidebar + sticky header |

---

## 🛠 Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS (custom design system)
- Firebase SDK v10 (modular)
- Recharts (analytics charts)
- react-router-dom v6
- react-hot-toast
- lucide-react icons
- date-fns
- xlsx

**Backend**
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions (Node 18)
- Firebase Hosting
- Nodemailer (email alerts)

---

## 📁 Project Structure

```
servicepilot/
├── frontend/                 # React + Vite app
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # ProtectedRoute
│   │   │   ├── layout/       # AppLayout (sidebar + header)
│   │   │   └── shared/       # Modal, StatusBadge, VehicleTimeline
│   │   ├── context/          # AuthContext, ThemeContext
│   │   ├── pages/
│   │   │   ├── adviser/      # Dashboard, NewVehicleIntake, ReceivedVehicles, AllVehicles
│   │   │   ├── jc/           # JCDashboard
│   │   │   ├── manager/      # ManagerDashboard, UserManagement, Analytics, DelayedAlerts
│   │   │   ├── parts/        # PartsDashboard
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── Profile.jsx
│   │   ├── styles/           # globals.css (design system)
│   │   ├── utils/            # constants, helpers, firestoreService
│   │   ├── App.jsx
│   │   ├── firebase.js
│   │   └── main.jsx
│   ├── .env                  # ← copy from .env.example, fill in values
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── functions/                # Firebase Cloud Functions
│   ├── src/
│   │   └── index.js          # All cloud functions
│   └── package.json
│
├── scripts/                  # Utility scripts
│   ├── seedData.js           # Demo data seeder
│   └── package.json
│
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Composite indexes
├── storage.rules             # Storage security rules
├── firebase.json             # Firebase hosting + functions config
├── .firebaserc               # Firebase project alias
├── .gitignore
└── README.md
```

---

## ✅ Prerequisites

- Node.js 18+
- npm 9+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (already configured: `servicepilot-f0e66`)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/servicepilot.git
cd servicepilot

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install functions dependencies
cd functions && npm install && cd ..
```

### 2. Set Up Environment Variables

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and fill in all `VITE_FIREBASE_*` values from your Firebase console.

### 3. Run Locally

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔥 Firebase Setup

### Step 1 — Enable Authentication

1. Go to [Firebase Console](https://console.firebase.google.com) → `servicepilot-f0e66`
2. Authentication → Sign-in method → Enable **Email/Password**

### Step 2 — Create Firestore Database

1. Firestore Database → Create database
2. Choose **Production mode**
3. Select region: **asia-south1** (or your preferred region)

### Step 3 — Enable Storage

1. Storage → Get Started
2. Choose **Production mode**

### Step 4 — Deploy Security Rules

```bash
firebase login
firebase use servicepilot-f0e66

# Deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### Step 5 — Configure Cloud Functions (Email)

```bash
firebase functions:config:set \
  email.user="your-gmail@gmail.com" \
  email.pass="your-app-password" \
  email.manager="manager@yourcompany.com"
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App passwords → Generate one for "Mail".

### Step 6 — Deploy Cloud Functions

```bash
cd functions && npm install
firebase deploy --only functions
```

---

## 🌍 Environment Variables

Create `frontend/.env` from the template:

```env
VITE_FIREBASE_API_KEY=AIzaSyDpEhfDcskO3LcS-GRlDB8FuW5Tw8UHonc
VITE_FIREBASE_AUTH_DOMAIN=servicepilot-f0e66.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=servicepilot-f0e66
VITE_FIREBASE_STORAGE_BUCKET=servicepilot-f0e66.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=453159043183
VITE_FIREBASE_APP_ID=1:453159043183:web:3ec9a7c0667cf588ec8d9a
VITE_FIREBASE_MEASUREMENT_ID=G-ERGBJJ6XB4
```

---

## 🌱 Demo Data

Seed the database with 30 demo vehicles and 5 users:

```bash
# 1. Download your Firebase service account key from:
#    Firebase Console → Project Settings → Service Accounts → Generate new private key
# 2. Save it as: scripts/serviceAccountKey.json

cd scripts
npm install
node seedData.js
```

**Demo Login Credentials** (after seeding):

| Role | Email | Password |
|---|---|---|
| Service Manager | manager@servicepilot.demo | Demo@1234 |
| Service Adviser 1 | adviser1@servicepilot.demo | Demo@1234 |
| Service Adviser 2 | adviser2@servicepilot.demo | Demo@1234 |
| Job Controller | jc@servicepilot.demo | Demo@1234 |
| Parts Allocator | parts@servicepilot.demo | Demo@1234 |

---

## 🚀 Deployment

### Option A — Firebase Hosting (Recommended)

```bash
cd frontend
npm run build

cd ..
firebase deploy --only hosting
```

Your app will be live at: `https://servicepilot-f0e66.web.app`

### Option B — Full Deploy (Hosting + Functions + Rules)

```bash
cd frontend && npm run build && cd ..
firebase deploy
```

### Option C — Render (Static Site)

1. Push to GitHub
2. Create new **Static Site** on [Render](https://render.com)
3. Build command: `cd frontend && npm install && npm run build`
4. Publish directory: `frontend/dist`
5. Add all `VITE_FIREBASE_*` environment variables in Render dashboard

---

## 👥 User Roles

| Role | Key | Permissions |
|---|---|---|
| **Service Manager** | `service_manager` | Full access: all vehicles, users, analytics, alerts |
| **Service Adviser** | `service_adviser` | Own vehicles: intake, WDA→WFA status, history |
| **Job Controller** | `job_controller` | WFA+ vehicles: WIP/PNA/QC/Washing/RFD, image upload |
| **Parts Allocator** | `parts_allocator` | PNA vehicles: parts tracking, ETA management |

---

## 🔄 Status Flow

```
Service Adviser                  Job Controller
─────────────────                ──────────────────────────────────────
WDA (Waiting Docs Approval)
  ↓
WIA (Waiting Insurance Approval)
  ↓
WCA (Waiting Customer Approval)
  ↓
WFA (Waiting For Approval)  →→→  WIP (Work In Progress)
                                    └─ Substatus: Denting / Putty Work /
                                                  Painting / Fitting /
                                                  Polishing / Mechanical /
                                                  Resurvey
                                  ↓
                                 PNA (Parts Not Available)  →→  Parts Dashboard
                                  ↓
                                  QC (Quality Check)
                                  ↓
                                 Washing
                                  ↓
                                 RFD (Ready For Delivery)
                                  ↓
                               Delivered ✅
```

---

## ⏰ Delay Thresholds & Alerts

| Status | Threshold | Alert |
|---|---|---|
| WIP | > 3 days | Email to Manager |
| PNA | > 2 days | Email to Manager |
| QC | > 1 day | Email to Manager |
| Washing | > 1 day | Email to Manager |

Alerts run every **6 hours** via Firebase Scheduler.

---

## ☁️ Cloud Functions

| Function | Trigger | Description |
|---|---|---|
| `onVehicleStatusChange` | Firestore write | Logs activity, sends manager notification |
| `checkDelayedVehicles` | Cron: every 6h | Checks thresholds, sends delay email |
| `monthlyReport` | Cron: 1st of month 8AM IST | Generates Excel report, emails manager |
| `generateReportNow` | HTTPS Callable | Manual report trigger (manager only) |

---

## 🔐 Security

- Firestore rules enforce role-based access per collection
- Storage rules enforce file type and size limits
- API keys are stored in `.env` (never committed to git)
- Cloud Function email credentials stored in Firebase config (not in code)
- User accounts can be disabled by manager without deletion

---

## 📄 License

MIT — Free to use, modify, and distribute.

---

*Built with ❤️ for Škoda automotive service centers*
