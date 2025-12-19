# 🚀 Pharmacy Management Deployment Guide

This project consists of two parts:
1. **Backend (Server)**: Node.js + Express + MongoDB
2. **Frontend (Client)**: React + Vite + Tailwind

For the best free/cheap performance, we recommend:
- **Frontend** → **Vercel**
- **Backend** → **Render** (or Railway/Heroku)

---

## 🏗️ Part 1: Deploy Backend (Render)
*The backend must be deployed first so we can give its URL to the frontend.*

1.  **Push to GitHub**: Ensure your code is pushed to a GitHub repository.
2.  **Sign up/Login to Render**: Go to [dashboard.render.com](https://dashboard.render.com/).
3.  **New Web Service**:
    *   Click **New +** → **Web Service**.
    *   Connect your GitHub repository.
4.  **Configure Settings**:
    *   **Name**: `medkit-backend` (or similar)
    *   **Region**: Choose closest to you (e.g., Singapore, Frankfurt)
    *   **Branch**: `main`
    *   **Root Directory**: `.` (Leave blank)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
5.  **Environment Variables (Important)**:
    *   Scroll down to **Environment Variables** and add:
        *   `MONGO_URI`: `mongodb+srv://...` (Your actual MongoDB Atlas connection string)
        *   `JWT_SECRET`: `your_secure_random_secret`
        *   `PORT`: `5000` (Render will override this, but good to set)
6.  **Deploy**: Click **Create Web Service**.
7.  **Copy Backend URL**: Once deployed, copy the URL (e.g., `https://medkit-backend.onrender.com`). You will need this for Part 2.

---

## 🎨 Part 2: Deploy Frontend (Vercel)

1.  **Sign up/Login to Vercel**: Go to [vercel.com](https://vercel.com/).
2.  **Add New Project**:
    *   Click **Add New...** → **Project**.
    *   Import your GitHub repository.
3.  **Configure Project**:
    *   **Framework Preset**: Vite (should detect automatically)
    *   **Root Directory**: `./` (default)
4.  **Environment Variables**:
    *   Expand **Environment Variables**.
    *   Add:
        *   **Name**: `VITE_API_URL`
        *   **Value**: `https://medkit-backend.onrender.com` (The URL you copied from Render)
        *   *Important: Do NOT include a trailing slash `/` at the end.*
5.  **Deploy**: Click **Deploy**.
6.  **Wait**: Vercel will build and deploy your site.

---

## 🛠️ Verification Checklist

- [ ] **Check Backend**: Visit `https://your-backend-url.onrender.com/api/system/status` (or just the root if you have a message there). It should return a JSON response or "Cannot GET /" (which proves it's running).
- [ ] **Check Frontend**: Open your Vercel URL.
- [ ] **Test Login**: Login with your credentials. If it spins forever, check the `VITE_API_URL` variable in Vercel settings (Project Settings > Environment Variables) and redeploy.
- [ ] **Check Console**: If errors occur, open Developer Tools (F12) > Console to check for connection errors.

## 📝 Important Notes

*   **MongoDB Network Access**: Ensure your MongoDB Atlas "Network Access" IP Whitelist includes `0.0.0.0/0` (Allow Access from Anywhere) so Render can connect.
*   **Cold Starts**: On the free tier of Render, the server "sleeps" after 15 minutes of inactivity. The first request might take 30-50 seconds. This is normal for free plans.
