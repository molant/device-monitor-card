#!/usr/bin/env node

/**
 * Build script for Device Monitor Card
 * Embeds translation files into the main JavaScript file for single-file deployment
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  red: '\x1b[0;31m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  info: (msg) => console.log(`${COLORS.yellow}ℹ ${msg}${COLORS.reset}`),
  error: (msg) => console.error(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
};

function main() {
  try {
    // Validate source files
    log.info('Validating source files...');
    const srcFile = path.join(__dirname, '..', 'src', 'device-monitor-card.js');
    const translationsDir = path.join(__dirname, '..', 'src', 'translations');
    const distDir = path.join(__dirname, '..', 'dist');
    const distFile = path.join(distDir, 'device-monitor-card.js');

    if (!fs.existsSync(srcFile)) {
      throw new Error('src/device-monitor-card.js not found!');
    }
    if (!fs.existsSync(translationsDir)) {
      throw new Error('src/translations/ directory not found!');
    }

    // Build embedded translations
    log.info('Building embedded translations...');
    const translationFiles = fs.readdirSync(translationsDir)
      .filter(f => f.endsWith('.json'))
      .sort();

    if (translationFiles.length === 0) {
      throw new Error('No translation files found in src/translations/');
    }

    let translationsCode = 'const EMBEDDED_TRANSLATIONS = {\n';
    translationFiles.forEach((file, index) => {
      const lang = file.replace('.json', '');
      const content = fs.readFileSync(path.join(translationsDir, file), 'utf8');
      translationsCode += `  '${lang}': ${content}`;
      if (index < translationFiles.length - 1) {
        translationsCode += ',\n';
      } else {
        translationsCode += '\n';
      }
    });
    translationsCode += '};\n';

    log.success(`Embedded translations for: ${translationFiles.map(f => f.replace('.json', '')).join(' ')}`);

    // Build output file
    log.info('Building dist/device-monitor-card.js...');

    // Read source
    const source = fs.readFileSync(srcFile, 'utf8');

    // Find split point: just before "const CARD_VERSION"
    const cardVersionMatch = source.match(/^const CARD_VERSION/m);
    if (!cardVersionMatch) {
      throw new Error('Could not find CARD_VERSION in source');
    }

    const headerEndPos = cardVersionMatch.index;
    const header = source.substring(0, headerEndPos);

    // Find where the old localizationHelper initialization ends
    const locHelperMatch = source.match(
      /^\/\/ Create singleton instance\s*\nconst localizationHelper = new LocalizationHelper\(\);/m
    );
    if (!locHelperMatch) {
      throw new Error('Could not find localizationHelper initialization');
    }

    const restStartPos = locHelperMatch.index + locHelperMatch[0].length;
    let rest = source.substring(restStartPos);

    // Skip the preload section
    rest = rest.replace(
      /\n*\/\/ Preload English translations.*?(?=\n\n(?![ \t]))/s,
      ''
    );

    // Build new LocalizationHelper
    const newLocalizationHelper = `const CARD_VERSION = '1.3.0';

class LocalizationHelper {
  constructor() {
    this.translations = EMBEDDED_TRANSLATIONS;
    this.currentLanguage = 'en';
  }

  async loadTranslations(language) {
    return Promise.resolve();
  }

  async setLanguage(hass) {
    const lang = hass?.locale?.language || hass?.config?.language || hass?.language || 'en';
    const shortLang = lang.split('-')[0];
    this.currentLanguage = this.translations[shortLang] ? shortLang : 'en';
    return Promise.resolve();
  }

  localize(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];
    for (const k of keys) {
      value = value?.[k];
    }
    if (value === undefined && this.currentLanguage !== 'en') {
      value = this.translations['en'];
      for (const k of keys) {
        value = value?.[k];
      }
    }
    return value !== undefined ? value : '';
  }
}

// Create singleton instance
const localizationHelper = new LocalizationHelper();
`;

    // Combine all parts
    const output = header + '\n\n' + translationsCode + '\n' + newLocalizationHelper + rest;

    // Create dist directory
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Write output
    fs.writeFileSync(distFile, output, 'utf8');

    // Validate syntax
    try {
      require('child_process').execSync(`node -c "${distFile}"`, { stdio: 'pipe' });
    } catch (err) {
      throw new Error(`Syntax check failed:\n${err.message}`);
    }

    // Report success
    const size = fs.statSync(distFile).size;
    log.success(`Built dist/device-monitor-card.js with embedded translations`);
    log.success(`Output size: ${size} bytes (syntax verified)`);
    console.log('\nReady for deployment via HACS');
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }
}

main();
