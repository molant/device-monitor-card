/**
 * Battery Device Card
 * A custom Home Assistant Lovelace card that displays low battery devices
 * with device names from the device registry.
 *
 * @version 1.2.1
 * @author Custom Card
 * @license MIT
 */

class BatteryDeviceCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._expanded = false;
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
      debug: config.debug || false,
      collapse: config.collapse,
      all_devices: config.all_devices || false,
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

      // Skip non-level battery entities (state, charging status, etc.)
      const excludedSuffixes = ['_state', '_charging', '_charger', '_power', '_health'];
      const isExcludedEntity = excludedSuffixes.some(suffix => entityId.endsWith(suffix));

      if (isExcludedEntity) {
        return;
      }

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

      // Debug logging
      if (this._config.debug) {
        console.log('[Battery Card] Found potential battery entity:', {
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

      // Store or update device info
      // Prefer entities with numeric battery levels over non-numeric
      const existingDevice = devices[deviceId];
      const shouldUpdate = !existingDevice ||
        (typeof batteryLevel === 'number' && typeof existingDevice.batteryLevel !== 'number') ||
        (attributes.device_class === 'battery' && existingDevice.attributes?.device_class !== 'battery');

      if (shouldUpdate) {
        const action = existingDevice ? 'Updated' : 'Added';

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

        // Debug logging for added/updated devices
        if (this._config.debug) {
          console.log(`[Battery Card] ${action} device:`, {
            deviceName,
            entityId,
            batteryLevel,
            isLow,
            threshold,
            replacedEntity: existingDevice?.entityId
          });
        }
      } else if (this._config.debug) {
        console.log('[Battery Card] Skipped entity (already have better):', {
          deviceName,
          entityId,
          existingEntity: existingDevice.entityId
        });
      }
    });

    const allDevices = Object.values(devices);
    const lowBatteryDevices = allDevices.filter(d => d.isLow);
    const normalBatteryDevices = allDevices.filter(d => !d.isLow);

    // Summary debug logging
    if (this._config.debug) {
      console.log('[Battery Card] Summary:', {
        totalBatteryDevices: allDevices.length,
        lowBatteryDevices: lowBatteryDevices.length,
        normalBatteryDevices: normalBatteryDevices.length,
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
      normalBatteryDevices: normalBatteryDevices.sort((a, b) => {
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
    // Handle binary sensor battery_low states
    if (batteryLevel === 'Low') {
      return 'mdi:battery-alert';
    }
    if (batteryLevel === 'OK') {
      return 'mdi:battery';
    }

    // Handle non-numeric unknown states
    if (typeof batteryLevel !== 'number') {
      return 'mdi:battery-unknown';
    }

    // Handle numeric battery levels
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
    // Handle binary sensor battery_low states
    if (batteryLevel === 'Low') {
      return '#ff0000'; // red for low battery
    }
    if (batteryLevel === 'OK') {
      return '#44739e'; // blue for OK battery
    }

    // Handle non-numeric unknown states
    if (typeof batteryLevel !== 'number') {
      return '#ffa500'; // orange for unknown
    }

    // Handle numeric battery levels
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
   * Render a single device row
   */
  _renderDevice(device) {
    return `
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
    `;
  }

  /**
   * Toggle expanded state
   */
  _toggleExpanded() {
    this._expanded = !this._expanded;
    this.render();
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

    const { lowBatteryDevices, normalBatteryDevices, totalBatteryDevices } = this._getBatteryDevices();
    const showAllDevices = this._config.all_devices;
    const collapseLimit = this._config.collapse;

    // Determine which devices to show
    let devicesToShow = showAllDevices
      ? [...lowBatteryDevices, ...normalBatteryDevices]
      : lowBatteryDevices;

    // Apply collapse logic
    const shouldCollapse = collapseLimit && devicesToShow.length > collapseLimit;
    const displayDevices = shouldCollapse && !this._expanded
      ? devicesToShow.slice(0, collapseLimit)
      : devicesToShow;

    const hiddenCount = shouldCollapse ? devicesToShow.length - collapseLimit : 0;

    const title = `${this._config.title} (${lowBatteryDevices.length}/${totalBatteryDevices})`;

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 0;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 16px 8px 16px;
          font-size: 1.2em;
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .card-content {
          padding: 0 16px 16px 16px;
        }

        .device-list {
          display: flex;
          flex-direction: column;
          row-gap: 8px;
        }

        .device-item {
          display: flex;
          align-items: center;
          cursor: pointer;
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
          margin-top: 2px;
        }

        .battery-level {
          font-weight: 500;
          font-size: 1.1em;
          margin-left: 12px;
          flex-shrink: 0;
          color: var(--primary-text-color);
        }

        .divider {
          height: 1px;
          background: var(--divider-color, #e0e0e0);
          margin: 8px 0;
        }

        .expand-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          margin-top: 8px;
          cursor: pointer;
          color: var(--primary-color, #03a9f4);
          font-size: 0.9em;
          font-weight: 500;
        }

        .expand-button:hover {
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
          border-radius: 4px;
        }

        .expand-button ha-icon {
          width: 20px;
          height: 20px;
          margin-left: 4px;
        }

        .empty-state {
          text-align: center;
          padding: 32px 0;
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
          ${lowBatteryDevices.length === 0 && !showAllDevices ? `
            <div class="empty-state">
              <ha-icon icon="mdi:battery-check"></ha-icon>
              <div class="empty-state-text">All batteries are OK!</div>
            </div>
          ` : `
            <div class="device-list">
              ${displayDevices.map((device, index) => {
                // Add divider between low and normal battery devices
                const needsDivider = showAllDevices &&
                  index === lowBatteryDevices.length &&
                  lowBatteryDevices.length > 0 &&
                  normalBatteryDevices.length > 0;

                return (needsDivider ? '<div class="divider"></div>' : '') +
                  this._renderDevice(device);
              }).join('')}
            </div>
            ${shouldCollapse ? `
              <div class="expand-button" id="expand-button">
                ${this._expanded
                  ? `Show less<ha-icon icon="mdi:chevron-up"></ha-icon>`
                  : `Show ${hiddenCount} more<ha-icon icon="mdi:chevron-down"></ha-icon>`
                }
              </div>
            ` : ''}
          `}
        </div>
      </ha-card>
    `;

    // Add click handlers for device items
    this.shadowRoot.querySelectorAll('.device-item').forEach(item => {
      item.addEventListener('click', () => {
        const deviceId = item.getAttribute('data-device-id');
        this._openDevice(deviceId);
      });
    });

    // Add click handler for expand button
    const expandButton = this.shadowRoot.querySelector('#expand-button');
    if (expandButton) {
      expandButton.addEventListener('click', () => this._toggleExpanded());
    }
  }

  /**
   * Get editor stub (required for card editor)
   */
  static getStubConfig() {
    return {
      battery_threshold: 20,
      title: 'Low Battery',
      debug: false,
      collapse: undefined,
      all_devices: false
    };
  }

  /**
   * Get configuration description for the card editor
   */
  static getConfigElement() {
    return document.createElement('battery-device-card-editor');
  }
}

/**
 * Card Editor
 */
class BatteryDeviceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this.render();
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);

    // Update internal config to reflect changes
    this._config = newConfig;
  }

  render() {
    if (!this._config) {
      return;
    }

    this.innerHTML = `
      <style>
        .option {
          padding: 12px 0;
          display: flex;
          align-items: center;
        }

        .option:not(:last-child) {
          border-bottom: 1px solid var(--divider-color);
        }

        .option label {
          flex: 1;
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .option .description {
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }

        .option input[type="text"],
        .option input[type="number"] {
          width: 100px;
          padding: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
        }

        .option input[type="checkbox"] {
          width: 24px;
          height: 24px;
          cursor: pointer;
        }

        .label-container {
          flex: 1;
        }
      </style>

      <div class="card-config">
        <div class="option">
          <div class="label-container">
            <label>Title</label>
            <div class="description">Card title text</div>
          </div>
          <input
            id="title"
            type="text"
            value="${this._config.title || 'Low Battery'}"
          />
        </div>

        <div class="option">
          <div class="label-container">
            <label>Battery Threshold</label>
            <div class="description">Low battery percentage threshold</div>
          </div>
          <input
            id="battery_threshold"
            type="number"
            min="0"
            max="100"
            value="${this._config.battery_threshold !== undefined ? this._config.battery_threshold : 20}"
          />
        </div>

        <div class="option">
          <div class="label-container">
            <label>Collapse</label>
            <div class="description">Limit displayed devices (leave empty for no limit)</div>
          </div>
          <input
            id="collapse"
            type="number"
            min="1"
            value="${this._config.collapse || ''}"
            placeholder="No limit"
          />
        </div>

        <div class="option">
          <div class="label-container">
            <label>Show All Devices</label>
            <div class="description">Show all battery devices, not just low battery</div>
          </div>
          <input
            id="all_devices"
            type="checkbox"
            ${this._config.all_devices ? 'checked' : ''}
          />
        </div>

        <div class="option">
          <div class="label-container">
            <label>Debug Mode</label>
            <div class="description">Enable debug logging in browser console</div>
          </div>
          <input
            id="debug"
            type="checkbox"
            ${this._config.debug ? 'checked' : ''}
          />
        </div>
      </div>
    `;

    // Add event listeners after HTML is inserted
    const titleInput = this.querySelector('#title');
    const thresholdInput = this.querySelector('#battery_threshold');
    const collapseInput = this.querySelector('#collapse');
    const allDevicesInput = this.querySelector('#all_devices');
    const debugInput = this.querySelector('#debug');

    titleInput.addEventListener('input', (ev) => {
      const newConfig = { ...this._config };
      newConfig.title = ev.target.value;
      this.configChanged(newConfig);
    });

    thresholdInput.addEventListener('input', (ev) => {
      const newConfig = { ...this._config };
      const value = Number(ev.target.value);
      newConfig.battery_threshold = value;
      this.configChanged(newConfig);
    });

    collapseInput.addEventListener('input', (ev) => {
      const newConfig = { ...this._config };
      const value = ev.target.value;
      if (value === '') {
        delete newConfig.collapse;
      } else {
        newConfig.collapse = Number(value);
      }
      this.configChanged(newConfig);
    });

    allDevicesInput.addEventListener('change', (ev) => {
      const newConfig = { ...this._config };
      newConfig.all_devices = ev.target.checked;
      this.configChanged(newConfig);
    });

    debugInput.addEventListener('change', (ev) => {
      const newConfig = { ...this._config };
      newConfig.debug = ev.target.checked;
      this.configChanged(newConfig);
    });
  }
}

// Register the custom card
customElements.define('battery-device-card', BatteryDeviceCard);
customElements.define('battery-device-card-editor', BatteryDeviceCardEditor);

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
  '%c BATTERY-DEVICE-CARD %c 1.2.1 ',
  'color: white; background: #039be5; font-weight: 700;',
  'color: #039be5; background: white; font-weight: 700;'
);
