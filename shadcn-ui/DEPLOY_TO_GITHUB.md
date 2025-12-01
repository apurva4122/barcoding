# Deploy to GitHub - Step by Step Guide

## Step 1: Create a New Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `attendance-barcode-management` (or your preferred name)
   - **Description**: "Attendance & Barcode Management System with Supabase"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands in your terminal:

```bash
# Navigate to your project directory
cd workspace/shadcn-ui

# Add the remote repository (replace YOUR_USERNAME and REPO_NAME with your actual values)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Alternative: Using GitHub CLI (if installed)

If you have GitHub CLI installed, you can create and push in one command:

```bash
cd workspace/shadcn-ui
gh repo create attendance-barcode-management --public --source=. --remote=origin --push
```

## Step 3: Verify the Push

1. Go to your GitHub repository page
2. You should see all your files there
3. The README.md will be displayed on the repository homepage

## Step 4: Set Up for Hosting

### Option A: Vercel (Recommended for React/Vite apps)

1. Go to [Vercel](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `workspace/shadcn-ui` (or just the repo root if you push only shadcn-ui)
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`
6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Click "Deploy"

### Option B: Netlify

1. Go to [Netlify](https://netlify.com)
2. Sign in with GitHub
3. Click "Add new site" > "Import an existing project"
4. Select your repository
5. Configure:
   - **Base directory**: `workspace/shadcn-ui`
   - **Build command**: `pnpm run build`
   - **Publish directory**: `dist`
6. Add environment variables in Site settings
7. Deploy

### Option C: GitHub Pages

1. In your GitHub repository, go to Settings > Pages
2. Under "Source", select "GitHub Actions"
3. Create a workflow file (see below)

## GitHub Actions Workflow for GitHub Pages

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Important Notes

- **Environment Variables**: Make sure to add your Supabase credentials as environment variables in your hosting platform
- **Build Output**: The build output is in the `dist` folder
- **Base Path**: If deploying to a subdirectory, update `vite.config.ts` with the correct `base` path

## Troubleshooting

If you encounter issues:

1. **Authentication**: You may need to use a Personal Access Token instead of password
2. **Branch Name**: Make sure your default branch matches (main vs master)
3. **Large Files**: If you have large files, consider using Git LFS
4. **Build Errors**: Check that all dependencies are in package.json

