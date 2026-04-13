/**
 * Tests for Battery Validation Utilities
 * Run with: node --test tests/battery-validation.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  INVALID_BATTERY_UNITS,
  VALID_PERCENT_SIGNS,
  SPECIAL_HA_STATES,
  extractAllUnitValues,
  isValidBatteryUnit,
  isValidBatteryValueRange,
  validateBatteryEntity
} = require('../src/battery-validation.js');

describe('Battery Validation', () => {

  describe('VALID_PERCENT_SIGNS', () => {
    it('should include standard percent sign', () => {
      assert.ok(VALID_PERCENT_SIGNS.includes('%'));
    });

    it('should include fullwidth percent sign (CJK)', () => {
      assert.ok(VALID_PERCENT_SIGNS.includes('％'));
    });

    it('should include Arabic percent sign', () => {
      assert.ok(VALID_PERCENT_SIGNS.includes('٪'));
    });
  });

  describe('SPECIAL_HA_STATES', () => {
    it('should include the HA-wide unavailable/unknown states', () => {
      assert.ok(SPECIAL_HA_STATES.includes('unavailable'));
      assert.ok(SPECIAL_HA_STATES.includes('unknown'));
    });

    it('should include "none" and empty string', () => {
      assert.ok(SPECIAL_HA_STATES.includes('none'));
      assert.ok(SPECIAL_HA_STATES.includes(''));
    });
  });

  describe('INVALID_BATTERY_UNITS', () => {
    it('should include common voltage units', () => {
      assert.ok(INVALID_BATTERY_UNITS.includes('v'));
      assert.ok(INVALID_BATTERY_UNITS.includes('mv'));
      assert.ok(INVALID_BATTERY_UNITS.includes('volt'));
      assert.ok(INVALID_BATTERY_UNITS.includes('volts'));
    });

    it('should include current units', () => {
      assert.ok(INVALID_BATTERY_UNITS.includes('a'));
      assert.ok(INVALID_BATTERY_UNITS.includes('ma'));
    });

    it('should include power units', () => {
      assert.ok(INVALID_BATTERY_UNITS.includes('w'));
      assert.ok(INVALID_BATTERY_UNITS.includes('watt'));
    });
  });

  describe('extractAllUnitValues', () => {
    it('should extract unit_of_measurement', () => {
      const attrs = { unit_of_measurement: '%' };
      const units = extractAllUnitValues(attrs);
      assert.deepStrictEqual(units, ['%']);
    });

    it('should extract native_unit_of_measurement', () => {
      const attrs = { native_unit_of_measurement: 'V' };
      const units = extractAllUnitValues(attrs);
      assert.deepStrictEqual(units, ['V']);
    });

    it('should extract both unit attributes', () => {
      const attrs = {
        unit_of_measurement: '%',
        native_unit_of_measurement: '%'
      };
      const units = extractAllUnitValues(attrs);
      assert.strictEqual(units.length, 2);
      assert.ok(units.includes('%'));
    });

    it('should extract suggested_unit_of_measurement', () => {
      const attrs = { suggested_unit_of_measurement: 'V' };
      const units = extractAllUnitValues(attrs);
      assert.deepStrictEqual(units, ['V']);
    });

    it('should extract any attribute containing "unit"', () => {
      const attrs = {
        some_unit_value: 'W',
        custom_unit: 'mV'
      };
      const units = extractAllUnitValues(attrs);
      assert.strictEqual(units.length, 2);
    });

    it('should return empty array for null/undefined', () => {
      assert.deepStrictEqual(extractAllUnitValues(null), []);
      assert.deepStrictEqual(extractAllUnitValues(undefined), []);
    });

    it('should skip null/undefined unit values', () => {
      const attrs = {
        unit_of_measurement: null,
        native_unit_of_measurement: undefined
      };
      const units = extractAllUnitValues(attrs);
      assert.deepStrictEqual(units, []);
    });
  });

  describe('isValidBatteryUnit', () => {
    describe('valid units', () => {
      it('should accept standard percent sign', () => {
        assert.strictEqual(isValidBatteryUnit('%'), true);
      });

      it('should accept fullwidth percent sign', () => {
        assert.strictEqual(isValidBatteryUnit('％'), true);
      });

      it('should accept Arabic percent sign', () => {
        assert.strictEqual(isValidBatteryUnit('٪'), true);
      });

      it('should accept null/undefined (no unit)', () => {
        assert.strictEqual(isValidBatteryUnit(null), true);
        assert.strictEqual(isValidBatteryUnit(undefined), true);
      });

      it('should accept empty string', () => {
        assert.strictEqual(isValidBatteryUnit(''), true);
      });

      it('should accept whitespace-only string as empty', () => {
        assert.strictEqual(isValidBatteryUnit('  '), true);
      });
    });

    describe('invalid units - voltage', () => {
      it('should reject uppercase V', () => {
        assert.strictEqual(isValidBatteryUnit('V'), false);
      });

      it('should reject lowercase v', () => {
        assert.strictEqual(isValidBatteryUnit('v'), false);
      });

      it('should reject mV (millivolt)', () => {
        assert.strictEqual(isValidBatteryUnit('mV'), false);
        assert.strictEqual(isValidBatteryUnit('mv'), false);
        assert.strictEqual(isValidBatteryUnit('MV'), false);
      });

      it('should reject µV (microvolt)', () => {
        assert.strictEqual(isValidBatteryUnit('µV'), false);
        assert.strictEqual(isValidBatteryUnit('µv'), false);
      });

      it('should reject "volt" and "volts"', () => {
        assert.strictEqual(isValidBatteryUnit('volt'), false);
        assert.strictEqual(isValidBatteryUnit('Volt'), false);
        assert.strictEqual(isValidBatteryUnit('VOLT'), false);
        assert.strictEqual(isValidBatteryUnit('volts'), false);
        assert.strictEqual(isValidBatteryUnit('Volts'), false);
      });
    });

    describe('invalid units - current', () => {
      it('should reject A (ampere)', () => {
        assert.strictEqual(isValidBatteryUnit('A'), false);
        assert.strictEqual(isValidBatteryUnit('a'), false);
      });

      it('should reject mA (milliampere)', () => {
        assert.strictEqual(isValidBatteryUnit('mA'), false);
        assert.strictEqual(isValidBatteryUnit('ma'), false);
      });
    });

    describe('invalid units - power', () => {
      it('should reject W (watt)', () => {
        assert.strictEqual(isValidBatteryUnit('W'), false);
        assert.strictEqual(isValidBatteryUnit('w'), false);
      });

      it('should reject kW (kilowatt)', () => {
        assert.strictEqual(isValidBatteryUnit('kW'), false);
        assert.strictEqual(isValidBatteryUnit('kw'), false);
      });
    });

    describe('invalid units - energy', () => {
      it('should reject Wh (watt-hour)', () => {
        assert.strictEqual(isValidBatteryUnit('Wh'), false);
        assert.strictEqual(isValidBatteryUnit('wh'), false);
      });

      it('should reject kWh (kilowatt-hour)', () => {
        assert.strictEqual(isValidBatteryUnit('kWh'), false);
        assert.strictEqual(isValidBatteryUnit('kwh'), false);
      });
    });

    describe('invalid units - temperature', () => {
      it('should reject °C (Celsius)', () => {
        assert.strictEqual(isValidBatteryUnit('°C'), false);
        assert.strictEqual(isValidBatteryUnit('°c'), false);
      });

      it('should reject °F (Fahrenheit)', () => {
        assert.strictEqual(isValidBatteryUnit('°F'), false);
        assert.strictEqual(isValidBatteryUnit('°f'), false);
      });
    });

    describe('invalid units - other', () => {
      it('should reject any unknown unit', () => {
        assert.strictEqual(isValidBatteryUnit('foo'), false);
        assert.strictEqual(isValidBatteryUnit('bar'), false);
        assert.strictEqual(isValidBatteryUnit('123'), false);
      });
    });
  });

  describe('isValidBatteryValueRange', () => {
    describe('with percentage unit', () => {
      it('should accept any value with % unit', () => {
        assert.strictEqual(isValidBatteryValueRange(0, '%'), true);
        assert.strictEqual(isValidBatteryValueRange(50, '%'), true);
        assert.strictEqual(isValidBatteryValueRange(100, '%'), true);
        assert.strictEqual(isValidBatteryValueRange(2.98, '%'), true); // even this with explicit %
      });

      it('should accept values with fullwidth percent', () => {
        assert.strictEqual(isValidBatteryValueRange(50, '％'), true);
      });
    });

    describe('without unit (voltage detection)', () => {
      it('should reject values in typical voltage range (0-5V) without unit', () => {
        assert.strictEqual(isValidBatteryValueRange(2.98, null), false); // CR2032 voltage
        assert.strictEqual(isValidBatteryValueRange(3.7, null), false);  // Li-ion voltage
        assert.strictEqual(isValidBatteryValueRange(1.5, null), false);  // AA battery voltage
        assert.strictEqual(isValidBatteryValueRange(4.2, null), false);  // Fully charged Li-ion
        assert.strictEqual(isValidBatteryValueRange(0.5, null), false);
        assert.strictEqual(isValidBatteryValueRange(5, null), false);
      });

      it('should accept 0 without unit (could be 0%)', () => {
        assert.strictEqual(isValidBatteryValueRange(0, null), true);
      });

      it('should accept values > 5 without unit (likely percentage)', () => {
        assert.strictEqual(isValidBatteryValueRange(6, null), true);
        assert.strictEqual(isValidBatteryValueRange(50, null), true);
        assert.strictEqual(isValidBatteryValueRange(100, null), true);
      });

      it('should reject negative values', () => {
        assert.strictEqual(isValidBatteryValueRange(-1, null), false);
        assert.strictEqual(isValidBatteryValueRange(-50, null), false);
      });

      it('should reject values > 100 without a valid percent unit', () => {
        // Battery Notes "last replaced" timestamp parses to the year (e.g. 2026)
        assert.strictEqual(isValidBatteryValueRange(2026, null), false);
        assert.strictEqual(isValidBatteryValueRange(101, null), false);
        assert.strictEqual(isValidBatteryValueRange(500, null), false);
      });

      it('should still accept 100 without unit (boundary)', () => {
        assert.strictEqual(isValidBatteryValueRange(100, null), true);
      });
    });

    describe('non-numeric values', () => {
      it('should accept HA special states (handled separately)', () => {
        assert.strictEqual(isValidBatteryValueRange('unavailable', null), true);
        assert.strictEqual(isValidBatteryValueRange('unknown', null), true);
        assert.strictEqual(isValidBatteryValueRange('none', null), true);
        assert.strictEqual(isValidBatteryValueRange('', null), true);
        assert.strictEqual(isValidBatteryValueRange(null, null), true);
      });

      it('should reject arbitrary non-numeric strings without a % unit', () => {
        // These are real Battery Notes / diagnostic states that parseFloat
        // either returned NaN for (accepted previously) or consumed a prefix
        // from ("6× AA (LR91)" → 6). All must now be rejected.
        assert.strictEqual(isValidBatteryValueRange('6× AA (LR91)', null), false);
        assert.strictEqual(isValidBatteryValueRange('Normal', null), false);
        assert.strictEqual(isValidBatteryValueRange('5 months ago', null), false);
        assert.strictEqual(isValidBatteryValueRange('Press', null), false);
        assert.strictEqual(isValidBatteryValueRange('low', null), false);
        assert.strictEqual(isValidBatteryValueRange('ok', null), false);
      });
    });

    describe('string numeric values', () => {
      it('should parse clean numeric strings correctly', () => {
        assert.strictEqual(isValidBatteryValueRange('2.98', null), false);
        assert.strictEqual(isValidBatteryValueRange('50', null), true);
        assert.strictEqual(isValidBatteryValueRange('100', null), true);
        assert.strictEqual(isValidBatteryValueRange('85.5', null), true);
      });

      it('should reject ISO timestamp strings', () => {
        // Number('2026-04-12T10:30:00+00:00') is NaN (parseFloat would have
        // returned 2026; the stricter check catches both shapes).
        assert.strictEqual(isValidBatteryValueRange('2026-04-12T10:30:00+00:00', null), false);
      });
    });
  });

  describe('validateBatteryEntity', () => {
    describe('valid battery entities', () => {
      it('should accept entity with % unit and valid percentage value', () => {
        const result = validateBatteryEntity(
          { unit_of_measurement: '%' },
          '85'
        );
        assert.strictEqual(result.valid, true);
      });

      it('should accept entity with fullwidth % unit', () => {
        const result = validateBatteryEntity(
          { unit_of_measurement: '％' },
          '50'
        );
        assert.strictEqual(result.valid, true);
      });

      it('should accept entity with no unit and value > 5', () => {
        const result = validateBatteryEntity({}, '75');
        assert.strictEqual(result.valid, true);
      });

      it('should accept entity with 0 value and no unit', () => {
        const result = validateBatteryEntity({}, '0');
        assert.strictEqual(result.valid, true);
      });
    });

    describe('invalid battery entities - unit based', () => {
      it('should reject entity with V unit', () => {
        const result = validateBatteryEntity(
          { unit_of_measurement: 'V' },
          '3.7'
        );
        assert.strictEqual(result.valid, false);
        assert.ok(result.reason.includes('V'));
      });

      it('should reject entity with native_unit_of_measurement: V', () => {
        const result = validateBatteryEntity(
          { native_unit_of_measurement: 'V' },
          '2.98'
        );
        assert.strictEqual(result.valid, false);
      });

      it('should reject if any unit attribute is invalid', () => {
        const result = validateBatteryEntity(
          {
            unit_of_measurement: '%',
            native_unit_of_measurement: 'V'  // One valid, one invalid
          },
          '50'
        );
        assert.strictEqual(result.valid, false);
      });

      it('should reject entity with suggested_unit_of_measurement: mV', () => {
        const result = validateBatteryEntity(
          { suggested_unit_of_measurement: 'mV' },
          '2980'
        );
        assert.strictEqual(result.valid, false);
      });
    });

    describe('invalid battery entities - value range based', () => {
      it('should reject voltage-like value without unit', () => {
        const result = validateBatteryEntity({}, '2.98');
        assert.strictEqual(result.valid, false);
        assert.ok(result.reason.includes('not a valid battery percentage'));
      });

      it('should reject 3.7V-like value without unit', () => {
        const result = validateBatteryEntity({}, '3.7');
        assert.strictEqual(result.valid, false);
      });

      it('should reject 1.5V-like value without unit', () => {
        const result = validateBatteryEntity({}, '1.5');
        assert.strictEqual(result.valid, false);
      });
    });

    describe('real-world scenarios', () => {
      it('should handle Ecowitt GW2000A battery (V unit in native only)', () => {
        // This is the actual bug scenario
        const result = validateBatteryEntity(
          {
            device_class: 'battery',
            native_unit_of_measurement: 'V',
            // unit_of_measurement might be undefined
          },
          '2.98'
        );
        assert.strictEqual(result.valid, false);
      });

      it('should handle typical Zigbee battery sensor', () => {
        const result = validateBatteryEntity(
          {
            device_class: 'battery',
            unit_of_measurement: '%',
            state_class: 'measurement'
          },
          '87'
        );
        assert.strictEqual(result.valid, true);
      });

      it('should handle unavailable battery sensor (HA special state)', () => {
        const result = validateBatteryEntity(
          { device_class: 'battery', unit_of_measurement: '%' },
          'unavailable'
        );
        assert.strictEqual(result.valid, true);
      });

      it('should handle unavailable battery sensor with no unit', () => {
        // Exercises the SPECIAL_HA_STATES allowlist in isValidBatteryValueRange
        // (the %-unit path above short-circuits before the allowlist).
        const result = validateBatteryEntity(
          { device_class: 'battery' },
          'unavailable'
        );
        assert.strictEqual(result.valid, true);
      });

      it('should handle battery sensor with 100%', () => {
        const result = validateBatteryEntity(
          { unit_of_measurement: '%' },
          '100'
        );
        assert.strictEqual(result.valid, true);
      });

      it('should handle overcharged battery > 100%', () => {
        const result = validateBatteryEntity(
          { unit_of_measurement: '%' },
          '102'
        );
        assert.strictEqual(result.valid, true);
      });

      it('should reject Battery Notes "last replaced" timestamp entity', () => {
        // Battery Notes exposes a timestamp sensor whose entity_id contains
        // "battery" but whose state is an ISO date like "2026-04-12T...".
        // parseFloat gives 2026, which is clearly not a battery percentage.
        const result = validateBatteryEntity(
          { device_class: 'timestamp' },
          '2026-04-12T10:30:00+00:00'
        );
        assert.strictEqual(result.valid, false);
      });

      it('should reject Battery Notes "battery type" entity (Nest Protect)', () => {
        // sensor.living_room_nest_protect_battery_type exposes a human string
        // like "6× AA (LR91)". parseFloat would consume the leading 6 and
        // render it as "6%" (issue #22 follow-up).
        const result = validateBatteryEntity({}, '6× AA (LR91)');
        assert.strictEqual(result.valid, false);
      });

      it('should reject Battery Notes diagnostic string states', () => {
        // Other non-numeric Battery Notes / diagnostic states seen on the
        // same device page.
        assert.strictEqual(validateBatteryEntity({}, 'Normal').valid, false);
        assert.strictEqual(validateBatteryEntity({}, '5 months ago').valid, false);
        assert.strictEqual(validateBatteryEntity({}, 'Press').valid, false);
      });
    });

    describe('edge cases', () => {
      it('should handle null attributes', () => {
        const result = validateBatteryEntity(null, '50');
        assert.strictEqual(result.valid, true);
      });

      it('should handle undefined attributes', () => {
        const result = validateBatteryEntity(undefined, '50');
        assert.strictEqual(result.valid, true);
      });

      it('should handle empty attributes', () => {
        const result = validateBatteryEntity({}, '50');
        assert.strictEqual(result.valid, true);
      });

      it('should handle case variations in units', () => {
        // Uppercase
        let result = validateBatteryEntity({ unit_of_measurement: 'V' }, '3.7');
        assert.strictEqual(result.valid, false);

        // Lowercase
        result = validateBatteryEntity({ unit_of_measurement: 'v' }, '3.7');
        assert.strictEqual(result.valid, false);

        // Mixed case
        result = validateBatteryEntity({ unit_of_measurement: 'Volt' }, '3.7');
        assert.strictEqual(result.valid, false);
      });
    });
  });
});
