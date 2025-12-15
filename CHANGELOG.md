### v1.3.1 (2025-12-15)

**Fixes:**
-  interpolate version in console output to avoid duplicate updates
-  localization files missing in release


### v1.3.0 (2025-12-14)

**Features:**
- **Localization support**: Card and badge UI now supports multiple languages with translation files for English, Spanish, and German
- **Unavailable device display**: New configuration option to show/hide devices with unavailable state
- **Lock support for contact sensors**: Lock entities are now included when monitoring contact sensors

### v1.2.2 (2025-12-11)

- **Fix card visibility options**: INow it hides correctly the same as the badge.

### v1.2.1 (2025-12-10)

- **Consider area of group entities**: It was being ignored completely.
- **Enumerate all entities for devices that meet the criteria**: A dual smart relay could control 2 sets of lights and previously only one will show up.


### v1.2.0 (2025-12-10)

- **Hide when no device is on alert**: New configuration option to hide the card or badge when there aren't any entities that meet the criteria.
- **Include groups**: Before we ignored groups of devices, even if they were of the right type. Not anymore!

### v1.1.0 (2025-12-09)

**Card Features/Fixes:**
- **Respect visibility**: Entities that are marked as non visible in the UI will not show up in the list

**Badge Features/Fixes:**
- **Tap actions**: Added tap configuration to badge (navigation, toggle, etc.)

### v1.0.0 (2025-11-16)

Initial release of Device Monitor Card & Badge!

**Card Features:**
- **Multi-Entity Support**: Monitor batteries, contact sensors (doors/windows), and lights
- **Smart Device Naming**: Choose between device names or entity friendly names
- **Automatic Discovery**: Automatically finds entities based on device class and domain
- **Smart Grouping**: Group devices by area or floor for better organization
- **Flexible Sorting**: Sort by state (battery level/status), name, or last changed time
- **Interactive Controls**: Toggle lights on/off directly from the card (optional)
- **Custom Icons**: Respects user-configured entity icons
- **Smart Filtering**: For batteries, excludes duplicate sensors when binary_sensor.*_battery_low exists
- **Color-Coded Icons**: Dynamic icons and colors based on entity state
- **Clickable Devices**: Click any device to open its device page in Home Assistant
- **Responsive Design**: Mobile-friendly layout that matches Home Assistant's style
- **Visual Editor**: Full visual configuration editor in Home Assistant UI

**Badge Features:**
- **Compact Display**: Shows alert count in format "TITLE (5/30)"
- **Same Entity Types**: Supports batteries, contact sensors, and lights
- **Color-Coded**: Icon color changes based on alert state (green/red/yellow/gray)
- **Visual Editor**: Configuration editor for easy setup
- **Reusable Logic**: Shares detection and evaluation logic with the card

## Credits

Created for the Home Assistant community.

## Support

If you encounter any issues or have feature requests:

1. Check the troubleshooting section above
2. Review existing GitHub issues
3. Create a new issue with:
   - Home Assistant version
   - Browser and version
   - Card configuration
   - Error messages from browser console
   - Entity type being monitored
