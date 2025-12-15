#!/bin/bash

# Build script for Device Monitor Card
# Embeds translation files into the main JavaScript file for single-file deployment

set -e  # Exit on error

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# ============================================================================
# 1. VALIDATE SOURCE FILES
# ============================================================================

log_info "Validating source files..."

if [ ! -f "src/device-monitor-card.js" ]; then
    echo "Error: src/device-monitor-card.js not found!"
    exit 1
fi

if [ ! -d "src/translations" ]; then
    echo "Error: src/translations/ directory not found!"
    exit 1
fi

# ============================================================================
# 2. BUILD EMBEDDED TRANSLATIONS OBJECT
# ============================================================================

log_info "Building embedded translations..."

# Create temporary file for translations
TRANSLATIONS_JS=$(mktemp)

cat > "$TRANSLATIONS_JS" << 'EOF'
const EMBEDDED_TRANSLATIONS = {
EOF

# Read each translation file and add to the object
FIRST=true
for lang_file in src/translations/*.json; do
    if [ -f "$lang_file" ]; then
        # Extract language code from filename (e.g., "en" from "en.json")
        LANG=$(basename "$lang_file" .json)

        # Read the JSON file content
        CONTENT=$(cat "$lang_file")

        # Add comma separator for all except first entry
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$TRANSLATIONS_JS"
        fi

        # Add language entry
        echo "  '$LANG': $CONTENT" >> "$TRANSLATIONS_JS"
    fi
done

echo "" >> "$TRANSLATIONS_JS"
echo "};" >> "$TRANSLATIONS_JS"

log_success "Embedded translations for: $(ls src/translations/*.json | xargs -n1 basename | sed 's/.json//' | tr '\n' ' ')"

# ============================================================================
# 3. BUILD OUTPUT FILE
# ============================================================================

log_info "Building dist/device-monitor-card.js..."

# Create dist directory if it doesn't exist
mkdir -p dist

# Create the output file
# 1. Copy source up to (but not including) the old LocalizationHelper
# 2. Add embedded translations
# 3. Add new LocalizationHelper class
# 4. Add rest of source

cat > dist/device-monitor-card.js << 'EOFMARKER'
/**
 * Device Monitor Card & Badge
 * A custom Home Assistant Lovelace card and badge that monitors battery levels,
 * contact sensors (doors/windows), and lights with device names from the device registry.
 *
 * Includes:
 * - Device Monitor Card: Full card with device list and details
 * - Device Monitor Badge: Compact badge showing alert count
 *
 * @version 1.3.0
 * @author molant
 * @license MIT
 */

/**
 * Localization Helper for multi-language support
 * Translations are embedded below
 */
EOFMARKER

# Add embedded translations
cat "$TRANSLATIONS_JS" >> dist/device-monitor-card.js

# Add the new LocalizationHelper class that uses embedded translations
cat >> dist/device-monitor-card.js << 'EOFHELPER'

const CARD_VERSION = '1.3.0';

class LocalizationHelper {
  constructor() {
    this.translations = EMBEDDED_TRANSLATIONS;
    this.currentLanguage = 'en';
  }

  async loadTranslations(language) {
    // Translations are embedded, so this is now a no-op
    // Keep the async signature for compatibility
    return Promise.resolve();
  }

  async setLanguage(hass) {
    // Priority order for language detection:
    // 1. hass.locale.language (most reliable)
    // 2. hass.config.language (fallback)
    // 3. hass.language (fallback)
    // 4. 'en' (default)
    const lang = hass?.locale?.language || hass?.config?.language || hass?.language || 'en';
    const shortLang = lang.split('-')[0]; // 'es-ES' -> 'es', 'en-US' -> 'en'

    // Check if we have translations for this language, fallback to English
    this.currentLanguage = this.translations[shortLang] ? shortLang : 'en';

    return Promise.resolve();
  }

  localize(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];

    for (const k of keys) {
      value = value?.[k];
    }

    // Fallback to English if translation missing
    if (value === undefined && this.currentLanguage !== 'en') {
      value = this.translations['en'];
      for (const k of keys) {
        value = value?.[k];
      }
    }

    // Return translated value, or empty string if not found
    return value !== undefined ? value : '';
  }
}

// Create singleton instance
const localizationHelper = new LocalizationHelper();

EOFHELPER

# Now append everything from the source file after the old LocalizationHelper
# Find the line after the old localizationHelper = new LocalizationHelper() and append that
awk '
/^\/\/ Create singleton instance$/ {
    # Skip the old singleton creation and everything before it
    in_skip = 1
    next
}

/^const localizationHelper = new LocalizationHelper\(\);$/ {
    if (in_skip) {
        in_skip = 0
        next
    }
}

!in_skip && NR > 1 {
    if (!/^const CARD_VERSION = / && !/^const DEFAULT_TITLE_FALLBACKS = / && \
        !/^class LocalizationHelper / && !/^\/\*\*$/ && !/^ \* Localization Helper/) {
        print
    }
}
' src/device-monitor-card.js | tail -n +2 >> dist/device-monitor-card.js

# Actually, let's use a simpler approach - just find what comes after the old localizationHelper line
SKIP_UNTIL_LINE=$(grep -n "^const localizationHelper = new LocalizationHelper" src/device-monitor-card.js | head -1 | cut -d: -f1)
if [ ! -z "$SKIP_UNTIL_LINE" ]; then
    SKIP_UNTIL_LINE=$((SKIP_UNTIL_LINE + 2))  # Skip one more line for the blank line
    tail -n +$SKIP_UNTIL_LINE src/device-monitor-card.js >> dist/device-monitor-card.js
fi

# Clean up
rm "$TRANSLATIONS_JS"

# Verify file was created
if [ ! -f "dist/device-monitor-card.js" ]; then
    echo "Error: Build failed!"
    exit 1
fi

OUTPUT_SIZE=$(wc -c < "dist/device-monitor-card.js" | tr -d ' ')
log_success "Built dist/device-monitor-card.js with embedded translations"
log_success "Output size: $OUTPUT_SIZE bytes"
echo ""
echo "Ready for deployment via HACS"
