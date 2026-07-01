# 🚀 RuralCareLink Deployment & APK Generation Guide

This guide outlines the step-by-step procedure to deploy the central database, the backend Express API, the specialist Doctor Dashboard, and compile the mobile application into an Android APK.

---

## 💾 Phase 1: Database Deployment (Supabase)
To host the PostgreSQL database for free:
1. Go to [Supabase](https://supabase.com/) and sign up / log in.
2. Click **New Project** and name it `ruralcarelink-db`. Set a secure database password.
3. Once the project is provisioned, go to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection string**.
4. Copy the **URI** connection string. It should look like this:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the database password you created. Keep this connection URL safe.

---

## ⚙️ Phase 2: Backend API Server Deployment (Render)
To host the Express.js API server for free:
1. Go to [Render](https://render.com/) and create a free account.
2. Click **New** $\rightarrow$ **Web Service** and connect your GitHub repository containing the backend code (or upload your backend folder).
3. Configure the settings:
   *   **Name**: `ruralcarelink-backend`
   *   **Runtime**: `Node`
   *   **Build Command**: `npm install && npx prisma generate`
   *   **Start Command**: `npx prisma db push && node src/index.js`
4. Under **Environment Variables**, add:
   *   `DATABASE_URL` = *(Your Supabase connection string from Phase 1)*
   *   `JWT_SECRET` = *(Create a secure random string)*
   *   `PORT` = `10000` (Render's default port)
5. Click **Deploy Web Service**. Once deployed, copy your Render Live URL (e.g., `https://ruralcarelink-backend.onrender.com`).

---

## 💻 Phase 3: Doctor Dashboard Deployment (Vercel)
To host the React specialist dashboard:
1. Update `/src/app/services/api.ts` in your dashboard code to point to your live Render backend URL:
   ```typescript
   // In Doctor Dashboard Design/src/app/services/api.ts
   const API_URL = "https://ruralcarelink-backend.onrender.com/api"; 
   ```
2. Go to [Vercel](https://vercel.com/) and link your dashboard repository.
3. Configure the settings:
   *   **Framework Preset**: `Vite`
   *   **Build Command**: `npm run build`
   *   **Output Directory**: `dist`
4. Click **Deploy**. Vercel will provide your live dashboard URL (e.g., `https://doctor-dashboard-ruralcarelink.vercel.app`), which you can put in your final report.

---

## 📱 Phase 4: Mobile Application APK Compilation (Capacitor)
To package your React application as an Android APK:

### 1. Point Mobile App to Live Backend
In `Design RuralCareLink App/src/app/services/api.ts` (or your config file), ensure the API endpoint points to your live Render URL:
```typescript
const API_URL = "https://ruralcarelink-backend.onrender.com/api";
```

### 2. Build Web Assets
Open a terminal in the `/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App` directory and run:
```bash
npm run build
```
This compiles your frontend files into the `/dist` directory.

### 3. Sync Web Assets with Capacitor Android Project
Run the sync command to push the built assets into the Android native wrapper:
```bash
npx cap sync
```

### 4. Open and Compile in Android Studio
1. Open the Android project in Android Studio by running:
   ```bash
   npx cap open android
   ```
2. Wait for Android Studio to load and complete the Gradle sync.
3. In the top menu of Android Studio, click **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)**.
4. Once completed, a notification bubble will appear on the bottom-right: *"APK(s) generated successfully: Locate APK"*.
5. Click **Locate**. This opens the file explorer showing your final, installable application:
   ```text
   app-debug.apk
   ```
6. Rename this file to `RuralCareLink.apk` and upload it to your phone/tablet for demonstration.
