#!/bin/bash

# Script to create a GitHub pre-release with current date/time and branch/commit info

set -e  # Exit on error

# Get current date/time in format: YYYYMMDD-HHMM
DATE_TIME=$(date +"%Y%m%d-%H%M")

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "=========================================="
    echo "Uncommitted Changes Detected"
    echo "=========================================="
    echo ""
    git status --short
    echo ""
    read -p "Commit and push all changes before creating release? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Staging all changes..."
        git add -A
        
        echo "Committing changes..."
        COMMIT_MSG="Pre-release: ${DATE_TIME}"
        git commit -m "${COMMIT_MSG}" || {
            echo "Error: Commit failed. You may need to provide a commit message."
            exit 1
        }
        
        echo "Pushing to ${BRANCH}..."
        git push origin "${BRANCH}" || {
            echo "Error: Push failed. Please check your git configuration."
            exit 1
        }

        # Make sure working tree is clean after the commit
        if [ -n "$(git status --porcelain)" ]; then
            echo "Error: Working tree is still dirty after commit."
            git status --short
            exit 1
        fi
        
        echo "✅ Changes committed and pushed successfully!"
        echo ""
    else
        echo "❌ Cannot create a pre-release without committing/pushing changes."
        exit 1
    fi
else
    echo "No uncommitted changes detected."
    echo ""
fi

# Get current commit hash (short) - updated after potential push
COMMIT=$(git rev-parse --short HEAD)

# Get commit message (first line)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)

# Get version from package.json (or use default)
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")

# Create tag name: v1.0.1-20250116-1430
TAG_NAME="v${VERSION}-${DATE_TIME}"

# Create release title
TITLE="${TAG_NAME} - Pre-release"

# Create release notes
NOTES="Pre-release build from branch \`${BRANCH}\`

**Commit:** \`${COMMIT}\`
**Branch:** \`${BRANCH}\`
**Date:** $(date +"%Y-%m-%d %H:%M:%S")

**Latest commit message:**
${COMMIT_MSG}

---

This is a pre-release. Use with caution."

# Check if source files exist
if [ ! -f "src/device-monitor-card.js" ]; then
    echo "Error: src/device-monitor-card.js not found!"
    exit 1
fi

if [ ! -d "src/translations" ]; then
    echo "Error: src/translations/ directory not found!"
    exit 1
fi

# Build the dist file
echo "Building dist/device-monitor-card.js with embedded translations..."
./scripts/build.sh

if [ ! -f "dist/device-monitor-card.js" ]; then
    echo "Error: Build failed - dist/device-monitor-card.js not created!"
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed!"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

# Confirm before creating release
echo "=========================================="
echo "Creating GitHub Pre-Release"
echo "=========================================="
echo "Tag:        ${TAG_NAME}"
echo "Branch:     ${BRANCH}"
echo "Commit:     ${COMMIT}"
echo "Version:    ${VERSION}"
echo "Date/Time:  ${DATE_TIME}"
echo ""
echo "Release will include:"
echo "  - dist/device-monitor-card.js (with embedded translations)"
echo ""
read -p "Create pre-release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Create the pre-release
echo ""
echo "Creating pre-release..."
gh release create "${TAG_NAME}" \
    --target "${BRANCH}" \
    --prerelease \
    --title "${TITLE}" \
    --notes "${NOTES}" \
    dist/device-monitor-card.js

echo ""
echo "✅ Pre-release created successfully!"
echo "   Tag: ${TAG_NAME}"
echo "   View: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/releases/tag/${TAG_NAME}"
