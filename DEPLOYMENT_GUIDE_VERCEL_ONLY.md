# 🚀 Pharmacy Management - Vercel Full Stack Deployment Guide

Since you prefer a **100% Free** solution without using Render, I have configured this project to be deployed entirely on **Vercel** (both Frontend and Backend).

---

## ✅ Deployment Strategy
- **Frontend**: Served efficiently by Vercel.
- **Backend (API)**: Converted to **Serverless Functions** running on Vercel.

I have already made the necessary code changes:
1.  Created `api/index.js` as the serverless entry point.
2.  Updated `vercel.json` to route `/api/*` traffic to the backend code.
3.  Refactored `server.js` to export the Express app correctly.

---

## 🛠️ Step-by-Step Deployment Instructions

### 1. Push Code to GitHub
Ensure all recent changes are committed and pushed to your GitHub repository.

### 2. Login to Vercel
Go to [vercel.com](https://vercel.com/) and sign up/login with GitHub.

### 3. Import Project
1.  Click **Add New...** → **Project**.
2.  Select your GitHub repository (`Pharmacy-Management-main`).
3.  Click **Import**.

### 4. Configure Deployment
Vercel will auto-detect the Vite framework. You mostly keep defaults.

*   **Framework Preset**: Vite
*   **Root Directory**: `./` (Default)
*   **Build Command**: `npm run build` (Default)
*   **Output Directory**: `dist` (Default)

### 5. Add Environment Variables (Crucial!)
Expand the **Environment Variables** section and add the following:

| Name | Value |
| :--- | :--- |
| `MONGO_URI` | `mongodb+srv://...` (Your MongoDB Atlas Connection String) |
| `JWT_SECRET` | `your_secure_random_secret` |
| `VITE_API_URL` | *Read below* |

**⚠️ About `VITE_API_URL`**:
Since both frontend and backend are on the same domain in Vercel, you should set this to:
`VITE_API_URL` = `` (Leave it empty!)

*Why?* If it's empty, the frontend requests will go to `/api/...`, which Vercel defaults to the current domain. This avoids CORS issues completely.
*Alternative:* If empty causes issues, set it to your deployment URL after the first deploy (e.g., `https://your-project.vercel.app`).

### 6. Deploy
Click **Deploy**.

---

## 🧪 Verification

1.  **Wait for Deployment**: The build logs will show frontend building and serverless functions generating.
2.  **Visit URL**: Open your Vercel URL.
3.  **Check API**: Go to `https://your-project.vercel.app/api/system/status`. You should see `{"isSetupCompleted": ...}`.
4.  **Login**: Try logging in to the dashboard.

## 📝 Troubleshooting

*   **"Function Timed Out"**: Vercel free tier has a 10-second limit for serverless functions. Ensure your MongoDB connection is fast (Atlas is good).
*   **MongoDB Connection**: If you see errors, double-check your IP Whitelist in MongoDB Atlas is set to `0.0.0.0/0`.
*   **CORS**: Since we are on the same domain, CORS shouldn't be an issue, but we added headers in `vercel.json` just in case.
