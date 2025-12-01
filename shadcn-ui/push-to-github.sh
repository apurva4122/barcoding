#!/bin/bash
# Bash script to push to GitHub
# Usage: ./push-to-github.sh YOUR_USERNAME REPO_NAME

if [ $# -ne 2 ]; then
    echo "Usage: $0 GITHUB_USERNAME REPO_NAME"
    echo "Example: $0 myusername attendance-barcode-management"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME=$2

echo "Setting up GitHub repository..."

# Check if remote already exists
if git remote get-url origin &>/dev/null; then
    echo "Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Add the remote
REMOTE_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "Adding remote: $REMOTE_URL"
git remote add origin $REMOTE_URL

# Check current branch name
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Rename to main if needed
if [ "$CURRENT_BRANCH" = "master" ]; then
    echo "Renaming branch from master to main..."
    git branch -M main
    CURRENT_BRANCH="main"
fi

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
else
    echo ""
    echo "❌ Error pushing to GitHub. Please check:"
    echo "1. Repository exists on GitHub"
    echo "2. You have access to the repository"
    echo "3. You're authenticated with GitHub"
fi

