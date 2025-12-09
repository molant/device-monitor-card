/**
 * Device Monitor Card & Badge
 * A custom Home Assistant Lovelace card and badge that monitors battery levels,
 * contact sensors (doors/windows), and lights with device names from the device registry.
 *
 * Includes:
 * - Device Monitor Card: Full card with device list and details
 * - Device Monitor Badge: Compact badge showing alert count
 *
 * @version 1.0.0
 * @author Custom Card
 * @license MIT
 */

/**
 * Entity type strategies for different device types
 */
const ENTITY_TYPES = {
  battery: {
    name: 'Battery',

    // Detect if an entity is a battery sensor
    detect: (entityId, attributes) => {
      const excludedSuffixes = ['_state', '_charging', '_charger', '_power', '_health'];
      const isExcludedEntity = excludedSuffixes.some(suffix => entityId.endsWith(suffix));

      if (isExcludedEntity) return false;

      return attributes.device_class === 'battery' ||
        (entityId.includes('battery') &&
          (entityId.startsWith('sensor.') || entityId.startsWith('binary_sensor.')) &&
          attributes.device_class !== 'power' &&
          attributes.device_class !== 'energy');
    },

    // Evaluate if the entity state is in alert condition
    evaluateState: (entity, config) => {
      const threshold = config.battery_threshold || 20;
      const entityId = entity.entity_id;

      // Handle binary_sensor.*_battery_low
      if (entityId.includes('_battery_low') && entityId.startsWith('binary_sensor.')) {
        return {
          value: entity.state === 'on' ? 'Low' : 'OK',
          displayValue: entity.state === 'on' ? 'Low' : 'OK',
          isAlert: entity.state === 'on',
          numericValue: null
        };
      }

      // Handle numeric battery levels
      const batteryLevel = parseFloat(entity.state);
      if (!isNaN(batteryLevel)) {
        return {
          value: batteryLevel,
          displayValue: `${batteryLevel}%`,
          isAlert: batteryLevel < threshold,
          numericValue: batteryLevel
        };
      }

      // Handle non-numeric states
      return {
        value: entity.state,
        displayValue: entity.state,
        isAlert: entity.state === 'low' || entity.state === 'Low',
        numericValue: null
      };
    },

    // Get icon for battery state
    getIcon: (state) => {
      if (state.value === 'Low') return 'mdi:battery-alert';
      if (state.value === 'OK') return 'mdi:battery';
      if (state.numericValue === null) return 'mdi:battery-unknown';

      const level = state.numericValue;
      if (level >= 95) return 'mdi:battery';
      if (level >= 85) return 'mdi:battery-90';
      if (level >= 75) return 'mdi:battery-80';
      if (level >= 65) return 'mdi:battery-70';
      if (level >= 55) return 'mdi:battery-60';
      if (level >= 45) return 'mdi:battery-50';
      if (level >= 35) return 'mdi:battery-40';
      if (level >= 25) return 'mdi:battery-30';
      if (level >= 15) return 'mdi:battery-20';
      if (level >= 5) return 'mdi:battery-10';
      return 'mdi:battery-alert';
    },

    // Get color for battery state
    getColor: (state) => {
      if (state.value === 'Low') return '#ff0000';
      if (state.value === 'OK') return '#44739e';
      if (state.numericValue === null) return '#ffa500';

      const level = state.numericValue;
      if (level < 10) return '#ff0000'; // red
      if (level < 20) return '#ffa500'; // orange
      return '#44739e'; // blue
    },

    // Get empty state message
    emptyMessage: 'All batteries are OK!',
    emptyIcon: 'mdi:battery-check',

    // Default title for badge
    defaultTitle: 'Low Battery',

    // Get badge color based on alert count
    getBadgeColor: (alertCount) => {
      if (alertCount === 0) return 'var(--success-color, #4caf50)';
      return 'var(--label-badge-red, #df4c1e)';
    }
  },

  contact: {
    name: 'Contact Sensor',

    // Detect if an entity is a contact sensor
    detect: (entityId, attributes) => {
      if (!entityId.startsWith('binary_sensor.')) return false;

      const deviceClass = attributes.device_class;
      return deviceClass === 'door' ||
        deviceClass === 'window' ||
        deviceClass === 'garage_door' ||
        deviceClass === 'opening';
    },

    // Evaluate if the entity state is in alert condition
    evaluateState: (entity, config) => {
      const isOpen = entity.state === 'on';
      return {
        value: entity.state,
        displayValue: isOpen ? 'Open' : 'Closed',
        isAlert: isOpen,
        numericValue: null
      };
    },

    // Get icon for contact sensor state
    getIcon: (state) => {
      const deviceClass = state.attributes?.device_class;
      const isOpen = state.value === 'on';

      if (deviceClass === 'window') {
        return isOpen ? 'mdi:window-open' : 'mdi:window-closed';
      }
      if (deviceClass === 'garage_door') {
        return isOpen ? 'mdi:garage-open' : 'mdi:garage';
      }
      // Default to door icon for 'door' and 'opening' device classes
      return isOpen ? 'mdi:door-open' : 'mdi:door-closed';
    },

    // Get color for contact sensor state
    getColor: (state) => {
      return state.isAlert ? '#ffa500' : 'var(--success-color, #4caf50)';
    },

    // Get empty state message
    emptyMessage: 'All doors and windows are closed!',
    emptyIcon: 'mdi:door-closed',

    // Default title for badge
    defaultTitle: 'Open Doors',

    // Get badge color based on alert count
    getBadgeColor: (alertCount) => {
      if (alertCount === 0) return 'var(--success-color, #4caf50)';
      return 'var(--label-badge-yellow, #f4b400)';
    }
  },

  light: {
    name: 'Light',

    // Detect if an entity is a light
    detect: (entityId, attributes) => {
      return entityId.startsWith('light.');
    },

    // Evaluate if the entity state is in alert condition
    evaluateState: (entity, config) => {
      const isOn = entity.state === 'on';
      return {
        value: entity.state,
        displayValue: isOn ? 'On' : 'Off',
        isAlert: isOn,
        numericValue: null
      };
    },

    // Get icon for light state
    getIcon: (state) => {
      return state.value === 'on' ? 'mdi:lightbulb' : 'mdi:lightbulb-outline';
    },

    // Get color for light state
    getColor: (state) => {
      return state.isAlert ? '#ffa500' : 'var(--disabled-text-color, #9e9e9e)';
    },

    // Get empty state message
    emptyMessage: 'All lights are off!',
    emptyIcon: 'mdi:lightbulb-outline',

    // Default title for badge
    defaultTitle: 'Lights On',

    // Get badge color based on alert count
    getBadgeColor: (alertCount) => {
      if (alertCount === 0) return 'var(--disabled-text-color, #9e9e9e)';
      return 'var(--label-badge-yellow, #f4b400)';
    }
  }
};

class DeviceMonitorCard extends HTMLElement {
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

    const entityType = config.entity_type || 'battery';

    // Validate entity type
    if (!ENTITY_TYPES[entityType]) {
      throw new Error(`Invalid entity_type: ${entityType}. Must be one of: ${Object.keys(ENTITY_TYPES).join(', ')}`);
    }

    // Default title based on entity type
    let defaultTitle = 'Device Monitor';
    if (entityType === 'battery') defaultTitle = 'Low Battery';
    else if (entityType === 'contact') defaultTitle = 'Open Doors & Windows';
    else if (entityType === 'light') defaultTitle = 'Lights On';

    this._config = {
      entity_type: entityType,
      filter: config.filter || 'alert',
      battery_threshold: config.battery_threshold || 20,
      title: config.title || defaultTitle,
      debug: config.debug || false,
      collapse: config.collapse,
      group_by: config.group_by || null,
      sort_by: config.sort_by || 'state',
      show_toggle: config.show_toggle || false,
      name_source: config.name_source || 'device',
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
   * Get all devices for the configured entity type
   */
  _getDevices() {
    if (!this._hass) {
      return { alertDevices: [], normalDevices: [], totalDevices: 0 };
    }

    const entityType = this._config.entity_type;
    const strategy = ENTITY_TYPES[entityType];
    const entities = this._hass.states;
    const devices = {};
    const batteryLowBinarySensors = new Set();

    // Special handling for battery: find binary_sensor.*_battery_low entities
    if (entityType === 'battery') {
      Object.keys(entities).forEach(entityId => {
        if (entityId.includes('_battery_low') && entityId.startsWith('binary_sensor.')) {
          batteryLowBinarySensors.add(entityId.replace('binary_sensor.', 'sensor.').replace('_battery_low', '_battery'));
        }
      });
    }

    // Process all entities
    Object.keys(entities).forEach(entityId => {
      const entity = entities[entityId];
      const attributes = entity.attributes || {};

      // Check if this entity matches our type
      if (!strategy.detect(entityId, attributes)) {
        return;
      }

      // Skip if entity is marked as invisible in Home Assistant UI
      if (this._isEntityHidden(entityId)) {
        return;
      }

      // Debug logging
      if (this._config.debug) {
        console.log(`[Device Monitor] Found ${entityType} entity:`, {
          entityId,
          device_class: attributes.device_class,
          state: entity.state
        });
      }

      // Skip if there's a corresponding battery_low binary sensor (battery only)
      if (entityType === 'battery' && batteryLowBinarySensors.has(entityId)) {
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

      // Get entity friendly name
      const entityName = attributes.friendly_name || entityId;

      // Get area information for grouping
      const areaId = this._getAreaId(deviceId);
      const areaName = areaId ? this._getAreaName(areaId) : null;

      // Evaluate state using strategy
      const stateInfo = strategy.evaluateState({ ...entity, entity_id: entityId }, this._config);

      // Store or update device info
      // For batteries, prefer numeric levels; for others, just use first match
      const existingDevice = devices[deviceId];
      const shouldUpdate = !existingDevice ||
        (entityType === 'battery' && stateInfo.numericValue !== null && existingDevice.stateInfo.numericValue === null);

      if (shouldUpdate) {
        devices[deviceId] = {
          deviceId,
          deviceName,
          entityName,
          entityId,
          stateInfo,
          lastChanged: entity.last_changed,
          attributes,
          areaId,
          areaName
        };

        if (this._config.debug) {
          console.log(`[Device Monitor] ${existingDevice ? 'Updated' : 'Added'} device:`, {
            deviceName,
            entityId,
            stateInfo
          });
        }
      }
    });

    // Get all devices and separate by alert status
    let allDevices = Object.values(devices);
    const alertDevices = allDevices.filter(d => d.stateInfo.isAlert);
    const normalDevices = allDevices.filter(d => !d.stateInfo.isAlert);

    // Apply grouping if configured
    const groupedAlertDevices = this._groupDevices(alertDevices);
    const groupedNormalDevices = this._groupDevices(normalDevices);

    // Apply sorting
    const sortedAlertDevices = this._sortDevices(groupedAlertDevices);
    const sortedNormalDevices = this._sortDevices(groupedNormalDevices);

    // Summary debug logging
    if (this._config.debug) {
      console.log(`[Device Monitor] Summary for ${entityType}:`, {
        total: allDevices.length,
        alert: alertDevices.length,
        normal: normalDevices.length
      });
    }

    return {
      alertDevices: sortedAlertDevices,
      normalDevices: sortedNormalDevices,
      totalDevices: allDevices.length
    };
  }

  /**
   * Group devices by configured grouping option
   */
  _groupDevices(devices) {
    const groupBy = this._config.group_by;

    if (!groupBy || groupBy === 'none') {
      return devices;
    }

    // Group devices by area or floor
    const grouped = {};
    devices.forEach(device => {
      let groupKey = 'Unknown';

      if (groupBy === 'area') {
        groupKey = device.areaName || 'No Area';
      } else if (groupBy === 'floor') {
        // Get floor from area
        const floorId = device.areaId ? this._getFloorId(device.areaId) : null;
        groupKey = floorId ? this._getFloorName(floorId) : 'No Floor';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(device);
    });

    // Flatten grouped devices back into array with group headers
    const result = [];
    Object.keys(grouped).sort().forEach(groupName => {
      result.push({ isGroupHeader: true, groupName });
      result.push(...grouped[groupName]);
    });

    return result;
  }

  /**
   * Sort devices by configured sort option
   */
  _sortDevices(devices) {
    const sortBy = this._config.sort_by || 'state';
    const useEntityName = this._config.name_source === 'entity';

    // Check if we have grouped devices (with headers)
    const hasGroupHeaders = devices.some(d => d.isGroupHeader);

    if (!hasGroupHeaders) {
      // Simple case: no grouping, just sort all devices
      return this._applySorting(devices, sortBy, useEntityName);
    }

    // Complex case: sort devices within each group while keeping headers in place
    const result = [];
    let currentGroup = [];

    devices.forEach((item, index) => {
      if (item.isGroupHeader) {
        // Sort and add previous group if it exists
        if (currentGroup.length > 0) {
          result.push(...this._applySorting(currentGroup, sortBy, useEntityName));
          currentGroup = [];
        }
        // Add the header
        result.push(item);
      } else {
        // Collect devices in current group
        currentGroup.push(item);
      }
    });

    // Sort and add the last group
    if (currentGroup.length > 0) {
      result.push(...this._applySorting(currentGroup, sortBy, useEntityName));
    }

    return result;
  }

  /**
   * Apply sorting to a list of devices
   */
  _applySorting(devices, sortBy, useEntityName) {
    const sorted = [...devices];

    if (sortBy === 'name') {
      sorted.sort((a, b) => {
        const aName = useEntityName ? a.entityName : a.deviceName;
        const bName = useEntityName ? b.entityName : b.deviceName;
        return aName.localeCompare(bName);
      });
    } else if (sortBy === 'last_changed') {
      sorted.sort((a, b) => new Date(b.lastChanged) - new Date(a.lastChanged));
    } else { // 'state' is default
      // For batteries, sort by level (lowest first)
      // For others, sort by name
      sorted.sort((a, b) => {
        const aNum = a.stateInfo.numericValue;
        const bNum = b.stateInfo.numericValue;

        if (aNum !== null && bNum !== null) {
          return aNum - bNum; // Lowest first
        }
        const aName = useEntityName ? a.entityName : a.deviceName;
        const bName = useEntityName ? b.entityName : b.deviceName;
        return aName.localeCompare(bName);
      });
    }

    return sorted;
  }

  /**
   * Get area ID for a device
   */
  _getAreaId(deviceId) {
    if (!this._hass || !this._hass.devices) {
      return null;
    }

    const device = this._hass.devices[deviceId];
    return device?.area_id || null;
  }

  /**
   * Get area name from area registry
   */
  _getAreaName(areaId) {
    if (!this._hass || !this._hass.areas) {
      return null;
    }

    const area = this._hass.areas[areaId];
    return area?.name || null;
  }

  /**
   * Get floor ID for an area
   */
  _getFloorId(areaId) {
    if (!this._hass || !this._hass.areas) {
      return null;
    }

    const area = this._hass.areas[areaId];
    return area?.floor_id || null;
  }

  /**
   * Get floor name from floor registry
   */
  _getFloorName(floorId) {
    if (!this._hass || !this._hass.floors) {
      return null;
    }

    const floor = this._hass.floors[floorId];
    return floor?.name || null;
  }

  /**
   * Check if an entity is hidden (marked as invisible in Home Assistant UI)
   */
  _isEntityHidden(entityId) {
    if (!this._hass || !this._hass.entities) {
      return false;
    }

    const entityRegistry = this._hass.entities[entityId];
    // Entity is hidden if hidden property is true (when marked invisible via UI)
    return entityRegistry?.hidden === true;
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
   * Toggle light state
   */
  _toggleLight(entityId, currentState) {
    if (!this._hass) return;

    const service = currentState === 'on' ? 'turn_off' : 'turn_on';
    this._hass.callService('light', service, { entity_id: entityId });

    if (this._config.debug) {
      console.log(`[Device Monitor] Toggling light ${entityId} to ${service === 'turn_on' ? 'on' : 'off'}`);
    }
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
    const strategy = ENTITY_TYPES[this._config.entity_type];
    const stateInfo = { ...device.stateInfo, attributes: device.attributes };
    const isLight = this._config.entity_type === 'light';
    const showToggle = this._config.show_toggle && isLight;
    const isOn = device.stateInfo.value === 'on';

    // Use custom icon if set, otherwise use strategy icon
    const customIcon = device.attributes?.icon;
    const icon = customIcon || strategy.getIcon(stateInfo);

    // Choose name based on config
    const displayName = this._config.name_source === 'entity' ? device.entityName : device.deviceName;

    return `
      <div class="device-item" data-device-id="${device.deviceId}" data-entity-id="${device.entityId}">
        <div class="device-icon">
          <ha-icon
            icon="${icon}"
            style="color: ${strategy.getColor(stateInfo)};"
          ></ha-icon>
        </div>
        <div class="device-info">
          <div class="device-name">${displayName}</div>
          <div class="device-secondary">
            Last changed: ${this._formatLastChanged(device.lastChanged)}
          </div>
        </div>
        ${showToggle ? `
          <div class="toggle-container">
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" ${isOn ? 'checked' : ''} data-entity-id="${device.entityId}">
              <span class="toggle-slider"></span>
            </label>
          </div>
        ` : `
          <div class="state-value">
            ${device.stateInfo.displayValue}
          </div>
        `}
      </div>
    `;
  }

  /**
   * Render a group header
   */
  _renderGroupHeader(groupName) {
    return `
      <div class="group-header">${groupName}</div>
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

    const { alertDevices, normalDevices, totalDevices } = this._getDevices();
    const strategy = ENTITY_TYPES[this._config.entity_type];
    const showAll = this._config.filter === 'all';
    const collapseLimit = this._config.collapse;

    // Determine which devices to show
    let devicesToShow = showAll
      ? [...alertDevices, ...normalDevices]
      : alertDevices;

    // Apply collapse logic
    const shouldCollapse = collapseLimit && devicesToShow.length > collapseLimit;
    const displayDevices = shouldCollapse && !this._expanded
      ? devicesToShow.slice(0, collapseLimit)
      : devicesToShow;

    const hiddenCount = shouldCollapse ? devicesToShow.length - collapseLimit : 0;

    // Count only actual devices, not group headers
    const alertCount = alertDevices.filter(d => !d.isGroupHeader).length;
    const title = `${this._config.title} (${alertCount}/${totalDevices})`;

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

        .group-header {
          font-weight: 600;
          font-size: 0.9em;
          color: var(--secondary-text-color);
          margin-top: 12px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .group-header:first-child {
          margin-top: 0;
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

        .state-value {
          font-weight: 500;
          font-size: 1.1em;
          margin-left: 12px;
          flex-shrink: 0;
          color: var(--primary-text-color);
        }

        .toggle-container {
          margin-left: 12px;
          flex-shrink: 0;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--divider-color, #ccc);
          transition: .3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }

        .toggle-input:checked + .toggle-slider {
          background-color: var(--primary-color, #03a9f4);
        }

        .toggle-input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .toggle-switch:hover .toggle-slider {
          opacity: 0.8;
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

          .state-value {
            font-size: 1em;
          }
        }
      </style>

      <ha-card>
        <div class="card-header">${title}</div>
        <div class="card-content">
          ${alertDevices.length === 0 && !showAll ? `
            <div class="empty-state">
              <ha-icon icon="${strategy.emptyIcon}"></ha-icon>
              <div class="empty-state-text">${strategy.emptyMessage}</div>
            </div>
          ` : `
            <div class="device-list">
              ${displayDevices.map((device, index) => {
      // Handle group headers
      if (device.isGroupHeader) {
        return this._renderGroupHeader(device.groupName);
      }

      // Add divider between alert and normal devices (only if not grouped)
      const needsDivider = showAll &&
        !this._config.group_by &&
        index === alertDevices.length &&
        alertDevices.length > 0 &&
        normalDevices.length > 0;

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
      item.addEventListener('click', (e) => {
        // Don't navigate if clicking on toggle
        if (e.target.closest('.toggle-switch')) {
          return;
        }
        const deviceId = item.getAttribute('data-device-id');
        this._openDevice(deviceId);
      });
    });

    // Add change handlers for toggle switches
    this.shadowRoot.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        e.stopPropagation();
        const entityId = toggle.getAttribute('data-entity-id');
        const currentState = toggle.checked ? 'off' : 'on'; // Inverted because checkbox already changed
        this._toggleLight(entityId, currentState);
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
      entity_type: 'battery',
      filter: 'alert',
      battery_threshold: 20,
      title: 'Low Battery',
      debug: false,
      collapse: undefined,
      group_by: null,
      sort_by: 'state',
      show_toggle: false,
      name_source: 'device'
    };
  }

  /**
   * Get configuration description for the card editor
   */
  static getConfigElement() {
    return document.createElement('device-monitor-card-editor');
  }
}

/**
 * Card Editor
 */
class DeviceMonitorCardEditor extends HTMLElement {
  constructor() {
    super();
    this._debounceTimeout = null;
  }

  setConfig(config) {
    this._config = { ...config };

    // Only render if not already rendered
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
  }

  configChanged(newConfig, immediate = false) {
    // Update internal config
    this._config = newConfig;

    // Clear existing timeout
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }

    // Dispatch event immediately or after delay
    const dispatchEvent = () => {
      const event = new Event('config-changed', {
        bubbles: true,
        composed: true,
      });
      event.detail = { config: newConfig };
      this.dispatchEvent(event);
    };

    if (immediate) {
      dispatchEvent();
    } else {
      // Debounce text input changes
      this._debounceTimeout = setTimeout(dispatchEvent, 500);
    }
  }

  render() {
    if (!this._config) {
      return;
    }

    const entityType = this._config.entity_type || 'battery';
    const showBatteryThreshold = entityType === 'battery';
    const showToggleOption = entityType === 'light';

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
        .option input[type="number"],
        .option select {
          width: 150px;
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

        .option.hidden {
          display: none;
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
            value="${this._config.title || ''}"
            placeholder="Auto"
          />
        </div>

        <div class="option">
          <div class="label-container">
            <label>Entity Type</label>
            <div class="description">Type of entities to monitor</div>
          </div>
          <select id="entity_type">
            <option value="battery" ${entityType === 'battery' ? 'selected' : ''}>Battery</option>
            <option value="contact" ${entityType === 'contact' ? 'selected' : ''}>Contact Sensors</option>
            <option value="light" ${entityType === 'light' ? 'selected' : ''}>Lights</option>
          </select>
        </div>

        <div class="option">
          <div class="label-container">
            <label>Filter</label>
            <div class="description">Which devices to show</div>
          </div>
          <select id="filter">
            <option value="alert" ${this._config.filter === 'alert' || !this._config.filter ? 'selected' : ''}>Only Alerts</option>
            <option value="all" ${this._config.filter === 'all' ? 'selected' : ''}>All Devices</option>
          </select>
        </div>

        <div class="option ${showBatteryThreshold ? '' : 'hidden'}" id="battery_threshold_option">
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
            <label>Group By</label>
            <div class="description">Group devices by area or floor</div>
          </div>
          <select id="group_by">
            <option value="" ${!this._config.group_by ? 'selected' : ''}>None</option>
            <option value="area" ${this._config.group_by === 'area' ? 'selected' : ''}>Area</option>
            <option value="floor" ${this._config.group_by === 'floor' ? 'selected' : ''}>Floor</option>
          </select>
        </div>

        <div class="option">
          <div class="label-container">
            <label>Sort By</label>
            <div class="description">Sort order for devices</div>
          </div>
          <select id="sort_by">
            <option value="state" ${this._config.sort_by === 'state' || !this._config.sort_by ? 'selected' : ''}>State</option>
            <option value="name" ${this._config.sort_by === 'name' ? 'selected' : ''}>Name</option>
            <option value="last_changed" ${this._config.sort_by === 'last_changed' ? 'selected' : ''}>Last Changed</option>
          </select>
        </div>

        <div class="option">
          <div class="label-container">
            <label>Name Source</label>
            <div class="description">Use device name or entity friendly name</div>
          </div>
          <select id="name_source">
            <option value="device" ${this._config.name_source === 'device' || !this._config.name_source ? 'selected' : ''}>Device Name</option>
            <option value="entity" ${this._config.name_source === 'entity' ? 'selected' : ''}>Entity Name</option>
          </select>
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

        <div class="option ${showToggleOption ? '' : 'hidden'}" id="show_toggle_option">
          <div class="label-container">
            <label>Show Toggle</label>
            <div class="description">Show toggle switch to turn lights on/off</div>
          </div>
          <input
            id="show_toggle"
            type="checkbox"
            ${this._config.show_toggle ? 'checked' : ''}
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

    // Helper function to handle config updates
    const updateConfig = (configUpdater, debounce = false) => {
      return (ev) => {
        const newConfig = { ...this._config };
        configUpdater(newConfig, ev.target);
        this.configChanged(newConfig, !debounce); // invert debounce flag for immediate parameter

        // Re-render if entity type changed (to show/hide battery threshold)
        if (ev.target.id === 'entity_type') {
          this._rendered = false;
          this.setConfig(newConfig);
        }
      };
    };

    // Add event listeners using oninput/onchange to avoid multiple listeners
    const titleInput = this.querySelector('#title');
    const entityTypeInput = this.querySelector('#entity_type');
    const filterInput = this.querySelector('#filter');
    const thresholdInput = this.querySelector('#battery_threshold');
    const groupByInput = this.querySelector('#group_by');
    const sortByInput = this.querySelector('#sort_by');
    const nameSourceInput = this.querySelector('#name_source');
    const collapseInput = this.querySelector('#collapse');
    const showToggleInput = this.querySelector('#show_toggle');
    const debugInput = this.querySelector('#debug');

    // Text and number inputs - debounced to prevent focus loss
    titleInput.oninput = updateConfig((config, target) => {
      config.title = target.value;
    }, true);

    if (thresholdInput) {
      thresholdInput.oninput = updateConfig((config, target) => {
        config.battery_threshold = Number(target.value);
      }, true);
    }

    collapseInput.oninput = updateConfig((config, target) => {
      if (target.value === '') {
        delete config.collapse;
      } else {
        config.collapse = Number(target.value);
      }
    }, true);

    // Selects and checkboxes - immediate updates
    entityTypeInput.onchange = updateConfig((config, target) => {
      config.entity_type = target.value;
    }, false);

    filterInput.onchange = updateConfig((config, target) => {
      config.filter = target.value;
    }, false);

    groupByInput.onchange = updateConfig((config, target) => {
      config.group_by = target.value || null;
    }, false);

    sortByInput.onchange = updateConfig((config, target) => {
      config.sort_by = target.value;
    }, false);

    nameSourceInput.onchange = updateConfig((config, target) => {
      config.name_source = target.value;
    }, false);

    if (showToggleInput) {
      showToggleInput.onchange = updateConfig((config, target) => {
        config.show_toggle = target.checked;
      }, false);
    }

    debugInput.onchange = updateConfig((config, target) => {
      config.debug = target.checked;
    }, false);
  }
}

/**
 * Device Monitor Badge
 * A compact badge that displays alert count in format: "TITLE (5/30)"
 */
class DeviceMonitorBadge extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  /**
   * Called when the badge configuration is set
   */
  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    const entityType = config.entity_type || 'battery';

    // Validate entity type
    if (!ENTITY_TYPES[entityType]) {
      throw new Error(`Invalid entity_type: ${entityType}. Must be one of: ${Object.keys(ENTITY_TYPES).join(', ')}`);
    }

    const strategy = ENTITY_TYPES[entityType];
    const tapAction = this._normalizeAction(config.tap_action);
    const holdAction = this._normalizeAction(config.hold_action);
    const doubleTapAction = this._normalizeAction(config.double_tap_action);

    this._config = {
      entity_type: entityType,
      battery_threshold: config.battery_threshold || 20,
      title: config.title || strategy.defaultTitle,
      debug: config.debug || false,
      ...config,
      tap_action: tapAction,
      hold_action: holdAction,
      double_tap_action: doubleTapAction
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
   * Get all devices for the configured entity type
   */
  _getDevices() {
    if (!this._hass) {
      return { alertDevices: [], totalDevices: 0 };
    }

    const entityType = this._config.entity_type;
    const strategy = ENTITY_TYPES[entityType];
    const entities = this._hass.states;
    const devices = {};
    const batteryLowBinarySensors = new Set();

    // Special handling for battery: find binary_sensor.*_battery_low entities
    if (entityType === 'battery') {
      Object.keys(entities).forEach(entityId => {
        if (entityId.includes('_battery_low') && entityId.startsWith('binary_sensor.')) {
          batteryLowBinarySensors.add(entityId.replace('binary_sensor.', 'sensor.').replace('_battery_low', '_battery'));
        }
      });
    }

    // Process all entities
    Object.keys(entities).forEach(entityId => {
      const entity = entities[entityId];
      const attributes = entity.attributes || {};

      // Check if this entity matches our type
      if (!strategy.detect(entityId, attributes)) {
        return;
      }

      // Skip if entity is marked as invisible in Home Assistant UI
      if (this._isEntityHidden(entityId)) {
        return;
      }

      // Debug logging
      if (this._config.debug) {
        console.log(`[Device Monitor Badge] Found ${entityType} entity:`, {
          entityId,
          device_class: attributes.device_class,
          state: entity.state
        });
      }

      // Skip if there's a corresponding battery_low binary sensor (battery only)
      if (entityType === 'battery' && batteryLowBinarySensors.has(entityId)) {
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

      // Evaluate state using strategy
      const stateInfo = strategy.evaluateState({ ...entity, entity_id: entityId }, this._config);

      // Store or update device info
      // For batteries, prefer numeric levels; for others, just use first match
      const existingDevice = devices[deviceId];
      const shouldUpdate = !existingDevice ||
        (entityType === 'battery' && stateInfo.numericValue !== null && existingDevice.stateInfo.numericValue === null);

      if (shouldUpdate) {
        devices[deviceId] = {
          deviceId,
          deviceName,
          entityId,
          stateInfo
        };

        if (this._config.debug) {
          console.log(`[Device Monitor Badge] ${existingDevice ? 'Updated' : 'Added'} device:`, {
            deviceName,
            entityId,
            stateInfo
          });
        }
      }
    });

    // Get all devices and separate by alert status
    let allDevices = Object.values(devices);
    const alertDevices = allDevices.filter(d => d.stateInfo.isAlert);

    // Summary debug logging
    if (this._config.debug) {
      console.log(`[Device Monitor Badge] Summary for ${entityType}:`, {
        total: allDevices.length,
        alert: alertDevices.length
      });
    }

    return {
      alertDevices,
      totalDevices: allDevices.length
    };
  }

  /**
   * Check if an entity is hidden (marked as invisible in Home Assistant UI)
   */
  _isEntityHidden(entityId) {
    if (!this._hass || !this._hass.entities) {
      return false;
    }

    const entityRegistry = this._hass.entities[entityId];
    // Entity is hidden if hidden property is true (when marked invisible via UI)
    return entityRegistry?.hidden === true;
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
   * Normalize action config with safe defaults
   */
  _normalizeAction(actionConfig) {
    const normalized = actionConfig && typeof actionConfig === 'object'
      ? { ...actionConfig }
      : { action: 'none' };

    if (!normalized.action) {
      normalized.action = 'none';
    }

    return normalized;
  }

  /**
   * Handle action (tap/hold/double)
   */
  _handleAction(actionConfig) {
    const normalizedAction = this._normalizeAction(actionConfig);
    const action = normalizedAction.action;

    if (action === 'none') {
      return;
    }

    if (this._config.debug) {
      console.log('[Device Monitor Badge] Action:', action, normalizedAction);
    }

    // Basic haptic feedback support (best effort)
    if (normalizedAction.haptic && navigator.vibrate) {
      navigator.vibrate(10);
    }

    switch (action) {
      case 'navigate':
        if (normalizedAction.navigation_path) {
          history.pushState(null, '', normalizedAction.navigation_path);
          window.dispatchEvent(new CustomEvent('location-changed'));
        }
        break;

      case 'url':
        if (normalizedAction.url_path) {
          window.open(normalizedAction.url_path, normalizedAction.url_path.startsWith('/') ? '_self' : '_blank');
        }
        break;

      case 'call-service':
        if (this._hass && normalizedAction.service) {
          const [domain, serviceName] = normalizedAction.service.split('.');
          if (domain && serviceName) {
            const serviceData = normalizedAction.service_data || {};
            const target = normalizedAction.target || (normalizedAction.entity_id ? { entity_id: normalizedAction.entity_id } : undefined);
            this._hass.callService(domain, serviceName, serviceData, target);
          } else if (this._config.debug) {
            console.warn('[Device Monitor Badge] Invalid call-service action, expected domain.service:', normalizedAction.service);
          }
        }
        break;

      case 'toggle':
        if (this._hass) {
          const target = normalizedAction.target || (normalizedAction.entity_id ? { entity_id: normalizedAction.entity_id } : undefined);
          if (target) {
            this._hass.callService('homeassistant', 'toggle', normalizedAction.service_data || {}, target);
          } else if (this._config.debug) {
            console.warn('[Device Monitor Badge] Toggle action missing target/entity_id');
          }
        }
        break;

      case 'more-info':
        // Prefer target.entity_id when provided to match HA semantics
        let entityId = normalizedAction.entity_id || null;
        if (!entityId && normalizedAction.target && normalizedAction.target.entity_id) {
          const targetEntity = normalizedAction.target.entity_id;
          entityId = Array.isArray(targetEntity) ? targetEntity[0] : targetEntity;
        }

        this.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: entityId }
        }));
        break;

      default:
        if (this._config.debug) {
          console.warn('[Device Monitor Badge] Unknown tap action:', action);
        }
    }
  }

  /**
   * Render the badge
   */
  render() {
    if (!this._hass) {
      this.shadowRoot.innerHTML = `
        <ha-badge>
          <ha-icon slot="icon" icon="mdi:battery"></ha-icon>
          ...
        </ha-badge>
      `;
      return;
    }

    const { alertDevices, totalDevices } = this._getDevices();
    const strategy = ENTITY_TYPES[this._config.entity_type];
    const alertCount = alertDevices.length;
    const badgeText = `${this._config.title} (${alertCount}/${totalDevices})`;
    const icon = strategy.getIcon({});
    const color = strategy.getBadgeColor(alertCount);
    const tapAction = this._normalizeAction(this._config.tap_action);
    const holdAction = this._normalizeAction(this._config.hold_action);
    const doubleTapAction = this._normalizeAction(this._config.double_tap_action);
    const hasTapAction = tapAction.action && tapAction.action !== 'none';
    const hasHoldAction = holdAction.action && holdAction.action !== 'none';
    const hasDoubleTapAction = doubleTapAction.action && doubleTapAction.action !== 'none';
    const hasAnyAction = hasTapAction || hasHoldAction || hasDoubleTapAction;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        ha-badge {
          --badge-color: ${color};
        }

        ${hasAnyAction ? `
        ha-badge {
          cursor: pointer;
        }
        ` : ''}

        ${hasAnyAction ? `
        ha-badge:focus {
          outline: 2px solid var(--primary-color);
        }
        ` : ''}
      </style>

      <ha-badge id="badge" ${hasAnyAction ? `role="button" tabindex="0"` : ''}>
        <ha-icon slot="icon" icon="${icon}"></ha-icon>
        ${badgeText}
      </ha-badge>
    `;

    // Add handlers only if an action is configured
    const badgeElement = this.shadowRoot.querySelector('#badge');
    if (badgeElement && hasAnyAction) {
      // Set aria-label safely using setAttribute to prevent XSS
      badgeElement.setAttribute('aria-label', badgeText);
      badgeElement.setAttribute('title', badgeText);

      let holdTimeout = null;
      let holdTriggered = false;

      const clearHold = () => {
        if (holdTimeout) {
          clearTimeout(holdTimeout);
          holdTimeout = null;
        }
      };

      if (hasHoldAction) {
        badgeElement.addEventListener('pointerdown', () => {
          holdTriggered = false;
          holdTimeout = setTimeout(() => {
            holdTriggered = true;
            this._handleAction(holdAction);
          }, 500);
        });

        badgeElement.addEventListener('pointerup', () => {
          clearHold();
        });

        badgeElement.addEventListener('pointerleave', () => {
          clearHold();
        });

        badgeElement.addEventListener('pointercancel', () => {
          clearHold();
        });
      }

      if (hasTapAction) {
        badgeElement.addEventListener('click', (ev) => {
          ev.preventDefault();
          if (holdTriggered) {
            holdTriggered = false;
            return;
          }
          this._handleAction(tapAction);
        });
      }

      if (hasDoubleTapAction) {
        badgeElement.addEventListener('dblclick', (ev) => {
          ev.preventDefault();
          this._handleAction(doubleTapAction);
        });
      }

      badgeElement.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          this._handleAction(tapAction);
        }
      });
    }
  }

  /**
   * Get editor stub (required for badge editor)
   */
  static getStubConfig() {
    return {
      entity_type: 'battery',
      battery_threshold: 20,
      title: 'Low Battery',
      debug: false,
      tap_action: { action: 'none' },
      hold_action: { action: 'none' },
      double_tap_action: { action: 'none' }
    };
  }

  /**
   * Get configuration description for the badge editor
   */
  static getConfigElement() {
    return document.createElement('device-monitor-badge-editor');
  }
}

/**
 * Badge Editor
 */
class DeviceMonitorBadgeEditor extends HTMLElement {
  constructor() {
    super();
    this._debounceTimeout = null;
    this._rendered = false;
  }

  setConfig(config) {
    const tapAction = config && config.tap_action
      ? { ...config.tap_action }
      : { action: 'none' };

    this._config = { ...config, tap_action: tapAction };
    
    // Ensure tap_action is initialized
    if (!this._config.tap_action) {
      this._config.tap_action = { action: 'none' };
    }

    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
  }

  configChanged(newConfig, immediate = false) {
    // Update internal config
    this._config = newConfig;

    // Clear existing timeout
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }

    // Dispatch event immediately or after delay
    const dispatchEvent = () => {
      const event = new Event('config-changed', {
        bubbles: true,
        composed: true,
      });
      event.detail = { config: newConfig };
      this.dispatchEvent(event);
    };

    if (immediate) {
      dispatchEvent();
    } else {
      // Debounce text input changes
      this._debounceTimeout = setTimeout(dispatchEvent, 500);
    }
  }

  render() {
    if (!this._config) {
      return;
    }

    try {
      // Ensure tap_action is initialized before rendering
      if (!this._config.tap_action) {
        this._config.tap_action = { action: 'none' };
      }
      if (!this._config.tap_action.action) {
        this._config.tap_action.action = 'none';
      }

      const entityType = this._config.entity_type || 'battery';
      const showBatteryThreshold = entityType === 'battery';
      const tapAction = this._config.tap_action || { action: 'none' };
      const tapActionType = tapAction.action || 'none';

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
        .option input[type="number"],
        .option select {
          width: 150px;
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

        .option.hidden {
          display: none;
        }
      </style>

      <div class="badge-config">
        <div class="option">
          <div class="label-container">
            <label>Title</label>
            <div class="description">Badge title text</div>
          </div>
          <input
            id="title"
            type="text"
            value="${this._config.title || ''}"
            placeholder="Auto"
          />
        </div>

        <div class="option">
          <div class="label-container">
            <label>Entity Type</label>
            <div class="description">Type of entities to monitor</div>
          </div>
          <select id="entity_type">
            <option value="battery" ${entityType === 'battery' ? 'selected' : ''}>Battery</option>
            <option value="contact" ${entityType === 'contact' ? 'selected' : ''}>Contact Sensors</option>
            <option value="light" ${entityType === 'light' ? 'selected' : ''}>Lights</option>
          </select>
        </div>

        <div class="option ${showBatteryThreshold ? '' : 'hidden'}" id="battery_threshold_option">
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
            <label>Tap Action</label>
            <div class="description">Action when badge is tapped</div>
          </div>
          <select id="tap_action_type">
            <option value="none" ${tapActionType === 'none' ? 'selected' : ''}>None</option>
            <option value="navigate" ${tapActionType === 'navigate' ? 'selected' : ''}>Navigate</option>
            <option value="url" ${tapActionType === 'url' ? 'selected' : ''}>URL</option>
            <option value="call-service" ${tapActionType === 'call-service' ? 'selected' : ''}>Call Service</option>
            <option value="toggle" ${tapActionType === 'toggle' ? 'selected' : ''}>Toggle</option>
            <option value="more-info" ${tapActionType === 'more-info' ? 'selected' : ''}>More Info</option>
          </select>
        </div>

        <div class="option ${tapActionType !== 'navigate' ? 'hidden' : ''}" id="tap_action_navigate_option">
          <div class="label-container">
            <label>Navigation Path</label>
            <div class="description">Path to navigate to (e.g., /lovelace/0)</div>
          </div>
          <input
            id="tap_action_navigation_path"
            type="text"
            value="${(tapAction.navigation_path) || ''}"
            placeholder="/lovelace/0"
          />
        </div>

        <div class="option ${tapActionType !== 'url' ? 'hidden' : ''}" id="tap_action_url_option">
          <div class="label-container">
            <label>URL Path</label>
            <div class="description">URL to open (e.g., https://example.com or /local/page.html)</div>
          </div>
          <input
            id="tap_action_url_path"
            type="text"
            value="${(tapAction.url_path) || ''}"
            placeholder="https://example.com"
          />
        </div>

        <div class="option ${tapActionType !== 'call-service' ? 'hidden' : ''}" id="tap_action_service_option">
          <div class="label-container">
            <label>Service</label>
            <div class="description">Service to call (e.g., light.turn_on)</div>
          </div>
          <input
            id="tap_action_service"
            type="text"
            value="${(tapAction.service) || ''}"
            placeholder="light.turn_on"
          />
        </div>

        <div class="option ${(tapActionType !== 'toggle' && tapActionType !== 'more-info') ? 'hidden' : ''}" id="tap_action_entity_option">
          <div class="label-container">
            <label>Entity ID</label>
            <div class="description">Entity ID for toggle or more-info action</div>
          </div>
          <input
            id="tap_action_entity_id"
            type="text"
            value="${(tapAction.entity_id) || ''}"
            placeholder="light.living_room"
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

    // Helper function to handle config updates
    const updateConfig = (configUpdater, debounce = false) => {
      return (ev) => {
        const newConfig = {
          ...this._config,
          tap_action: this._config.tap_action ? { ...this._config.tap_action } : { action: 'none' }
        };
        configUpdater(newConfig, ev.target);
        this.configChanged(newConfig, !debounce); // invert debounce flag for immediate parameter

        // Re-render if entity type changed (to show/hide battery threshold)
        if (ev.target.id === 'entity_type') {
          this._rendered = false;
          this.setConfig(newConfig);
        }
      };
    };

    // Add event listeners using oninput/onchange to avoid multiple listeners
    const titleInput = this.querySelector('#title');
    const entityTypeInput = this.querySelector('#entity_type');
    const thresholdInput = this.querySelector('#battery_threshold');
    const tapActionTypeInput = this.querySelector('#tap_action_type');
    const tapActionNavigateInput = this.querySelector('#tap_action_navigation_path');
    const tapActionUrlInput = this.querySelector('#tap_action_url_path');
    const tapActionServiceInput = this.querySelector('#tap_action_service');
    const tapActionEntityInput = this.querySelector('#tap_action_entity_id');
    const debugInput = this.querySelector('#debug');

    // Helper to update tap action visibility
    const updateTapActionVisibility = (actionType) => {
      const navigateOption = this.querySelector('#tap_action_navigate_option');
      const urlOption = this.querySelector('#tap_action_url_option');
      const serviceOption = this.querySelector('#tap_action_service_option');
      const entityOption = this.querySelector('#tap_action_entity_option');

      if (navigateOption) navigateOption.classList.toggle('hidden', actionType !== 'navigate');
      if (urlOption) urlOption.classList.toggle('hidden', actionType !== 'url');
      if (serviceOption) serviceOption.classList.toggle('hidden', actionType !== 'call-service');
      if (entityOption) entityOption.classList.toggle('hidden', actionType !== 'toggle' && actionType !== 'more-info');
    };

    // Text and number inputs - debounced to prevent focus loss
    if (titleInput) {
      titleInput.oninput = updateConfig((config, target) => {
        config.title = target.value;
      }, true);
    }

    if (thresholdInput) {
      thresholdInput.oninput = updateConfig((config, target) => {
        config.battery_threshold = Number(target.value);
      }, true);
    }

    if (tapActionNavigateInput) {
      tapActionNavigateInput.oninput = updateConfig((config, target) => {
        if (!config.tap_action) config.tap_action = {};
        config.tap_action.navigation_path = target.value;
      }, true);
    }

    if (tapActionUrlInput) {
      tapActionUrlInput.oninput = updateConfig((config, target) => {
        if (!config.tap_action) config.tap_action = {};
        config.tap_action.url_path = target.value;
      }, true);
    }

    if (tapActionServiceInput) {
      tapActionServiceInput.oninput = updateConfig((config, target) => {
        if (!config.tap_action) config.tap_action = {};
        config.tap_action.service = target.value;
      }, true);
    }

    if (tapActionEntityInput) {
      tapActionEntityInput.oninput = updateConfig((config, target) => {
        if (!config.tap_action) config.tap_action = {};
        config.tap_action.entity_id = target.value;
      }, true);
    }

    // Selects and checkboxes - immediate updates
    if (entityTypeInput) {
      entityTypeInput.onchange = updateConfig((config, target) => {
        config.entity_type = target.value;
        // Update title to match new entity type default if current title matches old default
        const strategy = ENTITY_TYPES[target.value];
        if (strategy && !config.title) {
          config.title = strategy.defaultTitle;
        }
      }, false);
    }

    if (tapActionTypeInput) {
      tapActionTypeInput.onchange = updateConfig((config, target) => {
        const actionType = target.value;
        if (actionType === 'none') {
          config.tap_action = { action: 'none' };
        } else {
          if (!config.tap_action) config.tap_action = {};
          config.tap_action.action = actionType;
          // Clear fields that don't apply to this action
          if (actionType !== 'navigate') delete config.tap_action.navigation_path;
          if (actionType !== 'url') delete config.tap_action.url_path;
          if (actionType !== 'call-service') delete config.tap_action.service;
          if (actionType !== 'toggle' && actionType !== 'more-info') delete config.tap_action.entity_id;
        }
        // Update visibility immediately for instant feedback
        updateTapActionVisibility(actionType);
        // Re-render will also happen to ensure everything is in sync
      }, false);
    }

    // Initialize tap action visibility on first render
    const currentAction = (this._config.tap_action && this._config.tap_action.action) || 'none';
    updateTapActionVisibility(currentAction);

    if (debugInput) {
      debugInput.onchange = updateConfig((config, target) => {
        config.debug = target.checked;
      }, false);
    }
    } catch (error) {
      console.error('[Device Monitor Badge Editor] Render error:', error);
      this.innerHTML = `
        <div style="padding: 16px; color: var(--error-color, #f44336);">
          <strong>Error loading editor:</strong><br>
          ${error.message}
        </div>
      `;
    }
  }
}

// Register the custom card and badge
customElements.define('device-monitor-card', DeviceMonitorCard);
customElements.define('device-monitor-card-editor', DeviceMonitorCardEditor);
customElements.define('device-monitor-badge', DeviceMonitorBadge);
customElements.define('device-monitor-badge-editor', DeviceMonitorBadgeEditor);

// Register card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'device-monitor-card',
  name: 'Device Monitor Card',
  description: 'Monitor batteries, contact sensors (doors/windows), and lights with alerts and grouping',
  preview: false,
  documentationURL: 'https://github.com/molant/battery-monitor-card',
});

// Register badge with Home Assistant - also in customCards as badges are a type of card
window.customCards.push({
  type: 'device-monitor-badge',
  name: 'Device Monitor Badge',
  description: 'Compact badge showing device alert counts for batteries, contact sensors, and lights',
  preview: false,
  documentationURL: 'https://github.com/molant/battery-monitor-card',
});

// Also register as a badge element for the badge picker
if (!window.customBadges) {
  window.customBadges = [];
}

// Create preview element showing 3 example badges
class DeviceMonitorBadgePreview extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        .preview {
          display: flex;
          padding: 16px;
        }
      </style>
      <div class="preview">
        <ha-badge style="--badge-color: var(--label-badge-red, #df4c1e);">
          <ha-icon slot="icon" icon="mdi:battery-alert"></ha-icon>
          Low battery (3/5)
        </ha-badge>
      </div>
    `;
  }
}

customElements.define('device-monitor-badge-preview', DeviceMonitorBadgePreview);

window.customBadges.push({
  type: 'device-monitor-badge',
  name: 'Device Monitor Badge',
  description: 'Low battery (3/5) · Doors/Windows open (4/10) · Lights on (2/8)',
  preview: true,
  getPreviewElement: () => document.createElement('device-monitor-badge-preview'),
});

console.info(
  '%c DEVICE-MONITOR-CARD %c 1.0.0 ',
  'color: white; background: #039be5; font-weight: 700;',
  'color: #039be5; background: white; font-weight: 700;'
);
console.info(
  '%c DEVICE-MONITOR-BADGE %c 1.0.0 ',
  'color: white; background: #26a69a; font-weight: 700;',
  'color: #26a69a; background: white; font-weight: 700;'
);
