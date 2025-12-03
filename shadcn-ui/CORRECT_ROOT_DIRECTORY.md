# ✅ CORRECT ROOT DIRECTORY SETTING

## The Issue
You got error: "The specified Root Directory 'workspace/shadcn-ui' does not exist"

## The Solution
**Root Directory should be `.` (dot) or LEFT BLANK** - NOT `workspace/shadcn-ui`

## Why?
When you committed files to git, they were committed from the `workspace/shadcn-ui` directory, but git stores them at the repository root. So when Vercel clones your repository, it sees:

```
repository-root/
  package.json  ← Actually here in git!
  index.html
  src/
  ...
```

NOT:
```
repository-root/
  workspace/
    shadcn-ui/
      package.json  ← Not here!
```

## ✅ Correct Vercel Settings

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on your project: `barcoding`

2. **Open Settings → General**
   - Click **"Settings"** → **"General"**

3. **Set Root Directory**
   - **Root Directory:** Leave it **BLANK** or set to `.` (dot)
   - **DO NOT** set it to `workspace/shadcn-ui`

4. **Verify Other Settings**
   Make sure these are set:
   - **Framework Preset:** `Other`
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`
   - **Package Manager:** `pnpm`

5. **Save and Redeploy**
   - Click **"Save"** button
   - Go to **"Deployments"** tab
   - Click **"..."** on failed deployment
   - Click **"Redeploy"**

## Summary

- ❌ **Wrong:** Root Directory = `workspace/shadcn-ui`
- ✅ **Correct:** Root Directory = `.` (or blank)

The files are already at the repository root in git, so Vercel should look at the root directory.

