#!/bin/bash

# Script to delete all GitHub pre-releases and associated tags

set -e  # Exit on error

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

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

echo "=========================================="
echo "Delete GitHub Pre-Releases and Tags"
echo "=========================================="
echo "Repository: ${REPO}"
echo ""

# Get list of all pre-releases
echo "Fetching pre-releases..."
PRERELEASE_COUNT=$(gh release list --limit 1000 --json isDraft,isPrerelease,tagName -q '.[] | select(.isPrerelease==true) | .tagName' | wc -l)

if [ "$PRERELEASE_COUNT" -eq 0 ]; then
    echo "No pre-releases found."
    exit 0
fi

echo "Found ${PRERELEASE_COUNT} pre-release(s)"
echo ""
echo "Pre-releases to be deleted:"
gh release list --limit 1000 --json isDraft,isPrerelease,tagName,name -q '.[] | select(.isPrerelease==true) | "  - \(.tagName): \(.name)"'
echo ""

read -p "Delete all pre-releases and associated tags? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Get list of pre-release tags
TAGS=$(gh release list --limit 1000 --json isDraft,isPrerelease,tagName -q '.[] | select(.isPrerelease==true) | .tagName')

# Delete each pre-release and its associated tag
DELETED_COUNT=0
echo ""
echo "Deleting pre-releases and tags..."
while IFS= read -r TAG; do
    if [ -n "$TAG" ]; then
        echo "  Deleting release ${TAG}..."
        gh release delete "${TAG}" --yes --cleanup-tag
        ((DELETED_COUNT++))
    fi
done <<< "$TAGS"

echo ""
echo "✅ Successfully deleted ${DELETED_COUNT} pre-release(s) and tag(s)!"
