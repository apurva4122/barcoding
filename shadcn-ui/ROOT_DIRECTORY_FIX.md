# 🔧 ROOT DIRECTORY FIX - Vercel Configuration

## The Problem
Vercel error: `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND No package.json was found in "/vercel/path0"`

This happens because your `package.json` is in `workspace/shadcn-ui/` directory, not at the repository root.

## ✅ SOLUTION: Set Root Directory in Vercel

### Step-by-Step:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on your project: `barcoding`

2. **Open Settings → General**
   - Click **"Settings"** tab
   - Click **"General"** (left sidebar)

3. **Find "Root Directory"**
   - Scroll to **"Build & Development Settings"** section
   - Find **"Root Directory"** field

4. **Set Root Directory**
   - **Root Directory:** Type exactly: `workspace/shadcn-ui`
   - This tells Vercel where your `package.json` is located

5. **Verify Other Settings**
   Make sure these are also set:
   - **Framework Preset:** `Other`
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`
   - **Package Manager:** `pnpm`

6. **Save and Redeploy**
   - Click **"Save"** button
   - Go to **"Deployments"** tab
   - Click **"..."** on failed deployment
   - Click **"Redeploy"**

## Why This Happens

Your repository structure is:
```
repository-root/
  workspace/
    shadcn-ui/
      package.json  ← Your app is here
      src/
      ...
```

But Vercel was looking for `package.json` at:
```
repository-root/
  package.json  ← Not here!
```

By setting Root Directory to `workspace/shadcn-ui`, Vercel will:
1. Look for `package.json` in the correct location
2. Run all commands from that directory
3. Build successfully

## Verification

After setting Root Directory and redeploying, the build logs should show:
```
Installing dependencies...
Running pnpm install in workspace/shadcn-ui
...
Running pnpm run build
> vite build
```

Instead of:
```
ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND  ❌
```

