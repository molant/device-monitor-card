#!/bin/bash

# Script to create a proper GitHub release with automatic semantic versioning
# Based on conventional commits since the last version bump

set -e  # Exit on error

# Get current working directory
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_error() {
    echo -e "${RED}Error: $1${NC}" >&2
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# ============================================================================
# 1. VALIDATION CHECKS
# ============================================================================

log_info "Running validation checks..."

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    log_error "Working tree is dirty. Commit or stash changes before creating a release."
    git status --short
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed!"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

# Check if source files exist
if [ ! -f "src/device-monitor-card.js" ]; then
    log_error "src/device-monitor-card.js not found!"
    exit 1
fi

if [ ! -d "src/translations" ]; then
    log_error "src/translations/ directory not found!"
    exit 1
fi

log_success "All validation checks passed"

# ============================================================================
# 2. GET CURRENT VERSION AND FIND LAST BUMP COMMIT
# ============================================================================

log_info "Calculating version bump..."

CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")

# Find the last bump commit
LAST_BUMP_COMMIT=$(git log --grep="^bump:" --format="%H" -n 1 2>/dev/null || echo "")

if [ -z "$LAST_BUMP_COMMIT" ]; then
    # No previous bump commit, use all commits
    COMMIT_RANGE="HEAD"
else
    COMMIT_RANGE="${LAST_BUMP_COMMIT}..HEAD"
fi

# Get all commits since last bump (excluding merge commits)
COMMITS=$(git log $COMMIT_RANGE --format="%s" --no-merges 2>/dev/null || echo "")

# Filter out bump and misc commits, and check if anything remains
FILTERED_COMMITS=$(echo "$COMMITS" | grep -v "^bump:" | grep -v "^misc:" || echo "")

if [ -z "$FILTERED_COMMITS" ]; then
    log_info "Nothing to release (no commits with feat, fix, or breaking changes since last version)"
    exit 0
fi

# ============================================================================
# 3. DETERMINE VERSION BUMP TYPE
# ============================================================================

BUMP_TYPE="patch"  # Default to patch

# Check for breaking changes (highest priority)
if echo "$FILTERED_COMMITS" | grep -qE "^(breaking:|BREAKING CHANGE:)"; then
    BUMP_TYPE="major"
# Check for features (medium priority)
elif echo "$FILTERED_COMMITS" | grep -qE "^(feat:|feature:)"; then
    BUMP_TYPE="minor"
fi

# Parse current version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Calculate new version
case $BUMP_TYPE in
    major)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        ;;
    minor)
        NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
        ;;
    patch)
        NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
        ;;
esac

log_success "Version: $CURRENT_VERSION → $NEW_VERSION (bump type: $BUMP_TYPE)"

# ============================================================================
# 4. GENERATE CHANGELOG ENTRY
# ============================================================================

log_info "Generating changelog entry..."

CHANGELOG_DATE=$(date +"%Y-%m-%d")
CHANGELOG_ENTRY="### v${NEW_VERSION} (${CHANGELOG_DATE})"

# Add breaking changes section
BREAKING_CHANGES=$(echo "$FILTERED_COMMITS" | grep -E "^(breaking:|BREAKING CHANGE:)" || echo "")
if [ -n "$BREAKING_CHANGES" ]; then
    CHANGELOG_ENTRY="${CHANGELOG_ENTRY}

**Breaking Changes:**"
    while IFS= read -r commit; do
        # Extract description (remove prefix)
        DESC=$(echo "$commit" | sed -E 's/^(breaking:|BREAKING CHANGE:)\s*//')
        CHANGELOG_ENTRY="${CHANGELOG_ENTRY}
- ${DESC}"
    done <<< "$BREAKING_CHANGES"
fi

# Add features section
FEATURES=$(echo "$FILTERED_COMMITS" | grep -E "^(feat:|feature:)" || echo "")
if [ -n "$FEATURES" ]; then
    CHANGELOG_ENTRY="${CHANGELOG_ENTRY}

**Features:**"
    while IFS= read -r commit; do
        # Extract description (remove prefix)
        DESC=$(echo "$commit" | sed -E 's/^(feat:|feature:)\s*//')
        CHANGELOG_ENTRY="${CHANGELOG_ENTRY}
- ${DESC}"
    done <<< "$FEATURES"
fi

# Add fixes section
FIXES=$(echo "$FILTERED_COMMITS" | grep -E "^(fix:|bugfix:)" || echo "")
if [ -n "$FIXES" ]; then
    CHANGELOG_ENTRY="${CHANGELOG_ENTRY}

**Fixes:**"
    while IFS= read -r commit; do
        # Extract description (remove prefix)
        DESC=$(echo "$commit" | sed -E 's/^(fix:|bugfix:)\s*//')
        CHANGELOG_ENTRY="${CHANGELOG_ENTRY}
- ${DESC}"
    done <<< "$FIXES"
fi

# ============================================================================
# 5. UPDATE FILES
# ============================================================================

log_info "Updating files..."

# Update package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" package.json

# Update src/device-monitor-card.js (line 10 and CARD_VERSION constant)
sed -i '' "10s/\* @version .*/\* @version ${NEW_VERSION}/" src/device-monitor-card.js
sed -i '' "s/const CARD_VERSION = '[^']*'/const CARD_VERSION = '${NEW_VERSION}'/" src/device-monitor-card.js

# Update CHANGELOG.md - insert changelog entry at the top
# Write changelog entry to temp file to preserve newlines
CHANGELOG_TEMP=$(mktemp)
echo "$CHANGELOG_ENTRY" > "$CHANGELOG_TEMP"
echo "" >> "$CHANGELOG_TEMP"

# Prepend to CHANGELOG.md
cat CHANGELOG.md >> "$CHANGELOG_TEMP"
mv "$CHANGELOG_TEMP" CHANGELOG.md

log_success "Files updated"

# ============================================================================
# 6. BUILD DIST FILE
# ============================================================================

log_info "Building dist/device-monitor-card.js with embedded translations..."

# Run the build script
npm run build

if [ ! -f "dist/device-monitor-card.js" ]; then
    log_error "Build failed - dist/device-monitor-card.js not created!"
    exit 1
fi

log_success "Build complete"

# ============================================================================
# 7. GIT COMMIT AND PUSH
# ============================================================================

log_info "Committing changes..."

git add package.json src/device-monitor-card.js CHANGELOG.md dist/device-monitor-card.js

git commit -m "bump: v${NEW_VERSION}"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"

log_success "Changes committed and pushed"

# ============================================================================
# 7. CREATE GITHUB RELEASE
# ============================================================================

log_info "Creating GitHub release..."

# Prepare release notes
RELEASE_NOTES=$(printf '%s\n' "$CHANGELOG_ENTRY")

# Create release with built file (translations are now embedded)
gh release create "v${NEW_VERSION}" \
    --title "v${NEW_VERSION}" \
    --notes "$RELEASE_NOTES" \
    dist/device-monitor-card.js

log_success "Release created successfully!"

REPO_URL=$(gh repo view --json url -q '.url')
echo ""
echo "Release: ${REPO_URL}/releases/tag/v${NEW_VERSION}"
