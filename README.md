# SevaSetuHub – Production-Ready Service Management SaaS Platform

> **Tagline:** *Connecting You to Trusted Services*  
> **Live Domain:** [https://sevasetuhub.in](https://sevasetuhub.in)  
> **Tech Stack:** HTML5, CSS3, JavaScript ES6+, jQuery, Bootstrap 5, Google Sheets (Database), Google Apps Script (Backend/API Layer)

---

## 🌟 Executive Overview

**SevaSetuHub** is a production-grade Field Service & SaaS Management platform that connects customers, field technicians, dispatchers, and business administrators for scheduled and emergency technical services across Maharashtra (AC Service & Repair, Deep Cleaning, Plumbing, Electrical, Pest Control, Fabrication, and AMC Contracts).

---

## 🏗️ Architecture Design

```text
  [ Web Browser / Mobile Device ]
                 ↓
  [ HTML5 + CSS3 + JavaScript + jQuery + Bootstrap 5 ]  (Hosted on GitHub Pages / sevasetuhub.in)
                 ↓
  [ Unified API Layer: assets/js/api.js ]
                 ↓
  [ Google Apps Script Web App: doPost(e) / doGet(e) ]
                 ↓
  [ Modular Server Engine: Code.gs, Auth.gs, Requests.gs, etc. ]
                 ↓
  [ Google Sheets (Database) & Google Drive (Photos/Signatures) ]
```

---

## 📁 Project Directory Structure

```text
sevasethub/
│
├── frontend/
│   ├── index.html               # Frontend redirect / entry
│   ├── login.html               # Multi-role authentication & 1-click demo switcher
│   ├── register.html            # Customer registration with full validation
│   ├── services.html            # Public dynamic service catalog with filters
│   ├── offers.html              # Promotional offers & copy-to-clipboard coupons
│   ├── customer/
│   │   └── index.html           # Customer Portal (Booking Wizard, Invoices, AMC, Trackers)
│   ├── technician/
│   │   └── index.html           # Field Tech Mobile App (GPS, Checklist, Photos, Canvas Sign)
│   └── admin/
│       └── index.html           # Admin & Dispatcher SaaS Suite (Dispatch Board, Offers, Coupons)
│
├── assets/
│   ├── css/
│   │   ├── variables.css        # Teal + Blue + White design system tokens
│   │   ├── reset.css            # Standard normalization
│   │   ├── components.css       # Buttons, cards, modals, steppers, badges
│   │   ├── layout.css           # Portal shell, sidebar, topbar, dispatch grid
│   │   ├── landing.css          # Landing page styles & animations
│   │   └── responsive.css       # Breakpoint adaptations (375px to 1920px)
│   └── js/
│       ├── api.js               # Unified API client (Live Apps Script + Offline Fallback)
│       ├── auth.js              # Session manager, role guards & redirects
│       ├── landing.js           # Public landing interactions
│       ├── customer.js          # Customer booking & workflow controller
│       ├── technician.js        # Mobile technician workflow & canvas signature
│       └── admin.js             # Admin dashboard, Chart.js metrics & dispatch board
│
├── apps-script/
│   ├── Code.gs                  # Main router (doGet, doPost), CONFIG, CORS output
│   ├── Utils.gs                 # Sheet DAL, initializeDatabase(), LockService, SHA-256
│   ├── Auth.gs                  # Password hashing (salt+SHA256), sessions in Sheets
│   ├── Users.gs                 # User & Customer & Technician CRUD & RBAC
│   ├── Services.gs              # Service categories & services repository
│   ├── Requests.gs              # ServiceRequests lifecycle & status transitions
│   ├── Estimates.gs             # Estimate generator & customer approval engine
│   ├── WorkOrders.gs            # Work orders, scheduling, checklists, work notes
│   ├── Offers.gs                # Promotional marketing offers CRUD
│   ├── Coupons.gs               # Backend coupon validation engine & usage limits
│   ├── Payments.gs              # Invoice generation, simulated payments, feedback
│   ├── Files.gs                 # Google Drive folder hierarchy & base64 uploads
│   └── Notifications.gs         # Notifications queue, audit logging & metrics
│
├── CNAME                        # sevasetuhub.in custom domain mapping
├── index.html                   # High-converting landing page
└── README.md                    # Setup & deployment guide
```

---

## 🔐 Demo Accounts & Quick Credentials

| Role | Email | Password | Portal Features |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `admin@sevasetuhub.in` | `AdminPassword@2026` | Full platform control, metrics, dispatch, offers, coupons, audit logs |
| **Dispatcher** | `dispatch@sevasetuhub.in` | `DispPassword@2026` | Service request intake, estimate creation, technician assignment |
| **Technician** | `tech@sevasetuhub.in` | `TechPassword@2026` | Mobile field portal: GPS trip start, checklist, photos, signature canvas |
| **Customer** | `customer@sevasetuhub.in` | `CustPassword@2026` | Service booking wizard, coupon validation, estimate approval, payments |

*(Tip: On the `login.html` page, click any of the 1-click role buttons to immediately test that persona!)*

---

## 🚀 Google Sheets & Google Apps Script Setup Guide

### Step 1: Create a Google Spreadsheet
1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it: **SevaSetuHub Database**.

### Step 2: Open Apps Script Editor
1. In your Google Sheet, click **Extensions** → **Apps Script**.
2. Rename the project to **SevaSetuHub Backend**.

### Step 3: Add the Backend `.gs` Files
Create the following script files in the Apps Script editor and copy the corresponding code from the `apps-script/` folder:
- `Code.gs`
- `Utils.gs`
- `Auth.gs`
- `Users.gs`
- `Services.gs`
- `Requests.gs`
- `Estimates.gs`
- `WorkOrders.gs`
- `Offers.gs`
- `Coupons.gs`
- `Payments.gs`
- `Files.gs`
- `Notifications.gs`

### Step 4: Run Initial Database Setup
1. In the Apps Script toolbar, select the function **`initializeDatabase`** from the function dropdown.
2. Click **Run**.
3. Authorize the permissions dialog when prompted.
4. Apps Script will automatically create all 27 sheets with formatted headers, default categories, services, promotional offers, active coupons, and the default SuperAdmin and Technician accounts!

### Step 5: Deploy as a Web App
1. In the top right corner, click **Deploy** → **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment details:
   - **Description:** `SevaSetuHub Production API v1`
   - **Execute as:** `Me (your Google account)`
   - **Who has access:** `Anyone` *(Required so that your frontend website can send booking and auth requests)*
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 6: Connect Frontend to Your Live Backend
1. Open `assets/js/api.js` and paste your Web App URL into `APP_CONFIG.API_URL`:
   ```javascript
   const APP_CONFIG = {
     API_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
     ...
   };
   ```
   *(Or simply navigate to the Admin Portal → Settings tab and paste it into the UI input box!)*

---

## 🌐 Hosting on GitHub Pages & Custom `.in` Domain

1. Push this repository to GitHub (`https://github.com/shrihajare07/sevasethub`).
2. Navigate to **Settings** → **Pages**.
3. Under **Branch**, select `main` / `root` and click **Save**.
4. Under **Custom domain**, enter: `sevasetuhub.in` (already preconfigured in `CNAME`).
5. Ensure **Enforce HTTPS** is enabled.
6. Configure your DNS provider:
   - `A` Records pointing to GitHub IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - `CNAME` for `www` pointing to `shrihajare07.github.io`.

---

## 🔒 Security Architecture Highlights

1. **Password Hashing:** Passwords are never stored in plain text. Hashed on the backend using `Utilities.computeDigest` SHA-256 with a unique cryptographic salt.
2. **Session Verification:** Backend checks session tokens against the `Sessions` sheet for all privileged actions.
3. **Role-Based Authorization (RBAC):** Backend verifies user role (`SuperAdmin`, `BusinessAdmin`, `Dispatcher`, `Technician`, `Customer`) inside `UsersModule.requireRole()`.
4. **Backend Coupon Validation:** All discounts, coupon restrictions, date ranges, and maximum discount caps are calculated exclusively on the backend.
5. **Concurrency Protection:** Uses Google Apps Script `LockService` during ID generation and database inserts to prevent race conditions.
6. **Multi-Tenant Preparedness:** Every operational table contains `TenantId` for instant multi-tenant SaaS scaling.

---

## 🔄 Future Migration to ASP.NET Core & SQL Server

The frontend strictly talks through `assets/js/api.js`. To migrate the backend from Google Sheets / Apps Script to ASP.NET Core & SQL Server / PostgreSQL:
1. Re-implement the standard REST/JSON endpoints (`/api/login`, `/api/createServiceRequest`, `/api/validateCoupon`, etc.) in ASP.NET Core controllers.
2. Point `APP_CONFIG.API_URL` to your ASP.NET Core API root.
3. **No changes to frontend UI or business components are needed!**
