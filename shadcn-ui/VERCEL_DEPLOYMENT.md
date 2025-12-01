# Vercel Deployment Guide

## Root Directory Configuration

**Root Directory:** `.` (dot/current directory)

Since your repository root contains the `package.json`, `vite.config.ts`, and all source files directly, the root directory should be set to `.` (the repository root itself).

**Note:** If Vercel detects the project structure incorrectly, you can also try leaving it blank or setting it to the repository root.

## Environment Variables

Your project uses Supabase with hardcoded fallback values, so environment variables are **optional** but recommended for better security and flexibility.

### Required Environment Variables (Optional - has fallbacks)

Add these in Vercel's Environment Variables settings:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://orsdqaeqqobltrmpvtmj.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2RxYWVxcW9ibHRybXB2dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc5MDQsImV4cCI6MjA2OTg4MzkwNH0.QhL8nm2-swoGTImb0Id-0WNjQOO9PC6O8wRo5ctpQ-Q` | Your Supabase anonymous key |

**Note:** The code has these values hardcoded as fallbacks, so the app will work even without setting environment variables. However, setting them is recommended for:
- Better security (can rotate keys without code changes)
- Different environments (dev/staging/prod)
- Following best practices

## Step-by-Step Vercel Deployment

### 1. Import Project
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Find and select your repository: `apurva4122/barcoding`
4. Click **"Import"**

### 2. Configure Project Settings

#### Framework Preset
- **Framework Preset:** `Vite` (should auto-detect)

#### Build Settings
- **Root Directory:** `.` (leave as default or set to `.`)
- **Build Command:** `pnpm run build` (or `npm run build` if not using pnpm)
- **Output Directory:** `dist`
- **Install Command:** `pnpm install` (or `npm install`)

#### Environment Variables
Click **"Environment Variables"** and add:

```
NEXT_PUBLIC_SUPABASE_URL = https://orsdqaeqqobltrmpvtmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2RxYWVxcW9ibHRybXB2dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc5MDQsImV4cCI6MjA2OTg4MzkwNH0.QhL8nm2-swoGTImb0Id-0WNjQOO9PC6O8wRo5ctpQ-Q
```

**Important:** 
- Make sure to select **"Production"**, **"Preview"**, and **"Development"** for each variable
- Or at minimum, select **"Production"** for production deployments

### 3. Deploy
1. Click **"Deploy"**
2. Wait for the build to complete (usually 1-2 minutes)
3. Your app will be live at: `https://your-project-name.vercel.app`

## Vercel Configuration Summary

```
Framework Preset: Vite
Root Directory: .
Build Command: pnpm run build
Output Directory: dist
Install Command: pnpm install
Node.js Version: 18.x (or latest)
```

## Troubleshooting

### Build Fails
- Check that `pnpm` is available (Vercel should auto-detect)
- If pnpm fails, change Install Command to `npm install` and Build Command to `npm run build`
- Check build logs for specific errors

### Environment Variables Not Working
- The app will work without them (hardcoded fallbacks)
- If you want to use env vars, make sure they're set for the correct environment (Production/Preview/Development)

### 404 Errors After Deployment
- Verify Output Directory is set to `dist`
- Check that the build completed successfully
- Ensure `index.html` exists in the `dist` folder

## Post-Deployment

After successful deployment:
1. Your app will have a URL like: `https://barcoding.vercel.app`
2. You can set up a custom domain in Vercel settings
3. Every push to `main` branch will trigger automatic deployments
4. Preview deployments are created for pull requests

## Additional Notes

- **Package Manager:** The project uses `pnpm`, but Vercel supports npm, yarn, and pnpm
- **Node Version:** Vercel uses Node.js 18.x by default (compatible with your project)
- **Auto-Deployments:** Enabled by default - every push to main branch deploys automatically

