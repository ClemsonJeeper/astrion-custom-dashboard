# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
