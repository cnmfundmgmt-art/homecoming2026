# Homecoming 2026 — Deployment Guide

## Local Development

```bash
npm install
node server.js
# Open http://localhost:3000
```

## Deploy to Render (Free Tier)

### 1. Push to GitHub
Create a new GitHub repo and push the code:
```bash
git init
git add .
git commit -m "Homecoming 2026"
git remote add origin https://github.com/YOUR_USERNAME/homecoming-2026.git
git push -u origin main
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com) → Sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Set:
   - **Name:** `homecoming-2026`
   - **Region:** Singapore (or closest to your users)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. Add Environment Variables (under "Environment"):
   - `TURSO_DATABASE_URL` = `libsql://homecoming-cnmfundmgmt.aws-ap-northeast-1.turso.io`
   - `TURSO_AUTH_TOKEN` = _(your Turso auth token)_
   - `NODE_ENV` = `production`

6. Click **"Create Web Service"**

### 3. Done! 🎉
Your app will be live at `https://homecoming-2026.onrender.com` (or custom domain).

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `TURSO_DATABASE_URL` | Turso database URL (e.g. `libsql://homecoming.xxx.turso.io`) | For cloud deployment |
| `TURSO_AUTH_TOKEN` | Turso auth token | For cloud deployment |
| `NODE_ENV` | Set to `production` in deployed env | Recommended |
| `PORT` | HTTP port (default: 3000) | Auto-set by Render |

## Database

Data is stored in **Turso** (cloud SQLite). The local file `homecoming.db` is ignored by git.

## Admin Portal

- URL: `/admin` (e.g. `https://your-app.onrender.com/admin`)
- Default credentials: `admin` / `homecoming2026`
