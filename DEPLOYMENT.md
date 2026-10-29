# MinT Training System - Deployment Guide
## Vercel (Frontend) + Render (Backend) + Neon (PostgreSQL Database)

This guide walks you through deploying the complete stack step-by-step:
1. **Database:** Neon Serverless PostgreSQL
2. **Backend API:** Render Web Service (Node.js/Express)
3. **Frontend:** Vercel (React SPA)

---

## Phase 1: Set Up Neon Database (PostgreSQL)

1. Sign up or log in at **[neon.tech](https://neon.tech)**.
2. Click **Create Project**:
   - **Project name:** `mint-training-db` (or your choice)
   - **Postgres version:** 16 (default)
   - **Region:** Choose the region closest to your users or Render region (e.g. Frankfurt `eu-central-1` or US East `us-east-2`).
3. Once created, you will see your **Connection Details**:
   - Select connection type: **Connection string**
   - Click the **Show Password** toggle and copy the full connection string:
     ```
     postgresql://<user>:<password>@<ep-xyz>.region.aws.neon.tech/neondb?sslmode=require
     ```
4. **Initialize Database Schema & Tables:**
   You have two simple options:

   - **Option A (Via Neon Web Console - easiest):**
     1. In your Neon dashboard, click on **SQL Editor** on the left menu.
     2. Open `mint-training-system-v2/database/schema.sql` on your computer.
     3. Copy all contents of `schema.sql` and paste them into the Neon SQL Editor.
     4. Click **Run**. All tables, triggers, and demo seed data (Admin, Trainer, Trainees) will be created!

   - **Option B (Via Backend CLI Script):**
     In your terminal, navigate to `mint-training-system-v2/backend` and run:
     ```bash
     node init-neon-db.js "postgresql://<user>:<password>@<ep-xyz>.region.aws.neon.tech/neondb?sslmode=require"
     ```

---

## Phase 2: Deploy Backend on Render

1. Log in to **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository:
   - If using the inner repository `mint-dbu-internship`:
     - **Root Directory:** `backend`
   - If using the root repository `online-training-system-21`:
     - **Root Directory:** `mint-training-system-v2/backend`
4. Configure service details:
   - **Name:** `mint-training-backend` (or your preferred name)
   - **Language / Runtime:** `Node`
   - **Region:** Same region as Neon (e.g. Frankfurt or Ohio)
   - **Branch:** `main` (or `master`)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

5. Scroll down to **Environment Variables** and add the following keys:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production environment flag |
   | `PORT` | `5000` | Port for Express (Render also injects its own) |
   | `DATABASE_URL` | `postgresql://...` | Full Neon connection string from Phase 1 |
   | `JWT_SECRET` | *(Generate a 32+ character random string)* | Secret for auth tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
   | `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` *(update once Vercel is created)* | Permitted CORS frontend URLs |
   | `FRONTEND_URL` | `https://your-frontend.vercel.app` *(update once Vercel is created)* | Public frontend URL |

6. Click **Create Web Service**.
7. Wait 2-3 minutes for Render to build and start your backend.
8. When deployment completes, note down your Render service URL (e.g., `https://mint-training-backend.onrender.com`).
9. Test backend health check by visiting:
   `https://mint-training-backend.onrender.com/api/health`
   You should see: `{"success":true,"message":"Backend is running",...}`

---

## Phase 3: Deploy Frontend on Vercel

1. Log in to **[vercel.com](https://vercel.com)**.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository:
   - If using the inner repository `mint-dbu-internship`:
     - **Root Directory:** Click "Edit" and choose `frontend`
   - If using the root repository `online-training-system-21`:
     - **Root Directory:** Click "Edit" and choose `mint-training-system-v2/frontend`
4. **Framework Preset:** Create React App (automatically detected).
5. **Build & Output Settings:**
   - Build Command: `npm run build` (default)
   - Output Directory: `build` (default)
6. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://<your-render-service>.onrender.com/api` |

   *(Important: Ensure the URL ends with `/api` and has no trailing slash after `/api`).*

7. Click **Deploy**.
8. Once the build finishes, Vercel gives you your production URL, for example:
   `https://mint-training-system.vercel.app`

---

## Phase 4: Final Connection (CORS Update)

Now that you have your live Vercel URL:
1. Return to **Render Dashboard** -> Your backend service -> **Environment**.
2. Update `ALLOWED_ORIGINS` and `FRONTEND_URL` with your exact Vercel URL:
   - `ALLOWED_ORIGINS`: `https://mint-training-system.vercel.app`
   - `FRONTEND_URL`: `https://mint-training-system.vercel.app`
3. Render will automatically redeploy with the updated CORS configuration.

---

## Default Seed Accounts for Testing

Once deployed, you can immediately log in with the seeded accounts:

- **Admin Account:**
  - Email: `admin@mint.gov.et`
  - Password: `password123`
- **Trainer Account:**
  - Email: `samuel@mint.gov.et`
  - Password: `password123`
- **Trainee Accounts:**
  - Email: `abebe@test.com` (Password: `password123`)
  - Email: `chaltu@test.com` (Password: `password123`)

