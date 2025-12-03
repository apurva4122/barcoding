# ⚠️ CRITICAL: Vercel Build Fix Required

## The Problem
Vercel is running `vite build` directly instead of `pnpm run build`, causing the build to fail because `vite` command is not found in PATH.

## Root Cause
Vercel auto-detects Vite framework and tries to run `vite build` directly, completely ignoring `vercel.json` and `package.json` scripts.

## ✅ SOLUTION: Configure in Vercel Dashboard (REQUIRED)

**You MUST configure this in the Vercel dashboard. The `vercel.json` file alone won't work because Vercel overrides it with auto-detection.**

### Step-by-Step Instructions:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on your project: `barcoding`

2. **Open Project Settings**
   - Click **"Settings"** tab (top navigation)
   - Click **"General"** (left sidebar)

3. **Scroll to "Build & Development Settings"**
   - Find the section titled **"Build & Development Settings"**

4. **Override Framework Preset**
   - **Framework Preset:** Click the dropdown and select **"Other"** (NOT "Vite")
   - This disables auto-detection

5. **Set Build Command**
   - **Build Command:** Type exactly: `pnpm run build`
   - Do NOT use `vite build` or `npm run build`

6. **Set Output Directory**
   - **Output Directory:** Type: `dist`

7. **Set Install Command**
   - **Install Command:** Type: `pnpm install`

8. **Set Root Directory**
   - **Root Directory:** Leave blank or set to `.`

9. **Configure Package Manager**
   - Scroll down to find **"Package Manager"** section
   - Select: **`pnpm`** (NOT npm or yarn)

10. **Save Settings**
    - Click **"Save"** button at the bottom

11. **Redeploy**
    - Go to **"Deployments"** tab
    - Find the failed deployment
    - Click the **"..."** (three dots) menu
    - Click **"Redeploy"**

## Alternative: Use Environment Variables

If the above doesn't work, try setting these environment variables:

1. Go to **Settings** → **Environment Variables**
2. Add these variables (for Production, Preview, and Development):

```
VERCEL_BUILD_COMMAND = pnpm run build
VERCEL_INSTALL_COMMAND = pnpm install
```

3. Save and redeploy

## Why This Happens

When Vercel detects `vite.config.ts`, it:
1. Auto-detects framework as "Vite"
2. Tries to run `vite build` directly
3. Ignores `vercel.json` buildCommand
4. Doesn't install dependencies first
5. Fails because `vite` isn't in PATH

By setting Framework to "Other" and explicitly setting the build command, you force Vercel to:
1. Run `pnpm install` first (installs all dependencies including vite)
2. Then run `pnpm run build` (which executes vite from node_modules/.bin)

## Verification

After configuring and redeploying, check the build logs. You should see:

```
Running "pnpm install"
...
Running "pnpm run build"
> vite build
vite v5.4.20 building for production...
```

**NOT:**
```
Running "vite build"
sh: line 1: vite: command not found  ❌
```

## Still Not Working?

If it still fails after following these steps:
1. Double-check that Framework Preset is set to "Other"
2. Verify Package Manager is set to "pnpm"
3. Make sure Build Command is exactly `pnpm run build` (with pnpm, not npm)
4. Check that you saved the settings before redeploying
5. Try clearing Vercel build cache (Settings → General → Clear Build Cache)

