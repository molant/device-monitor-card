# Device Monitor Card - Project Context

This file contains essential context for Claude Code sessions working on this project.

## Project Overview

**Device Monitor Card** is a versatile Home Assistant Lovelace custom card that monitors multiple types of devices:
- Batteries (with low battery alerts)
- Contact sensors (doors, windows, garage doors)
- Lights (with optional toggle switches)

The card features smart grouping (by area/floor), flexible sorting, custom icons, and a visual configuration editor.

## Project History

This project started as a battery-only monitoring card and was refactored to support multiple entity types using a strategy pattern architecture. The first HACS release is v1.0.0.

## Architecture

### Core Design Pattern: Entity Type Strategy

The card uses a **strategy pattern** to handle different entity types. Each entity type has its own strategy defined in the `ENTITY_TYPES` object:

```javascript
const ENTITY_TYPES = {
  battery: { detect, evaluateState, getIcon, getColor, emptyMessage, emptyIcon },
  contact: { detect, evaluateState, getIcon, getColor, emptyMessage, emptyIcon },
  light: { detect, evaluateState, getIcon, getColor, emptyMessage, emptyIcon }
};
```

### Key Methods

- **detect(entityId, attributes)**: Determines if an entity belongs to this type
- **evaluateState(entity, config)**: Returns state info: `{value, displayValue, isAlert, numericValue}`
- **getIcon(state)**: Returns the appropriate MDI icon for the state
- **getColor(state)**: Returns the color for the icon

### Device Discovery Flow

1. Iterate through all entities in Home Assistant
2. Use strategy's `detect()` method to identify matching entities
3. Resolve device information from device registry
4. Evaluate state using strategy's `evaluateState()` method
5. Store device with metadata (name, area, floor, last_changed)

### Grouping System

Grouping creates a flat array with interspersed group headers:
```javascript
[
  { isGroupHeader: true, groupName: "Kitchen" },
  { deviceName: "...", ... },
  { deviceName: "...", ... },
  { isGroupHeader: true, groupName: "Living Room" },
  { deviceName: "...", ... }
]
```

This allows sorting within groups while preserving group structure.

### Sorting with Grouping

When sorting grouped devices:
1. Detect if array contains group headers
2. Split devices into groups
3. Apply sorting within each group
4. Reassemble with headers preserved

## Key Design Decisions

### Single Entity Type Per Card
Each card instance monitors only ONE entity type. Users create multiple cards for different types.

**Rationale**: Simpler configuration, clearer UX, easier to maintain

### Device Names vs Entity Names
The `name_source` config option allows choosing between:
- `device`: Device name from device registry (default)
- `entity`: Entity friendly_name attribute

**Rationale**: Some users prefer logical device names, others prefer specific entity names

### All Contact Sensor Types
Include all contact sensor device classes: door, window, garage_door, opening

**Rationale**: Users want comprehensive monitoring of all openings

### Light Domain Only (No Switches)
Only monitors `light.*` entities, not `switch.*` entities

**Rationale**: User converts switches to lights using helper entities when needed

### Custom Icon Support
Card checks for custom icons (`entity.attributes.icon`) before using strategy icons

**Rationale**: Respect user customizations while providing smart defaults

### Battery Duplicate Filtering
When `binary_sensor.*_battery_low` exists, exclude corresponding `sensor.*_battery` entity

**Rationale**: Avoid showing the same battery twice with different representations

## File Structure

```
battery-monitor-card/
├── dist/
│   └── battery-monitor-card.js   # HACS distribution file (matches repo name)
├── www/
│   └── device-monitor-card.js    # Development source file
├── README.md                     # User documentation
├── package.json                  # npm metadata
├── hacs.json                     # HACS integration config
└── claude.md                     # This file
```

**Note:** The filename in `dist/` matches the repository name (`battery-monitor-card.js`) as required by HACS, while the custom element name remains `device-monitor-card` as defined in the JavaScript.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity_type` | string | 'battery' | Type: 'battery', 'contact', or 'light' |
| `filter` | string | 'alert' | Show: 'alert' (problems only) or 'all' |
| `battery_threshold` | number | 20 | Battery % threshold (battery only) |
| `title` | string | Auto | Card title |
| `group_by` | string | null | Group: null, 'area', or 'floor' |
| `sort_by` | string | 'state' | Sort: 'state', 'name', or 'last_changed' |
| `name_source` | string | 'device' | Name: 'device' or 'entity' |
| `show_toggle` | boolean | false | Show toggle switch (light only) |
| `collapse` | number | undefined | Limit shown devices with expand button |
| `debug` | boolean | false | Enable console logging |

## Home Assistant Integration

### Required Registries
The card requires access to these Home Assistant registries:
- **Entity Registry** (`hass.entities`): Maps entity_id to device_id
- **Device Registry** (`hass.devices`): Device info, names, area assignments
- **Area Registry** (`hass.areas`): Area names and floor assignments
- **Floor Registry** (`hass.floors`): Floor names

### Custom Element Registration

```javascript
customElements.define('device-monitor-card', DeviceMonitorCard);
customElements.define('device-monitor-card-editor', DeviceMonitorCardEditor);
```

Usage in Lovelace:
```yaml
type: custom:device-monitor-card
entity_type: battery
filter: alert
```

## Common Tasks

### Adding a New Entity Type

1. Add entry to `ENTITY_TYPES` object with all required methods
2. Add option to visual editor (`DeviceMonitorCardEditor`)
3. Update README with examples and documentation
4. Add default title in `setConfig()` method

### Modifying Sorting Behavior

Edit `_applySorting()` method. Remember to handle both grouped and ungrouped cases in `_sortDevices()`.

### Changing Detection Logic

Modify the `detect()` method in the relevant `ENTITY_TYPES` entry. Be careful not to break existing functionality.

## Testing

Test directly in Home Assistant:
- Test all three entity types (battery, contact, light)
- Test grouping combinations (none, area, floor)
- Test sorting options (state, name, last_changed)
- Test with custom icons
- Test toggle switches for lights
- Test filter modes (alert vs all)

## Debugging

Enable debug mode in config:
```yaml
type: custom:device-monitor-card
entity_type: battery
debug: true
```

This logs to browser console:
- All discovered entities
- Device additions/updates
- Entity state evaluations
- Summary counts

## Known Limitations

- Entities must be linked to devices (deviceless entities are skipped)
- Requires modern Home Assistant with registry access
- No support for multiple entity types in a single card
- No custom entity filtering by pattern (roadmap item)

## Future Enhancement Ideas

See README Roadmap section for community-requested features:
- Custom entity filtering by entity_id pattern
- Multiple entity types in one card
- Battery history graphs
- Export device lists
- Notification integration
- Custom thresholds per device
- Badge mode for compact display

## HACS Publishing

### Requirements for HACS Default Repository

To be included in HACS as a default repository:

1. **File Structure**: Plugin file must be in `dist/` directory or repository root
2. **File Naming**: Must match repository name (`battery-monitor-card.js`)
3. **GitHub Releases**: At least one release required (v1.0.0+)
4. **Repository Topics**: Add topics like `hacs`, `home-assistant`, `lovelace-card`
5. **Description**: Clear GitHub repository description
6. **README**: Comprehensive documentation
7. **hacs.json**: Manifest file with correct filename reference

### Submission Process

1. Ensure all requirements are met
2. Create GitHub release (v1.0.0)
3. Add repository topics on GitHub
4. Submit PR to [hacs/default](https://github.com/hacs/default) repository
5. Wait for automated validation checks to pass

### Custom Repository Installation

Users can add this repository manually in HACS before it becomes a default:
- Go to HACS → Integrations → ⋮ → Custom repositories
- Add URL: `https://github.com/molant/battery-monitor-card`
- Category: Plugin

## Development Notes

### No Build Process
Pure JavaScript implementation - no compilation, bundling, or transpilation needed.

### File Synchronization
When making changes:
1. Edit `www/device-monitor-card.js` (development source)
2. Copy to `dist/battery-monitor-card.js` before committing
3. Both files should have identical content

### Browser Compatibility
Fully supported in all modern browsers (Chrome, Firefox, Safari, Edge) and mobile browsers.

### Web Components
Uses Shadow DOM for style encapsulation. All styles are scoped to the card.

### Event Handling
- Click on device → Navigate to device page
- Toggle switch → Call light service
- Expand button → Toggle collapsed state

### Performance Considerations
- Entity discovery runs on every render (when hass updates)
- For large installs, consider filtering logic optimization
- Group headers are just objects mixed in the array (minimal overhead)

## Repository Information

- **Repository**: https://github.com/molant/battery-monitor-card
- **License**: MIT
- **HACS Integration**: Yes (first release v1.0.0)
- **Minimum Home Assistant**: 2024.1.0

## Contributing

When contributing:
1. Test all entity types thoroughly
2. Maintain the strategy pattern architecture
3. Update README with configuration changes
4. Keep visual editor in sync with config options
5. Test grouping and sorting edge cases
6. Verify mobile responsiveness

## Version History

- **v1.0.0** (2025-11-16): Initial HACS release with multi-entity support
