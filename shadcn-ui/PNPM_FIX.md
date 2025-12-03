# 🔧 PNPM Registry Error Fix

## The Problem
Error: `ERR_PNPM_META_FETCH_FAIL GET https://registry.npmjs.org/... Value of "this" must be of type URLSearchParams`

This is a pnpm version compatibility issue with Node.js on Vercel.

## ✅ Solution Options

### Option 1: Use npm instead (Quickest Fix)

If pnpm continues to have issues, switch to npm:

1. **Go to Vercel Dashboard**
   - Settings → General
   - **Package Manager:** Change from `pnpm` to `npm`
   - **Install Command:** Change to `npm install`
   - **Build Command:** Change to `npm run build`
   - Save and redeploy

### Option 2: Update pnpm version (Recommended)

The issue is likely with pnpm version. Try these fixes:

1. **Update vercel.json** (already done in code)
   - Uses `corepack` to ensure latest pnpm version

2. **Or set Node.js version in Vercel**
   - Settings → General → Node.js Version
   - Set to: `20.x` (latest LTS)
   - This ensures compatibility with pnpm

### Option 3: Use npm with package-lock.json

If pnpm continues failing:

1. Generate `package-lock.json`:
   ```bash
   npm install --package-lock-only
   ```

2. Commit it to git

3. Switch Vercel to use npm instead of pnpm

## Quick Fix: Switch to npm

Since pnpm is having registry issues, the fastest solution is to use npm:

**In Vercel Settings:**
- Package Manager: `npm`
- Install Command: `npm ci` (faster, uses lock file)
- Build Command: `npm run build`

This will work immediately without pnpm registry issues.

## Why This Happens

The error suggests pnpm's internal URL handling is incompatible with the Node.js version Vercel is using. This is a known issue with certain pnpm versions.

## Recommendation

**Use npm for Vercel deployment** - it's more stable on Vercel's infrastructure. Your local development can still use pnpm.

