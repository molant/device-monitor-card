# Battery Device Card

A custom Home Assistant Lovelace card that displays low battery devices with device names from the device registry instead of entity names.

## Features

- **Device Names**: Shows actual device names from the device registry, not entity friendly names
- **Automatic Discovery**: Automatically finds all battery entities in your Home Assistant instance
- **Smart Filtering**: Excludes duplicate sensors when binary_sensor.*_battery_low exists
- **Battery Level Icons**: Color-coded battery icons (red < 10%, orange < 20%)
- **Clickable Devices**: Click any device to open its device page in Home Assistant
- **Responsive Design**: Mobile-friendly layout that matches Home Assistant's style
- **Last Changed Info**: Shows when each battery level was last updated
- **Empty State**: Displays a friendly message when all batteries are OK

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click on "Frontend"
3. Click the "+" button
4. Search for "Battery Device Card"
5. Click "Install"
6. Clear your browser cache and hard refresh (Ctrl+F5 or Cmd+Shift+R)

### Manual Installation

1. Download `battery-device-card.js` from this repository
2. Copy it to your `config/www/` directory in Home Assistant
3. Add the following to your Lovelace resources:

   **Via UI:**
   - Go to Settings → Dashboards → Resources
   - Click "Add Resource"
   - URL: `/local/battery-device-card.js`
   - Resource type: `JavaScript Module`

   **Via YAML:**
   ```yaml
   resources:
     - url: /local/battery-device-card.js
       type: module
   ```

4. Clear your browser cache and hard refresh (Ctrl+F5 or Cmd+Shift+R)

   **Note:** A Home Assistant restart is typically not required for adding frontend resources. If the card still doesn't appear after clearing cache, try closing all browser tabs and reopening Home Assistant.

## Configuration

### Basic Configuration

```yaml
type: custom:battery-device-card
```

### Advanced Configuration

```yaml
type: custom:battery-device-card
battery_threshold: 20      # Optional, default: 20
title: "Low Battery"       # Optional, default: "Low Battery"
debug: true                # Optional, default: false - enables debug logging
collapse: 5                # Optional, default: undefined (show all)
all_devices: true          # Optional, default: false - show all battery devices
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `battery_threshold` | number | 20 | Battery percentage threshold for low battery alerts |
| `title` | string | "Low Battery" | Card title |
| `debug` | boolean | false | Enable debug logging in browser console |
| `collapse` | number | undefined | If set, collapse to show only this many devices with expand button |
| `all_devices` | boolean | false | Show all battery devices (low battery first, then divider, then normal) |

## How It Works

The card performs the following operations:

1. **Entity Discovery**: Queries all entities from `hass.states` looking for:
   - Entities with `device_class: battery`
   - Entities with "battery" in the entity ID
   - Binary sensors with "*_battery_low" in the name

2. **Smart Filtering**:
   - Excludes `sensor.*_battery` if a corresponding `binary_sensor.*_battery_low` exists
   - Filters devices based on battery threshold or battery_low state

3. **Device Resolution**:
   - Gets device_id from the entity registry
   - Looks up device name from the device registry
   - Uses `name_by_user` if set, otherwise falls back to device name

4. **Display**:
   - Sorts devices by battery level (lowest first)
   - Shows device name, battery level, and last changed time
   - Displays battery icon colored by level
   - Makes each row clickable to open device page

## Testing

A test HTML file is included in the `test/` directory that allows you to test the card before deploying to Home Assistant.

### Running Tests

1. Open `test/test.html` in a web browser
2. The page includes a mocked Home Assistant environment with sample devices
3. Use the controls to:
   - Adjust battery threshold
   - Change card title
   - Add random low battery devices
   - Reset to default devices

### Test Features

- Mock `hass` object with sample battery sensors
- Mock device registry with device names
- Interactive controls to test different scenarios
- Simulated device navigation

## Examples

### Default Configuration

```yaml
type: custom:battery-device-card
```

Shows all devices with battery < 20%

### Custom Threshold

```yaml
type: custom:battery-device-card
battery_threshold: 15
title: "Critical Batteries"
```

Shows devices with battery < 15% with a custom title

### Show All Battery Devices

```yaml
type: custom:battery-device-card
all_devices: true
title: "All Batteries"
```

Shows all battery devices - low battery devices first, then a divider, then devices with normal battery levels

### Collapsed View

```yaml
type: custom:battery-device-card
collapse: 3
```

Shows only first 3 devices, with an expand button to show the rest

### Combined Features

```yaml
type: custom:battery-device-card
battery_threshold: 25
title: "Battery Monitor"
all_devices: true
collapse: 5
```

Shows all devices, collapses to 5 with expand button, uses 25% threshold

### Dashboard Example

```yaml
views:
  - title: Home
    cards:
      - type: custom:battery-device-card
        battery_threshold: 25
        title: "Battery Status"
```

## Supported Battery Entity Types

The card supports the following battery entity patterns:

1. **Standard Battery Sensors**:
   ```
   sensor.*_battery (with device_class: battery)
   sensor.*_battery_level
   ```

2. **Binary Battery Sensors**:
   ```
   binary_sensor.*_battery_low
   ```

3. **Custom Battery Entities**:
   - Any entity with `device_class: battery`
   - Any entity with `unit_of_measurement: %` containing "battery"

## Device Name Resolution

The card resolves device names in the following order:

1. `name_by_user` (if user has renamed the device)
2. `name` (device's default name)
3. `device_id` (fallback if name not found)

## Styling

The card uses Home Assistant's CSS variables for theming:

- `--primary-text-color`: Main text color
- `--secondary-text-color`: Secondary text (timestamps)
- `--card-background-color`: Card background
- `--divider-color`: Borders
- `--success-color`: Success state icon color

The card automatically adapts to your Home Assistant theme.

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ✅ Fully supported

## Troubleshooting

### Card not showing up

1. Clear browser cache and do a hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. Verify the resource is added correctly in Settings → Dashboards → Resources
3. Check browser console for errors (F12)
4. Try closing all browser tabs and reopening Home Assistant
5. As a last resort, restart Home Assistant (usually not needed)

### No devices showing

1. Verify you have battery entities in Home Assistant
2. Check that entities have `device_class: battery`
3. Verify entities are linked to devices in the device registry
4. Lower the `battery_threshold` to include more devices

### Device names not showing

1. Verify entities are properly linked to devices
2. Check the device registry has names for your devices
3. Some entities may not be associated with a device

### Clicking devices doesn't work

This feature requires Home Assistant's navigation to be properly initialized. It works in:
- Lovelace dashboards
- Home Assistant frontend

It may not work in:
- Test HTML file (shows alert instead)
- External iframes

## Debugging

The card includes built-in debug logging to help troubleshoot issues with entity detection.

### Enabling Debug Logging

Add `debug: true` to your card configuration:

```yaml
type: custom:battery-device-card
debug: true
```

Then refresh your browser. Open the developer console (F12) and you'll see detailed logs showing:
- Every battery entity found
- Device class, state, and unit of measurement for each entity
- Which devices were added to the tracking list
- A summary of all battery devices and their status

### Understanding Debug Output

The debug logs will show entries like:

```
[Battery Card] Found potential battery entity: {
  entityId: "sensor.phone_battery",
  device_class: "battery",
  state: "45",
  unit: "%",
  isBatterySensor: true,
  isBatteryLowSensor: false
}

[Battery Card] Added device: {
  deviceName: "Samsung Galaxy S21",
  entityId: "sensor.phone_battery",
  batteryLevel: 45,
  isLow: false,
  threshold: 20
}

[Battery Card] Summary: {
  totalBatteryDevices: 5,
  lowBatteryDevices: 2,
  threshold: 20,
  devices: [...]
}
```

### Disabling Debug Logging

To disable debug output, remove `debug: true` from your card configuration or set it to `false`:

```yaml
type: custom:battery-device-card
debug: false
```

Then refresh your browser.

### Common Issues Revealed by Debug Logs

**Non-battery entities being detected**: If you see entities without `device_class: "battery"` being detected, check if they have "battery" in their entity ID. The card only tracks entities that either:
1. Have `device_class: "battery"`, OR
2. Have "battery" in the entity ID AND are sensor/binary_sensor domain

**Devices not showing up**: Check the debug logs to see if:
- The entity is being found but filtered out (e.g., has a corresponding battery_low sensor)
- The entity doesn't have a device_id
- The device doesn't have a name in the registry

## Development

### Project Structure

```
battery-device-card/
├── www/
│   └── battery-device-card.js   # Main card implementation
├── test/
│   └── test.html                # Test page with mocked hass
└── README.md                    # Documentation
```

### Building from Source

No build process required - this is a pure JavaScript implementation.

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Changelog

### v1.1.1 (2024-11-15)

- **Bug Fix**: Fixed battery icon display for `binary_sensor.*_battery_low` entities
- **Improvement**: Binary sensor "Low" state now shows red battery-alert icon (instead of yellow unknown)
- **Improvement**: Binary sensor "OK" state now shows blue full battery icon (instead of yellow unknown)

### v1.1.0 (2024-11-15)

- **Feature**: Added `collapse` option to limit displayed devices with expand/collapse button
- **Feature**: Added `all_devices` option to show all battery devices (not just low battery)
- **Enhancement**: Added divider between low and normal battery devices when using `all_devices`
- **Enhancement**: Expand button shows count of hidden devices
- **Improvement**: Refactored device rendering for better code organization

### v1.0.2 (2024-11-15)

- **Bug Fix**: Fixed device detection picking up wrong entities (e.g., `battery_state` instead of `battery` level)
- **Improvement**: Added exclusion filter for non-level battery entities (`_state`, `_charging`, `_charger`, `_power`, `_health`)
- **Improvement**: Smart entity prioritization - prefers numeric battery levels over non-numeric states
- **Improvement**: Prefers entities with `device_class: battery` when multiple battery entities exist for same device
- **Enhancement**: Debug logging now shows when entities are skipped or replaced

### v1.0.1 (2024-11-15)

- **Bug Fix**: Fixed overly broad battery detection that was catching CPU utilization and other percentage-based sensors
- **Improvement**: Made battery sensor detection more strict - now requires either `device_class: battery` or entity ID containing "battery" (for sensor/binary_sensor domains only)
- **Feature**: Added debug logging to help troubleshoot entity detection (see Debugging section)

### v1.0.0 (2024-11-15)

- Initial release
- Device name resolution from device registry
- Automatic battery entity discovery
- Smart filtering to avoid duplicates
- Color-coded battery icons
- Clickable device rows
- Mobile-responsive design
- Empty state handling
- Last changed timestamps

## Credits

Created for the Home Assistant community.

## Support

If you encounter any issues or have feature requests:

1. Check the troubleshooting section above
2. Review existing GitHub issues
3. Create a new issue with:
   - Home Assistant version
   - Browser and version
   - Error messages from browser console
   - Example configuration

## Roadmap

Potential future enhancements:

- [ ] Card editor UI for visual configuration
- [ ] Sorting options (by level, name, last changed)
- [ ] Filter by device area
- [ ] Group by battery level ranges
- [ ] Export list of low battery devices
- [ ] Notification integration
- [ ] Custom entity filtering
- [ ] Battery history graphs
