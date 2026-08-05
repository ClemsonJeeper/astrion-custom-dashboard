# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - 2026-08-04

### Added

- Dashboard builder (`index.html`): `clock_weather` cards now have a dedicated form (weather entity, 12h/24h time format, number of forecast rows, optional calendar entity) instead of the raw-JSON fallback used for unmodeled card types, plus a matching preview tile in the right-hand pane.
- Dashboard builder (`index.html`): `vacuum` cards now have a dedicated form (name, entity, map image entity, map rotation/height, room list with segment IDs) instead of the raw-JSON fallback, plus a matching preview tile in the right-hand pane.
- `ClimateCard`: swing-mode chips (`climate.set_swing_mode`), matching the existing hvac/fan-mode chips — reads the entity's `swing_modes` attribute, translated via a new `HaLabels.swingMode()` / `assets/ha_labels/*.json` `swing_mode` category.
- `ClimateCard`: per-feature icon/label display, matching Home Assistant's own climate tile-card (`style: icons`). New `hvac_mode_style`, `fan_mode_style`, and `swing_mode_style` `dashboard.json` options (`"label"` or `"icons"`). Icons are hand-built from official MDI path data via a new `MdiIcons` object — no new Gradle dependency.
- `ClimateCard`: `hvac_modes` config override, mirroring the existing `fan_modes`/`swing_modes` overrides — reorders or restricts the hvac chips shown, in the order given, instead of always reading the entity's raw attribute order.
- `ClimateCard`/`MdiIcons`: dedicated glyphs for fan "quiet"/"silent", numeric fan speeds 1–5, swing on/off, and the heat_cool/auto mode, replacing the earlier generic fan/arrow placeholders with the device-accurate icons.
- `ClimateCard`: a small caption above each chip row ("Mode"/"Fan"/"Swing") so the swing chips are legible in text-label style instead of showing just "On"/"Off" with no context — new `climate_hvac_caption`, `climate_fan_caption`, `climate_swing_caption` string resources (English and French).
- Dashboard builder (`index.html`): `climate` cards' form now covers `hvac_modes`, `swing_modes`, `hvac_mode_style`, `fan_mode_style`, and `swing_mode_style`.
- Dashboard builder (`index.html`): `climate`, `clock_weather`, and `vacuum` cards now render a real example preview (icons, translated labels, forecast bar, room chips) driven by a representative mock entity, instead of placeholder text like "(translated condition)".

### Changed

- `ClimateCard`: the "off" hvac mode no longer shows as a chip — the card's header already has a dedicated power-off button, so a chip for it was a redundant control.
- `ClimateCard`: mode chip rows (hvac/fan/swing) now wrap and balance evenly across rows (e.g. 5 items → 3+2) instead of a hard 4-per-row cutoff that silently hid anything past the 4th mode.
- `ClimateCard`: tightened padding/spacing and chip/button sizes to reduce the card's overall height on small panels.

### Fixed

- `ClockWeatherCard` didn't translate its current-condition label — it just capitalized the raw Home Assistant state string (e.g. `partlycloudy` → "Partlycloudy") instead of going through `HaLabels`. It now calls `HaLabels.weatherCondition()` like the rest of the app.
- `assets/ha_labels/*.json`'s `weather_condition` category only covered 10 of the 16 conditions Home Assistant's weather platform can report; added the missing `clear`, `lightning-rainy`, `snowy-rainy`, `windy-variant`, `hail`, and `exceptional` entries (English and French).
- `VacuumCard` had the same issue as `ClockWeatherCard`: its activity-state label (docked/cleaning/paused/idle/returning/error) was capitalized from the raw state instead of going through `HaLabels`. It now calls `HaLabels.vacuumState()`. Fan-speed/cleaning-mode names are left as-is since they're integration-specific, not a fixed HA value set.
- `ClimateCard`'s fan-mode chips were built from a hardcoded `["low", "medium", "high", "auto"]` guess whenever `dashboard.json` didn't override them, ignoring the entity's own `fan_modes` attribute — unlike `hvac_modes`, which already read it correctly. Chips could show options the device doesn't actually support (and silently fail when tapped). It now prefers the entity's reported `fan_modes`, falling back to the config override or the hardcoded list only if the integration reports nothing.
- `ClimateCard`'s current-temperature label ("Now 27°") was a hardcoded English string instead of going through `res/values*/strings.xml` like the rest of the app's UI text; added `climate_current_temp` (English and French) and switched the card to `stringResource()`.
- `ClimateCard`'s hvac-mode chips silently dropped anything past the 4th mode (`modes.take(4)`) — an entity reporting `off, fan_only, heat, cool, heat_cool, dry` only ever showed the first four. The cap is gone; see "Changed" above for the row-wrapping that replaces it.

## [0.2.0] - 2026-08-03

### Added

- Local web configurator on `http://<remote-ip>:8080`: set the Home Assistant URL/token and Harmony Hub IP/ID after install, without adb or a rebuild.
- `dashboard.json` upload/download and icon upload from the same local page.
- In-app update checker: reads this repository's GitHub Releases, downloads a newer APK, and opens the system installer.
- Settings panel is now a dedicated overlay reached by swiping down from the top edge, separate from `dashboard.json`'s page list — no longer swipable as a regular page or listed in the page-indicator dots.
- Local configurator address (`http://<ip>:8080`) shown directly in the Settings panel.
- App text (Settings panel, etc.) now follows the system language via standard Android string resources (English default, French translation included).
- Home Assistant state values (climate `hvac_mode`/`fan_mode`, weather conditions, vacuum states) now translated per language via `assets/ha_labels/<lang>.json`, instead of showing the raw English values from the integration.

### Changed

- `SettingsMenuCard` moved out of `cards/impl/` into `ui/SettingsMenu.kt` — it's no longer a `dashboard.json`-driven card, it's rendered directly by the Settings overlay.
- Connection settings (Home Assistant, Harmony Hub) no longer come from `BuildConfig`/`secrets.properties` baked in at compile time — every install starts unconfigured and is set up via the local web page instead. This is what makes a single prebuilt APK safe to share publicly.

### Fixed

- Home Assistant state translations were cached at process start and never refreshed after a system language change; they now reload correctly when the language changes.
- Update-install flow now checks the "install unknown apps" permission and catches installer failures instead of letting them crash the app (and, with it, the local web server).

## [0.1.0] - Initial build

- Initial custom dashboard app, based on [@baes-cloud](https://github.com/baes-cloud/astrion-dashboard)'s original project.
- Swipeable card-based dashboard driven by `dashboard.json`.
- Home Assistant WebSocket connection, Harmony Hub integration, physical hardware key routing.
