# HOTEL KAMAL — CPANEL PRODUCTION DEPLOYMENT & OPERATIONS GUIDE

This guide provides end-to-end instructions for deploying and running the **Hotel Kamal PMS & POS** platform on any standard **cPanel hosting account with Node.js support** (CloudLinux LVE / Phusion Passenger), with direct automated deployment from **GitHub Actions** and persistent data storage on **Supabase**.

---

## 1. ARCHITECTURE OVERVIEW

- **Frontend Client:** React 19, TypeScript, Tailwind CSS, Vite (compiled into static assets in `dist/`).
- **Backend Server:** Node.js Express + WebSocket server (`server.ts` / port `3000`).
- **Database Engine:** Supabase PostgreSQL (primary persistent cloud storage) + Local SQLite WAL (`.kamal-pms.db` high-speed read cache).
- **Media Storage:** Supabase Storage bucket (`hotel-media`) with automatic fallback to `/public/uploads`.
- **Inactivity Guard:** Automated background keep-alive ping running every 6 hours to prevent Supabase 7-day free-tier inactivity pausing.
- **Security:** Strict Server-Side RBAC, HttpOnly session cookies, PBKDF2/bcrypt salted password hashes in database, parameterized SQL queries, zero private keys exposed to browser.

---

## 2. PREREQUISITES

1. **cPanel Account:** Any cPanel hosting account featuring **Setup Node.js App** (Node.js 20.x LTS recommended).
2. **Supabase Project:** A free or paid project created at [supabase.com](https://supabase.com).
   - Grab your **Project URL** (e.g. `https://xyzcompany.supabase.co`).
   - Grab your **anon public key** (`eyJhbGci...`).
   - Grab your **service_role secret key** (`eyJhbGci...`).
3. **GitHub Repository:** Your code repository (e.g., `hotelkamalnp-hash/Hkamal`).

---

## 3. STEP 1: INITIALIZE SUPABASE DATABASE (1 COPY-PASTE)

1. Open your Supabase Project Dashboard and click **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open the file `supabase_schema.sql` from your repository root (or download it from your SuperAdmin panel).
4. Paste the entire SQL script and click **Run**.
5. **Result:** All tables (`pms_records`, `pms_kv_settings`, `bookings_store`, `staff_accounts`, `smtp_credentials`, `media_assets`), storage bucket (`hotel-media`), and security policies are created in seconds.

---

## 4. STEP 2: SETUP NODE.JS APPLICATION IN CPANEL

1. Log into your cPanel account.
2. Scroll to the **Software** section and click **Setup Node.js App**.
3. Click **Create Application**:
   - **Node.js version:** Select `20.x` (or highest 18+/20+ LTS).
   - **Application mode:** `Production`.
   - **Application root:** Enter `kamal-pms` (or `public_html`).
   - **Application URL:** Select your domain (e.g. `hotelkamal.com` or `pms.hotelkamal.com`).
   - **Application startup file:** Enter `server.ts` (or `dist/server.js` if running compiled).
4. Click **Create**.
5. Note the path shown for virtual environment (e.g. `source /home/username/nodevenv/kamal-pms/20/bin/activate`).

---

## 5. STEP 3: CONFIGURE ENVIRONMENT VARIABLES IN CPANEL

In the **Setup Node.js App** interface, scroll down to the **Environment variables** section and click **Add Variable** for each:

| Variable Name | Recommended Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SUPABASE_URL` | Your Supabase Project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase `service_role` secret key |
| `SUPABASE_ANON_KEY` | Your Supabase `anon` public key |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` |
| `AUTH_TOKEN_SECRET` | 32+ random characters (e.g. `KamalHotelSecureTokenSecret2026!Key`) |
| `FRESH_PRODUCTION_START` | `true` (starts with clean operational tables and 8 vacant rooms) |
| `APP_ORIGIN` | `https://yourdomain.com` |

Click **Save** in cPanel.

---

## 6. STEP 4: CONFIGURE DIRECT GITHUB-TO-CPANEL DEPLOYMENT

The repository includes `.github/workflows/deploy-cpanel.yml` for automated CI/CD.

1. Open your GitHub repository in your browser.
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret** and add the following 3 secrets:

| Secret Name | Description / Example |
| :--- | :--- |
| `CPANEL_FTP_SERVER` | Your cPanel server hostname or IP (e.g. `ftp.yourdomain.com`) |
| `CPANEL_FTP_USERNAME` | Your cPanel FTP username (e.g. `deployer@yourdomain.com` or cPanel user) |
| `CPANEL_FTP_PASSWORD` | The FTP password |
| `CPANEL_TARGET_DIR` | (Optional) Destination folder, e.g. `kamal-pms/` or `public_html/` |

4. **Trigger Deployment:**
   - Any commit pushed to the `main` branch automatically runs the workflow.
   - It runs the security integrity tests, builds the Vite production bundle, packages the server, transfers files via secure FTPS, and touches `tmp/restart.txt` to reload the cPanel application.
   - You can also manually trigger it under **Actions** > **Deploy Hotel Kamal to cPanel** > **Run workflow**.

---

## 7. STEP 5: PREVENT 7-DAY INACTIVITY SUPABASE PAUSING

Supabase free-tier projects automatically pause if no queries occur for 7 consecutive days. Hotel Kamal has **two built-in protections**:

1. **Internal Server Worker:**
   The server background worker (`server/jobs.ts`) automatically sends a lightweight ping every 6 hours while running.

2. **cPanel Scheduled Cron Job (External Guarantee):**
   In cPanel, go to **Cron Jobs** and create a new cron job that executes once every 12 hours:
   ```bash
   curl -s https://yourdomain.com/api/health/supabase-ping > /dev/null 2>&1
   ```
   - **Minute:** `0`
   - **Hour:** `0,12`
   - **Day:** `*`
   - **Month:** `*`
   - **Weekday:** `*`

This guarantees that even if nobody opens the website during off-season, Supabase never pauses.

---

## 8. STEP 6: STARTING FRESH HOTEL OPERATIONS

When handing the system over to the hotel staff for the first time:

1. Log into the staff portal as SuperAdmin (`superadmin` or `hotelkamal.np@gmail.com` — password `DEV_SUPERADMIN_PASS` / `KamalHotel@2026` in dev, or your Supabase Auth user created with `staff_role: "super_admin"` in `production` mode).
2. Click **CMS & Rates** in the navigation bar.
3. Select the **Database & Supabase Storage** sub-tab.
4. Review the **Free-Tier Storage Meter** (it will show `< 2 MB / 500 MB` used).
5. Under **Production Launch: Fresh Operational Slate**, click **Clear Demo Transactions (Start Fresh Operations)** and type `CONFIRM`.
6. **Result:**
   - All demo bookings, mock invoices, and test restaurant orders are cleared.
   - All 8 physical room units (Rooms 101, 102, 201, 202, 301, 302, 401, 402) are marked **Clean & Vacant**.
   - Master invoice sequence resets cleanly to start at `KH-INV-208283-00001`.
   - Authentic Nepali menus, staff accounts, amenities, and floor plans remain 100% intact.
   - Front Desk can immediately start booking real guests!

---

## 9. STEP 7: PROVISIONING FOR ANOTHER HOTEL (MULTI-TENANT WHITE-LABEL)

To duplicate this system for a different hotel client:

1. **Deploy Code:** Deploy to their cPanel account using the same GitHub Actions workflow.
2. **Database:** Create a new Supabase project for the new hotel, run `supabase_schema.sql`, and set their `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in their cPanel environment.
3. **Customize Branding from CMS:**
   - Log into their CMS as admin.
   - Under **Brand, Palette & Footer**, change:
     - Hotel Name (e.g. "Hotel Annapurna")
     - Property Address & City
     - Contact Phone & Email
     - Nepal PAN / VAT Registration Number
     - Tax percentages (e.g. 10% Service Charge, 13% VAT)
     - Brand color palette (e.g. Warm Amber, Royal Navy, Forest Slate)
   - Under **Hero & CTA Buttons**, upload their exterior photo and update their tagline.
4. Click **Save & Publish All**. The entire application, invoice headers, email templates, and guest portals update dynamically with zero code modifications!

---

## 10. STEP 8: DISASTER RECOVERY & BACKUPS

1. In the CMS panel under **Database & Supabase Storage**, click **Download Full Backup JSON**.
2. This exports all rooms, guests, bookings, invoices, restaurant catalogs, and settings into a single timestamped JSON file.
3. If server migration is required, click **Restore from Backup JSON** to restore the entire property state in seconds.
