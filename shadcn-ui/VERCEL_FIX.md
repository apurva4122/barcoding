# Vercel Build Fix - Manual Configuration Required

## The Problem
Vercel is trying to run `vite build` directly instead of `pnpm run build`, causing "vite: command not found" error.

## Solution: Manual Configuration in Vercel Dashboard

Since Vercel's auto-detection isn't working correctly, you need to manually configure the build settings:

### Step 1: Go to Vercel Project Settings
1. Open your project on Vercel: https://vercel.com/dashboard
2. Click on your project: `barcoding` (or whatever you named it)
3. Go to **Settings** → **General**

### Step 2: Configure Build & Development Settings
Scroll down to **"Build & Development Settings"** and set:

- **Framework Preset:** `Other` (or leave blank)
- **Build Command:** `pnpm run build`
- **Output Directory:** `dist`
- **Install Command:** `pnpm install`
- **Root Directory:** `.` (or leave blank)

### Step 3: Configure Package Manager
In the same settings page, find **"Package Manager"**:
- Select: **`pnpm`** (NOT npm or yarn)

### Step 4: Save and Redeploy
1. Click **"Save"** at the bottom
2. Go to **Deployments** tab
3. Click the **"..."** menu on the latest failed deployment
4. Click **"Redeploy"**

## Alternative: Use Environment Variable Override

If the above doesn't work, you can also try setting these in **Settings → Environment Variables**:

- `VERCEL_BUILD_COMMAND` = `pnpm run build`
- `VERCEL_INSTALL_COMMAND` = `pnpm install`

## Why This Happens

Vercel auto-detects Vite projects and tries to run `vite build` directly, but:
1. Dependencies aren't installed first
2. It's not using pnpm to run the script
3. The `vite` command isn't in PATH because it's in `node_modules/.bin`

By explicitly setting `pnpm run build`, Vercel will:
1. Run `pnpm install` first (installs dependencies)
2. Then run `pnpm run build` (which runs `vite build` from node_modules)

## Verification

After redeploying, check the build logs. You should see:
```
Running "pnpm install"
...
Running "pnpm run build"
> vite build
```

Instead of:
```
Running "vite build"  ❌ (fails)
```

