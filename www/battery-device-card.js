/**
 * Battery Device Card
 * A custom Home Assistant Lovelace card that displays low battery devices
 * with device names from the device registry.
 *
 * @version 1.0.1
 * @author Custom Card
 * @license MIT
 */

class BatteryDeviceCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  /**
   * Called when the card configuration is set
   */
  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this._config = {
      battery_threshold: config.battery_threshold || 20,
      title: config.title || 'Low Battery',
      ...config
    };

    this.render();
  }

  /**
   * Called when hass object is updated
   */
  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  /**
   * Get the card size for layout purposes
   */
  getCardSize() {
    return 3;
  }

  /**
   * Get all battery entities and their device information
   */
  _getBatteryDevices() {
    if (!this._hass) {
      return { lowBatteryDevices: [], totalBatteryDevices: 0 };
    }

    const threshold = this._config.battery_threshold;
    const entities = this._hass.states;
    const devices = {};
    const batteryLowBinarySensors = new Set();

    // First pass: Find all binary_sensor.*_battery_low entities
    Object.keys(entities).forEach(entityId => {
      if (entityId.includes('_battery_low') && entityId.startsWith('binary_sensor.')) {
        batteryLowBinarySensors.add(entityId.replace('binary_sensor.', 'sensor.').replace('_battery_low', '_battery'));
      }
    });

    // Second pass: Process all battery entities
    Object.keys(entities).forEach(entityId => {
      const entity = entities[entityId];
      const attributes = entity.attributes || {};

      // Check if this is a battery_low binary sensor
      const isBatteryLowSensor =
        entityId.includes('_battery_low') &&
        entityId.startsWith('binary_sensor.');

      // Check if this is a battery sensor - be strict to avoid false positives
      const isBatterySensor =
        attributes.device_class === 'battery' ||
        (entityId.includes('battery') &&
         (entityId.startsWith('sensor.') || entityId.startsWith('binary_sensor.')) &&
         attributes.device_class !== 'power' &&
         attributes.device_class !== 'energy');

      if (!isBatterySensor && !isBatteryLowSensor) {
        return;
      }

      // Debug logging - can be disabled by setting window.batteryCardDebug = false
      if (window.batteryCardDebug !== false) {
        console.debug('[Battery Card] Found potential battery entity:', {
          entityId,
          device_class: attributes.device_class,
          state: entity.state,
          unit: attributes.unit_of_measurement,
          isBatterySensor,
          isBatteryLowSensor
        });
      }

      // Skip if there's a corresponding battery_low binary sensor
      if (batteryLowBinarySensors.has(entityId)) {
        return;
      }

      // Get device information
      const deviceId = this._getDeviceId(entityId);
      if (!deviceId) {
        return; // Skip entities without device
      }

      const deviceName = this._getDeviceName(deviceId);
      if (!deviceName) {
        return; // Skip if we can't get device name
      }

      // Parse battery level
      let batteryLevel = null;
      let isLow = false;

      if (isBatteryLowSensor) {
        // Binary sensor for battery low
        isLow = entity.state === 'on';
        batteryLevel = entity.state === 'on' ? 'Low' : 'OK';
      } else {
        // Regular battery sensor
        batteryLevel = parseFloat(entity.state);
        if (!isNaN(batteryLevel)) {
          isLow = batteryLevel < threshold;
        } else {
          // Handle non-numeric states
          batteryLevel = entity.state;
          isLow = entity.state === 'low' || entity.state === 'Low';
        }
      }

      // Store device info
      if (!devices[deviceId]) {
        devices[deviceId] = {
          deviceId,
          deviceName,
          entityId,
          batteryLevel,
          isLow,
          lastChanged: entity.last_changed,
          state: entity.state,
          attributes
        };

        // Debug logging for added devices
        if (window.batteryCardDebug !== false) {
          console.debug('[Battery Card] Added device:', {
            deviceName,
            entityId,
            batteryLevel,
            isLow,
            threshold
          });
        }
      }
    });

    const allDevices = Object.values(devices);
    const lowBatteryDevices = allDevices.filter(d => d.isLow);

    // Summary debug logging
    if (window.batteryCardDebug !== false) {
      console.debug('[Battery Card] Summary:', {
        totalBatteryDevices: allDevices.length,
        lowBatteryDevices: lowBatteryDevices.length,
        threshold,
        devices: allDevices.map(d => ({
          name: d.deviceName,
          entity: d.entityId,
          level: d.batteryLevel,
          isLow: d.isLow
        }))
      });
    }

    return {
      lowBatteryDevices: lowBatteryDevices.sort((a, b) => {
        // Sort by battery level (lowest first), then by device name
        if (typeof a.batteryLevel === 'number' && typeof b.batteryLevel === 'number') {
          return a.batteryLevel - b.batteryLevel;
        }
        return a.deviceName.localeCompare(b.deviceName);
      }),
      totalBatteryDevices: allDevices.length
    };
  }

  /**
   * Get device ID for an entity
   */
  _getDeviceId(entityId) {
    if (!this._hass || !this._hass.entities) {
      return null;
    }

    const entity = this._hass.entities[entityId];
    return entity?.device_id || null;
  }

  /**
   * Get device name from device registry
   */
  _getDeviceName(deviceId) {
    if (!this._hass || !this._hass.devices) {
      return null;
    }

    const device = this._hass.devices[deviceId];
    if (!device) {
      return null;
    }

    return device.name_by_user || device.name || deviceId;
  }

  /**
   * Get battery icon based on level
   */
  _getBatteryIcon(batteryLevel) {
    if (typeof batteryLevel !== 'number') {
      return 'mdi:battery-unknown';
    }

    if (batteryLevel >= 95) return 'mdi:battery';
    if (batteryLevel >= 85) return 'mdi:battery-90';
    if (batteryLevel >= 75) return 'mdi:battery-80';
    if (batteryLevel >= 65) return 'mdi:battery-70';
    if (batteryLevel >= 55) return 'mdi:battery-60';
    if (batteryLevel >= 45) return 'mdi:battery-50';
    if (batteryLevel >= 35) return 'mdi:battery-40';
    if (batteryLevel >= 25) return 'mdi:battery-30';
    if (batteryLevel >= 15) return 'mdi:battery-20';
    if (batteryLevel >= 5) return 'mdi:battery-10';
    return 'mdi:battery-alert';
  }

  /**
   * Get battery icon color based on level
   */
  _getBatteryColor(batteryLevel) {
    if (typeof batteryLevel !== 'number') {
      return '#ffa500'; // orange for unknown
    }

    if (batteryLevel < 10) return '#ff0000'; // red
    if (batteryLevel < 20) return '#ffa500'; // orange
    return '#44739e'; // default blue
  }

  /**
   * Open device page
   */
  _openDevice(deviceId) {
    const event = new Event('hass-more-info', {
      bubbles: true,
      composed: true,
    });
    event.detail = { entityId: null };
    this.dispatchEvent(event);

    // Navigate to device page
    history.pushState(null, '', `/config/devices/device/${deviceId}`);
    window.dispatchEvent(new CustomEvent('location-changed'));
  }

  /**
   * Format last changed time
   */
  _formatLastChanged(lastChanged) {
    if (!lastChanged) return '';

    const date = new Date(lastChanged);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }

  /**
   * Render the card
   */
  render() {
    if (!this._hass) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="card-content">Loading...</div>
        </ha-card>
      `;
      return;
    }

    const { lowBatteryDevices, totalBatteryDevices } = this._getBatteryDevices();
    const title = `${this._config.title} (${lowBatteryDevices.length}/${totalBatteryDevices})`;

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          font-size: 1.2em;
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .device-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .device-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: var(--card-background-color, #fff);
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
          border: 1px solid var(--divider-color, #e0e0e0);
        }

        .device-item:hover {
          background: var(--secondary-background-color, #f5f5f5);
        }

        .device-icon {
          margin-right: 12px;
          flex-shrink: 0;
        }

        .device-icon ha-icon {
          width: 40px;
          height: 40px;
        }

        .device-info {
          flex-grow: 1;
          min-width: 0;
        }

        .device-name {
          font-weight: 500;
          color: var(--primary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .device-secondary {
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }

        .battery-level {
          font-weight: 500;
          font-size: 1.1em;
          margin-left: 12px;
          flex-shrink: 0;
          color: var(--primary-text-color);
        }

        .empty-state {
          text-align: center;
          padding: 32px 16px;
          color: var(--secondary-text-color);
        }

        .empty-state ha-icon {
          width: 64px;
          height: 64px;
          color: var(--success-color, #4caf50);
          margin-bottom: 16px;
        }

        .empty-state-text {
          font-size: 1.1em;
        }

        @media (max-width: 600px) {
          .device-item {
            padding: 10px;
          }

          .device-name {
            font-size: 0.95em;
          }

          .battery-level {
            font-size: 1em;
          }
        }
      </style>

      <ha-card>
        <div class="card-header">${title}</div>
        <div class="card-content">
          ${lowBatteryDevices.length === 0 ? `
            <div class="empty-state">
              <ha-icon icon="mdi:battery-check"></ha-icon>
              <div class="empty-state-text">All batteries are OK!</div>
            </div>
          ` : `
            <div class="device-list">
              ${lowBatteryDevices.map(device => `
                <div class="device-item" data-device-id="${device.deviceId}">
                  <div class="device-icon">
                    <ha-icon
                      icon="${this._getBatteryIcon(device.batteryLevel)}"
                      style="color: ${this._getBatteryColor(device.batteryLevel)};"
                    ></ha-icon>
                  </div>
                  <div class="device-info">
                    <div class="device-name">${device.deviceName}</div>
                    <div class="device-secondary">
                      Last changed: ${this._formatLastChanged(device.lastChanged)}
                    </div>
                  </div>
                  <div class="battery-level">
                    ${typeof device.batteryLevel === 'number'
                      ? `${device.batteryLevel}%`
                      : device.batteryLevel}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </ha-card>
    `;

    // Add click handlers
    this.shadowRoot.querySelectorAll('.device-item').forEach(item => {
      item.addEventListener('click', () => {
        const deviceId = item.getAttribute('data-device-id');
        this._openDevice(deviceId);
      });
    });
  }

  /**
   * Get editor stub (required for card editor)
   */
  static getStubConfig() {
    return {
      battery_threshold: 20,
      title: 'Low Battery'
    };
  }

  /**
   * Get configuration description for the card editor
   */
  static getConfigElement() {
    return document.createElement('battery-device-card-editor');
  }
}

// Register the custom card
customElements.define('battery-device-card', BatteryDeviceCard);

// Register card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'battery-device-card',
  name: 'Battery Device Card',
  description: 'Display low battery devices with device names from the device registry',
  preview: false,
  documentationURL: 'https://github.com/your-repo/battery-device-card',
});

console.info(
  '%c BATTERY-DEVICE-CARD %c 1.0.1 ',
  'color: white; background: #039be5; font-weight: 700;',
  'color: #039be5; background: white; font-weight: 700;'
);
