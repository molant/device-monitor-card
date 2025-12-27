# Exclusion Filters Plan

## Goals
- Add an `exclude` configuration section to both the card and badge editors.
- Support filtering by **integration**, **device**, and **label** with an input + dropdown picker similar to HA.
- Allow chaining rules using **AND/OR** logic.
- Keep the editor compact by collapsing the rules section by default.

## Proposed Config Shape
```yaml
exclude:
  operator: or            # or | and (default: or)
  rules:
    - type: integration   # integration | device | label
      value: zha          # domain, device_id, or label_id
```
- Store identifiers (domain/device_id/label_id) instead of display names so filtering is stable.
- If `exclude` is omitted, behavior matches current output.

## UI/UX Plan (Editors)
- Add a collapsible **Exclude** section (collapsed by default) to both:
  - `DeviceMonitorCardEditor` (card settings)
  - `DeviceMonitorBadgeEditor` (badge settings)
- Use an expansion container (`ha-expansion-panel` if available; fallback to `<details>`):
  - Summary text: `Exclude` + rule count, e.g. `Exclude (2 rules)`.
- Inside the section:
  - Operator toggle: dropdown/radio for **Any (OR)** / **All (AND)**.
  - Rule list UI:
    - Each rule row: Type selector + value selector + remove icon.
    - “Add filter” button at bottom.
- Pickers:
  - **Integration**: `ha-combo-box` populated from `hass.config.components` (domains).
  - **Device**: `ha-combo-box` populated from `hass.devices` (device_id + display name); use `ha-selector` device picker only if available and stable on 2025.12.
  - **Label**: `ha-combo-box` populated from `hass.labels` (label_id + name).

## Data & Filtering Logic
- Extend `collectDevices` to apply `exclude` rules **before** computing alert/normal/unavailable counts.
- For each device/entity:
  - Resolve **integration domain(s)** for the device:
    - Prefer `device.identifiers` domain; fallback to registry/config entries if needed.
  - Resolve **label ids**:
    - Prefer device-level labels; fallback to entity-level labels if present.
- Rule matching:
  - **OR**: exclude if any rule matches.
  - **AND**: exclude only if all rules match.
- Edge behavior:
  - Unknown/missing identifiers should **not** match a rule.
  - Empty `rules` array behaves as “no exclusions”.

## Localization
- Add translation strings for the editor UI:
  - Section title/description: `exclude`, `exclude_description`.
  - Buttons: `exclude_add_filter`, `exclude_remove_filter`.
  - Operator labels: `exclude_operator`, `exclude_operator_any`, `exclude_operator_all`.
  - Rule field labels: `exclude_rule_type`, `exclude_rule_value`.
  - Rule type options: `exclude_rule_integration`, `exclude_rule_device`, `exclude_rule_label`.
- Update all language files in `src/translations/`.

## Docs Updates
- Update `README.md` with the new `exclude` config shape, examples, and behavior notes.
- Add a short note in `DEVELOPMENT.md`/`CHANGELOG.md` if that’s the project convention.

## Implementation Steps
1. **Config model**: add `exclude` default handling in card and badge `setConfig` and stub config.
2. **Editor UI**: implement the collapsible section, rule list rendering, add/remove handlers.
3. **Pickers**: wire HA pickers where available; fallback to `<select>` if needed.
4. **Filtering**: apply exclusion rules inside `collectDevices` (before categorization).
5. **Localization**: update translation keys and labels.
6. **Docs**: README update with examples and rule logic explanation.

## Resolved (HA 2025.12)
- **Labels source**: label registry lives at `hass.labels` (map keyed by label_id). Device registry entries expose `labels` on `hass.devices[deviceId]`, and entity registry entries expose `labels` on `hass.entities[entityId]`.
- **Groups**: label rules also apply to group entities; use entity registry `labels` for `registryHelpers.isGroupEntity` entries.
- **Picker choice**: use `ha-combo-box` for rule value selection to match HA docs and provide searchable dropdowns.
