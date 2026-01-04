# Device Monitor Card - Translation Guide

Thank you for contributing translations to the Device Monitor Card!

## Supported Languages

- 🇬🇧 English (en) - Default language
- 🇪🇸 Spanish (es) - Contributed by molant

## Contributing a Translation

We welcome translations for additional languages! Here's how to contribute:

### Step 1: Create a New Translation File

1. Copy the [en.json](./en.json) file as a template
2. Name your file with the appropriate language code (e.g., `fr.json` for French, `de.json` for German)
3. Use [BCP47 language codes](https://en.wikipedia.org/wiki/IETF_language_tag) for consistency

### Step 2: Translate All Strings

1. Open the English translation file (`en.json`)
2. Translate each string value while keeping the keys unchanged
3. Maintain the same JSON structure and nesting
4. **Important:** Do NOT change the keys, only the values

Example:
```json
{
  "editor": {
    "title": "Título",
    "title_description": "Texto del título de la tarjeta",
    ...
  }
}
```

### Step 3: Test Your Translation

1. Install the card in Home Assistant
2. Place your translation file in the correct directory:
   - For HACS installation: `<config>/www/community/device-monitor-card/translations/`
   - For manual installation: `<config>/www/device-monitor-card/translations/`
3. In Home Assistant, go to Settings → User Profile
4. Change your language to your translated language
5. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
6. Open the card or badge editor and verify all strings appear correctly

### Step 4: Submit Your Translation

1. Fork the [device-monitor-card repository](https://github.com/molant/device-monitor-card)
2. Commit your translation file with a clear message:
   ```
   Add [Language Name] translation for editors
   ```
3. Create a pull request with:
   - Title: `Add [Language Name] translation`
   - Description:
     - Your GitHub username or name
     - Any notes about the translation (e.g., "Translated by [Name]")
     - Confirmation that you've tested the translation in Home Assistant

## Translation Scope

Only the **configuration editor UI** is translated. This includes:
- Field labels (Title, Entity Type, Filter, etc.)
- Field descriptions
- Placeholder text
- Option values in dropdowns

**NOT translated:**
- Runtime card/badge display (uses Home Assistant's built-in localization)
- Device names and states
- Time formatting (uses browser's native Intl.RelativeTimeFormat)

## String Categories

The `en.json` file contains strings organized as follows:

### Editor UI Strings
Configuration labels and descriptions for both the card and badge editors:
- `title` - Card/badge title field label
- `entity_type` - Entity type selector label
- `filter` - Filter selector label
- `battery_threshold` - Battery threshold field label
- `group_by` - Group by selector label
- `sort_by` - Sort by selector label
- `name_source` - Name source selector label
- `collapse` - Collapse field label
- `card_visibility` / `badge_visibility_description` - Visibility settings
- `show_toggle` - Show toggle switch option (lights and switches)
- `debug_mode` - Debug mode checkbox label
- `tap_action` - Tap action selector (badge only)

### Entity Type Options
Options for entity type dropdowns:
- `entity_type_battery` - "Battery"
- `entity_type_contact` - "Contact Sensors"
- `entity_type_lock` - "Locks"
- `entity_type_light` - "Lights"
- `entity_type_switch` - "Switches"

### Filter Options
Options for filter dropdowns:
- `filter_alert` - "Only Alerts"
- `filter_all` - "All Devices"

### Grouping Options
Options for group by dropdowns:
- `group_by_none` - "None"
- `group_by_area` - "Area"
- `group_by_floor` - "Floor"

### Sorting Options
Options for sort by dropdowns:
- `sort_by_state` - "State"
- `sort_by_name` - "Name"
- `sort_by_last_changed` - "Last Changed"

### Name Source Options
Options for name source dropdowns:
- `name_source_device` - "Device Name"
- `name_source_entity` - "Entity Name"

### Visibility Options
Options for visibility dropdowns:
- `visibility_always` - "Always"
- `visibility_alert` - "Only on Alert"

### Tap Action Options (Badge Only)
Options for tap action dropdowns:
- `tap_action_none` - "None"
- `tap_action_navigate` - "Navigate"
- `tap_action_url` - "URL"
- `tap_action_call_service` - "Call Service"
- `tap_action_toggle` - "Toggle"
- `tap_action_more_info` - "More Info"

## Tips for Translators

1. **Keep it concise:** UI space is limited, especially for mobile. Keep translations reasonably short.

2. **Use consistent terminology:**
   - If you translate "Title" as one word, use the same translation everywhere it appears
   - Be consistent with Home Assistant terminology for your language

3. **Respect formatting:**
   - Don't add extra spaces or punctuation
   - Keep descriptions as helpful and clear as the English version

4. **Context matters:**
   - "Title" refers to the label/name shown to users
   - "Entity Type" refers to the type of Home Assistant entities being monitored
   - "Filter" controls what devices are shown (alerts only vs. all devices)
   - "Group By" organizes devices in the display
   - "Sort By" controls the order of devices

5. **Test placeholders:**
   - Verify that placeholder text fits in form fields on mobile
   - Check that descriptions don't break the layout

## Questions or Issues?

If you have questions about translating specific strings or encounter issues:

1. Open an issue on the [GitHub repository](https://github.com/molant/device-monitor-card/issues)
2. Tag it with `translation`
3. Include the language you're translating to
4. Describe your question or issue

## Language Codes Reference

Common BCP47 language codes:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `nl` - Dutch
- `pl` - Polish
- `ru` - Russian
- `ja` - Japanese
- `zh` - Chinese (Simplified)
- `zh-TW` - Chinese (Traditional)

For more language codes, see [IETF Language Tags](https://en.wikipedia.org/wiki/IETF_language_tag).

## License

Translations are part of the Device Monitor Card project and are licensed under the MIT License.

---

Thank you for helping make Device Monitor Card accessible to more users! 🙏
