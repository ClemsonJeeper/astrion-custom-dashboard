# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.0] - 2026-08-10

### Added

- Multi-hub Harmony support: `RemoteSettings` now stores a list of Harmony hubs (name/IP/ID) instead of a single hardwired one, each with a stable app-generated `localId` used to reference it from `dashboard.json`. The settings page (`/`) lists them as repeatable rows with a "+ Add a hub" button; existing single-hub installs are migrated automatically on first read.
- `HarmonyHubRegistry`: owns one `HarmonyHubClient` per configured hub, connects/disconnects them together, and resolves which client a `hub` reference should use — falling back to the first configured hub when a `hub` field is absent, so single-hub `dashboard.json` files keep working unchanged.
- "Auto-detect ID" per hub row, plus automatic detection on the IP field losing focus: resolves a hub's numeric ID from its IP alone via `HarmonyHubDiscovery` (`setup.account?getProvisionInfo`, `Origin: http://sl.dhg.myharmony.com`), so hubs no longer need their ID copied by hand from Home Assistant's `harmony_<id>.conf`.
- `HarmonyHubClient.getConfig()`: fetches a hub's full config over the existing WebSocket connection — every paired device with its IR commands, plus every Activity — the same data Home Assistant keeps in `harmony_<id>.conf`. Exposed via `GET /harmony-config?hub=<localId>` (and `GET /harmony-hubs` to list configured hubs), and cached to `astrion/harmony_<hubId>.json` next to `dashboard.json` on every successful fetch — served from that cache automatically if the hub is temporarily unreachable.
- The dashboard builder (`docs/`) is now bundled as app assets and served locally at `GET /builder/`, alongside the existing GitHub Pages copy — no separate computer or internet access needed to build a `dashboard.json`.
- Builder: `dashboard.json` now loads automatically when the builder is opened from this device (`js/device.js`), with a "Save to device" button that writes it directly and live-reloads the dashboard — replacing the copy-paste/download-only flow. Falls back to the original flow when the builder is opened outside the app (GitHub Pages).
- Builder: hotkeys and scene tiles can now target a Harmony hub through a cascading **Hub → Device → Command** or **Hub → Activity** picker (`js/harmony.js`), fed live from the paired hub(s), instead of typing raw device/command/activity IDs. Falls back to the original plain text fields when the builder isn't served by the app.
- `SceneGridCard` scenes support `harmonyDevice`/`harmonyCommand` (alongside the existing `activityId`), and both now respect an optional `hub` field. `AppleTvRemoteCard` also gained an optional `hub` option. `CardContext.startHarmonyActivity`/`sendHarmonyCommand` and `HotkeyConfig` both take a `hub` parameter/field for this, defaulting to the first configured hub when omitted.

### Removed

- `CustomIrCard` (`custom_ir` card type): superseded by IR Activities (0.4.0) — a `scene_grid` tile with an `irActivity` action covers the same local, hub-free IR sending, with a proper Category → Brand → Model → Command picker in the dashboard builder instead of hand-written `freq`/`pattern` arrays. Existing `dashboard.json` files with `custom_ir` cards need to migrate their buttons to an IR Activity + `scene_grid`.
- `docs/index.html`: `custom_ir` option removed from the "Card type" dropdown.
- `docs/README.md`: `custom_ir` removed from the list of raw-JSON-fallback card types.

### Changed

- `cards/impl/TileCards.kt` split into one file per card: `CoverCard.kt`, `FanCard.kt`, and `SwitchCard.kt` (renamed from `TileCards.kt`, now containing only `SwitchCard`). Same package, same class names — no config or registration changes needed. Each card previously shared a couple of small private UI helpers (e.g. `CircleBtn`); those are now duplicated per file instead, so each card's look can evolve independently.
- Local config page (`/`, `ConfigServer.kt`): the Home Assistant connection panel and the dashboard.json panel are now shown side by side (`panels-grid`, 2 columns above 700px, single column on narrower screens) instead of stacked.
- Local config page: the "Updates" section moved from a separate block at the bottom of the page into a compact badge next to the Home Assistant/hubs status badges — shows the current version, or an amber "update available" badge that installs directly when tapped.

## [0.4.0] - 2026-08-06

### Added

- `FanCard`: new `full` style (auto-picked when the entity reports `preset_modes` and/or an `oscillating` attribute), mirroring `ClimateCard`'s layout from 0.3.0 — a dedicated power button, preset-mode chips (or a percentage stepper for percentage-only fans), and an oscillate on/off toggle.
- `FanCard`: `preset_modes` config override, mirroring `ClimateCard`'s `fan_modes`/`swing_modes` overrides — reorders or restricts the preset chips shown, in the order given, instead of always reading the entity's raw attribute order. `"off"` is always excluded from the chips since the card's own power button covers it.
- `FanCard`: oscillate toggle chip, reusing `HaLabels.swingMode()`'s existing on/off translation for its label (new `fan_oscillate_caption` / `fan_preset_caption` string resources, English and French).
- `FanCard`: `style` config option (`"auto"` (default), `"simple"`, `"full"`), same pattern as `ClimateCard`.
- `SceneGridCard`: scene tiles now render an optional PNG `icon`, loaded the same way as `ButtonGridCard`'s `icon` field — previously accepted in `dashboard.json` but silently ignored. Tiles switch to an icon-above-label layout when one is set.
- `docs/index.html`: `scene_grid` form gained `color` and Harmony `activityId` fields, previously only settable by hand-editing `dashboard.json`.
- `docs/index.html`: the preview pane now renders dashboard content inside an image of the physical remote (`remote.png`), sized to the real HA100 screen resolution (480×800), with a mocked status bar (Wi-Fi / time / battery) so the space it takes up on-device is accounted for. Tapping the screen expands it into a larger modal for easier editing.
- `SceneGridCard`: `show_labels` config option — when `false`, tiles show the icon only, no name text underneath.
- `ClimateCard` / `FanCard`: `show_captions` config option — when `false`, hides the "Mode"/"Fan"/"Swing" (climate) or "Preset"/"Oscillate" (fan) labels above their chip rows.
- `docs/index.html`: forms for `climate`, `fan`, and `scene_grid` gained checkboxes for the new `show_captions`/`show_labels` options above, including in the preview mock for climate/fan.
- **IR Activities**: named sequences of raw IR sends, executed locally through the device's own IR blaster (`ConsumerIrManager`) — no Harmony hub or Home Assistant required, for setups without one.
  - `AppConfig`: new `irActivities` list (`IrActivityConfig`/`IrStepConfig` — id/name/steps, each step a `freq`/`pattern`/optional `delayAfterMs`), parsed from `dashboard.json`'s new `"irActivities"` array.
  - `CardContext`: exposes `irActivities` (by id) to cards.
  - `SceneGridCard`: new `irActivity` scene action (alongside `entity_id`/`activityId`/`page`) — runs the named activity's steps in order on the card's own coroutine scope, waiting `delayAfterMs` between steps.
  - `docs/ir-database/`: community-contributed device codes (`index.json` category manifest + one JSON file per category, e.g. `tv.json`), keyed by category → brand → model → command, storing each command as Pronto Hex (universal raw IR timing, protocol-agnostic — works for NEC, JVC, Sony, etc. via one decoder instead of one per protocol).
  - `docs/index.html`: new "IR Activities" section — cascading Category → Brand → Model → Command pickers (loaded from `ir-database/`), per-step delay, and a Pronto → `freq`/`pattern` decoder that resolves each step at build time, so `dashboard.json` ships fully-resolved steps and the app never needs to parse a protocol or ship the database itself. `scene_grid` items gained an "IR activity" picker alongside their existing action fields.

### Changed

- `ClimateCard` / `FanCard`: power buttons now share a consistent color scheme — red when off, green when on — instead of `ClimateCard`'s off-only red accent and `FanCard`'s on-only green accent, so both cards read the same way at a glance.
- `docs/index.html`: `button_grid`/`scene_grid` items in the editor list can now be clicked to edit them in place, instead of only add/remove.
- `docs/index.html`: the small in-frame preview no longer shows the card type label, edit/remove icons, or `hint` text (entity id, "example data", etc.) — only the expanded modal does — since none of that renders on the real device.
- `docs/index.html`: split the single ~1400-line file into `styles.css` + `js/{mocks,pages,cards,hotkeys,ir,export,preview}.js`, matching the section comments that were already there. Same behavior, just easier to find and edit a given piece — and `docs/js/` now needs to be deployed alongside `index.html`, not just the one file.

### Fixed

- Wi-Fi sometimes failed to reactivate after a restart, requiring a manual trip into Android's system settings. Added a `WifiBootReceiver` (`BOOT_COMPLETED`) that re-enables Wi-Fi automatically at startup if it isn't already on, with the `ACCESS_WIFI_STATE`/`CHANGE_WIFI_STATE` permissions it needs to read and change the radio state.
- `docs/index.html`: `button_grid`/`scene_grid` cards with more columns than fit the small in-frame preview width caused a horizontal scrollbar; grid columns now shrink to fit instead.
- `SceneGridCard`: tile height (icon vs. text-only) was decided per-tile, so a grid mixing scenes with and without an `icon` rendered uneven row heights. It's now decided once for the whole grid — every tile matches as soon as any one of them has an icon.

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
