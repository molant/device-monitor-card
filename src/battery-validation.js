/**
 * Battery Unit Validation Utilities
 * Validates whether an entity should be considered a valid battery sensor
 * based on its unit of measurement and value range.
 */

// Invalid units for battery sensors (case-insensitive)
const INVALID_BATTERY_UNITS = [
  'v', 'mv', 'µv',                           // Voltage units
  'volt', 'volts', 'millivolt', 'millivolts', // Voltage words
  'a', 'ma', 'µa',                           // Current units
  'amp', 'amps', 'milliamp', 'milliamps',    // Current words
  'w', 'mw', 'kw',                           // Power units
  'watt', 'watts',                           // Power words
  'wh', 'kwh', 'mwh',                        // Energy units
  '°c', '°f', 'c', 'f',                      // Temperature units
];

// Valid percent signs across different locales/encodings
const VALID_PERCENT_SIGNS = [
  '%',    // U+0025 - Standard percent sign
  '％',   // U+FF05 - Fullwidth percent sign (CJK)
  '٪',    // U+066A - Arabic percent sign
];

// Home Assistant state values that are not percentages but should not cause
// the entity to be rejected at the value-range stage. Binary/unknown states
// are handled by the caller; we just don't want them to be misread as numbers.
const SPECIAL_HA_STATES = ['unavailable', 'unknown', 'none', ''];

/**
 * Extracts all unit-related values from entity attributes
 * Checks any attribute that contains 'unit' in its name
 * @param {Object} attributes - Entity attributes
 * @returns {string[]} Array of unit values found
 */
function extractAllUnitValues(attributes) {
  if (!attributes || typeof attributes !== 'object') {
    return [];
  }

  const units = [];
  for (const key of Object.keys(attributes)) {
    if (key.toLowerCase().includes('unit') && attributes[key]) {
      units.push(String(attributes[key]));
    }
  }
  return units;
}

/**
 * Checks if a unit string represents a valid battery percentage unit
 * @param {string} unit - The unit string to check
 * @returns {boolean} True if valid (percentage or empty), false if invalid
 */
function isValidBatteryUnit(unit) {
  // No unit is potentially valid (will be checked by value range)
  if (!unit) {
    return true;
  }

  const unitStr = String(unit).trim();

  // Empty string is valid
  if (unitStr === '') {
    return true;
  }

  // Check for valid percent signs
  if (VALID_PERCENT_SIGNS.includes(unitStr)) {
    return true;
  }

  // Check against invalid units (case-insensitive)
  const unitLower = unitStr.toLowerCase();
  if (INVALID_BATTERY_UNITS.includes(unitLower)) {
    return false;
  }

  // Any other unit is considered invalid for battery
  // Only percentage units are valid
  return false;
}

/**
 * Checks if a value is within a valid range for battery percentage.
 *
 * With an explicit percent unit, any numeric value is trusted (overcharged
 * batteries can legitimately read above 100%).
 *
 * Without a percent unit we require the state to be *cleanly* numeric — i.e.
 * the whole string parses via `Number()`, not just a leading digit via
 * `parseFloat()`. This rejects Battery Notes strings like
 * "6× AA (LR91)" (parseFloat=6 passes the old check) while still accepting
 * plain integer/decimal strings like "85" or "85.5". HA special states such
 * as "unavailable" / "unknown" are passed through so the caller can handle
 * them.
 * @param {number|string} value - The state value
 * @param {string|null} unit - The unit of measurement
 * @returns {boolean} True if value range is valid for battery percentage
 */
function isValidBatteryValueRange(value, unit) {
  // If there's a valid percentage unit, trust the value regardless of format.
  if (unit && VALID_PERCENT_SIGNS.includes(String(unit).trim())) {
    return true;
  }

  // Normalize to a trimmed string for string-shaped checks; numeric inputs
  // become "123", NaN becomes "NaN".
  const raw = value === null || value === undefined ? '' : String(value).trim();

  // HA special states are not numeric and are handled elsewhere.
  if (SPECIAL_HA_STATES.includes(raw.toLowerCase())) {
    return true;
  }

  // Strict numeric parse: Number() returns NaN for any trailing non-numeric
  // content (unlike parseFloat which consumes the numeric prefix). This is
  // what rejects "6× AA (LR91)", "Normal", "5 months ago", ISO timestamps,
  // etc. when no % unit is present.
  const numValue = Number(raw);
  if (isNaN(numValue)) {
    return false;
  }

  // Typical voltage range for battery cells — reject without a unit.
  // Common battery voltages: CR2032 ~3V, Li-ion ~3.7V, AA ~1.5V.
  if (numValue > 0 && numValue <= 5) {
    return false;
  }

  // Values > 100 without a % unit are not a percentage.
  if (numValue > 100) {
    return false;
  }

  // Negative values are invalid for a percentage.
  if (numValue < 0) {
    return false;
  }

  return true;
}

/**
 * Validates if an entity has valid battery unit/value characteristics
 * Checks all unit-related attributes and validates value range
 * @param {Object} attributes - Entity attributes
 * @param {string} state - Entity state value
 * @returns {{ valid: boolean, reason?: string }} Validation result with optional reason
 */
function validateBatteryEntity(attributes, state) {
  // Extract all unit values from attributes
  const allUnits = extractAllUnitValues(attributes);

  // If any unit attribute contains an invalid unit, reject
  for (const unit of allUnits) {
    if (!isValidBatteryUnit(unit)) {
      return {
        valid: false,
        reason: `Invalid unit found: "${unit}"`
      };
    }
  }

  // Get the primary unit for value range check
  const primaryUnit = attributes?.unit_of_measurement || attributes?.native_unit_of_measurement;

  // Check value range
  if (!isValidBatteryValueRange(state, primaryUnit)) {
    return {
      valid: false,
      reason: `Value "${state}" is not a valid battery percentage`
    };
  }

  return { valid: true };
}

// Export for testing and usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INVALID_BATTERY_UNITS,
    VALID_PERCENT_SIGNS,
    SPECIAL_HA_STATES,
    extractAllUnitValues,
    isValidBatteryUnit,
    isValidBatteryValueRange,
    validateBatteryEntity
  };
}
