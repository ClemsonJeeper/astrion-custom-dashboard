# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.8.0] - 2026-08-16

### Added

- AV Activities: any `scene_grid` tile or hotkey can now be marked `"track": true` with a `"room"`, turning it into a tracked Activity ("Watch Apple TV", "Listen to Music"...) — no separate config section, the tile's existing `entity_id`/`activityId`+`hub`/`harmonyDevice`+`harmonyCommand` is still what actually runs; `track`/`room` just add bookkeeping. At most one Activity is active per room at a time; different rooms are fully independent.
- Composed Activities (`ActivityConfig`/`ActivityDeviceConfig`, `AppConfig.activities`): for setups where more than one device needs orchestrating — the case a Harmony hub normally handles internally — Astrion can now do it itself, mixing IR/Harmony/HA devices freely within the same Activity. On switching Activities within a room, a device used by both the outgoing and incoming Activity is left alone (no needless power cycle, just a possible input change); a device only in the outgoing one gets powered off (`switchActivity()` in `Dashboard.kt`). Referenced from a `scene_grid` tile's new `"activity"` field; always implicitly tracked.
- IR Devices (`IrDeviceConfig`, `AppConfig.irDevices` — replaces the old `IrActivityConfig`/`irActivities` macro list): a registry of named commands per physical device (`"power"`, `"hdmi1"`, `"volume_up"`...), resolved once at build time from either a community `ir-database/` entry or a hand-pasted Pronto Hex code. This is the fully-offline baseline for AV control — no Harmony hub, no Home Assistant, no cloud dependency, works even if every external service involved disappears.
- `ActivityRuntime`: scans every page/hotkey for `track: true` items, and every entry in `AppConfig.activities`, once per `dashboard.json` load; tracks which Activity is active per room (`activeByRoom`), updated via `trackTap()` (right after `SceneGridCard` fires a single-action tile), `markActiveById()` (after a composed Activity finishes its start sequence), and `bind()` (mirrors a Harmony hub's *live* Activity state into the matching room, so an Activity started from elsewhere — another remote, an HA automation, the physical Harmony remote — shows up too).
- `HarmonyHubClient`: `currentActivityId`/`activityState` (`StateFlow`), populated from the hub's unsolicited `connect.stateDigest?notify` push frames (`activityId` + `activityStatus`, distinguishing "starting" from "running" — confirmed against several real hub captures) and from a new one-shot `getCurrentActivity()` request/response call made right after connecting, since the push only fires on the *next* change.
- `HarmonyHubRegistry.clientsByLocalId` — exposes every configured hub's client, not just the default one (`client()`), for callers like `ActivityRuntime.bind()` that need to wire up all of them.
- New "Active Activities" overlay: swipe **up** from the bottom edge (page-indicator dots) — the mirror gesture of the existing swipe-down-for-Settings — lists every currently active Activity grouped by room; tapping one jumps straight to its page. Reached only by this gesture, like Settings, so it never appears in the page pager or its dots.
- Builder: new "IR Devices" section — the community `ir-database/` cascade picker (category → brand → model → command) now feeds a per-device command registry instead of a one-shot macro; a "Import all commands from this model" button pulls every command from a picked model in one go (ids already present are left alone, so re-importing after a manual rename doesn't clobber it); a manual Pronto Hex paste path covers devices/buttons not in the database; each saved command can be renamed inline (✎, no browser `prompt()`, consistent with the rest of the builder).
- Builder: new "Activities" section — a page-by-page wizard for composed Activities, mirroring Logitech Harmony's own Activity setup flow rather than one long form: pick a type (just prefills a name) → name/room/icon/page → select devices (local IR, Harmony hub+device, or a bare HA entity id — mixable) → one screen per selected device for its power-on/power-off/input commands, on/off-cycle toggles, and a delay → which device handles volume → review (flags any device with no commands set — it would silently do nothing at runtime) → save. Editing an existing Activity jumps straight to the name/room screen. A device already added can be edited in place, not just removed and re-added.
- Volume routing for a composed Activity: after picking a volume device, a further screen picks its volume-up/volume-down/mute commands (skipped for an HA device — it always uses the fixed `media_player.volume_up`/`volume_down`/`volume_mute` services). On save, if the Activity has a `page`, these are written as page-scoped hotkeys on it (`PageConfig.hotkeys`, which already override global bindings while that page is on screen — no new runtime mechanism needed). If that page already has a hotkey on `VOLUME_UP`/`VOLUME_DOWN`/`MUTE`, the builder confirms before overwriting rather than silently taking priority over an existing binding.
- `HotkeyConfig` gained `irDevice`/`irCommand` (send a local IR command directly from a physical-button binding, same as a `scene_grid` tile already could) and `devices` (a bookkeeping hint — see next point).
- `TrackedActivity`/`HotkeyConfig`/scene_grid items gained an optional `devices` list: which physical devices an Activity is known to involve, independent of whether it's composed or a lightweight `track`-only tile. `switchActivity()` in `Dashboard.kt` now reads this from *whatever* Activity was previously active in a room — Harmony-backed or composed — instead of only from a composed `ActivityConfig`'s own device list. This closes a real gap: switching from a Harmony Activity to a composed one had no way to know a device shared between them (e.g. a soundbar with only a `PowerToggle` command, no discrete on/off) was already on, and could send an unwanted toggle that turned it off instead of confirming it stayed on.
- Builder (`docs/js/cards.js`): a `scene_grid` tile with "Track as Activity" checked can now list which physical devices it involves (comma-separated ids) — mainly useful on a Harmony-backed tile, since Astrion has no other way to know which devices a Harmony Activity touches. `scene_grid` tiles also gained an IR device+command picker and a "Composed Activity" picker referencing the new Activities section.
- `MainActivity.kt`: `runHotkey()` now dispatches `irDevice`+`irCommand` bindings directly through the device's own IR blaster (`ConsumerIrManager`) — the same local IR path `scene_grid`/composed Activities already had, now available on physical-button bindings too. Closes the loop for a composed Activity's volume routing when the volume device is local IR.
- New `title` card type — a section header for grouping cards on a page (title + optional subtitle, independently alignable), ported from Home Assistant's Mushroom Title card. Where Mushroom uses its own `title_tap_action`/`subtitle_tap_action` (a full HA `ActionConfig` — call-service, navigate, more-info, url, assist...), this instead reuses the same `title_`/`subtitle_`-prefixed action fields `scene_grid` already has, so it also covers Harmony/IR/composed-Activity actions with nothing new to learn. Also supports an optional `icon` (a PNG file path, same `BitmapFactory.decodeFile` convention every other icon in the app uses — deliberately not a bundled/named vector set) and a `divider` line filling the rest of the row, Bubble-Card-style; either forces the title row left-aligned regardless of `alignment`, since that layout has no sensible centered/right-aligned form. An optional `color` (same ARGB hex convention as `scene_grid`'s) tints the title text and, when `divider` is on, the line at reduced alpha to match — the subtitle and icon are untouched by it, icons are never tinted anywhere in the app. Builder: new "Title" entry under "Common" with a title/subtitle/alignment/icon/divider/color form; a tappable title needs the "Other / custom type…" raw-JSON editor instead, since re-saving through the simple form — like every card type here — rewrites the card's options from scratch.

### Changed

- Builder: editing an existing Harmony-backed tile (`scene_grid` or `apple_tv_remote`) that has no explicit `hub` no longer silently defaults the Hub dropdown to the first configured hub — with more than one hub, that default could be the wrong one and would get silently re-saved as correct. The dropdown now shows empty and the existing "pick a hub" validation blocks saving until one is chosen explicitly.
- Builder: ids generated from a name (IR devices, Activities) now strip accents via Unicode NFD normalization instead of mangling them — `"Xbox Série X"` becomes `"xbox_serie_x"`, not the previous `"xbox_s_rie_x"`.
- `SettingsOverlay`/`ActivitiesOverlay`: the swipe-to-close gesture now lives on a dedicated strip (bottom for Settings, top for Activities — mirrored) instead of on the same node as `verticalScroll`, which meant the scroll consumer ate every vertical drag before the close gesture ever fired. Incorporates the `SettingsOverlay` fix from [PR #3](https://github.com/dckiller51/astrion-custom-dashboard/pull/3) (see Fixed, below), applied to `ActivitiesOverlay` as well.

### Fixed

- Builder (`docs/js/cards.js`): `fillGiHarmonySection()` was defined twice (dead duplicate); removed.
- Builder: `dashboard.json`'s `irDevices`/`activities` were silently dropped every time the builder reloaded a config — both `pages.js`'s "paste JSON" import and `device.js`'s auto-reload-from-device path had a field whitelist that pre-dated those two sections.
- Builder: the Activities section's IR-device picker didn't refresh after saving or removing an IR device (only the `scene_grid` form's picker did, via a different refresh path).
- `Dashboard.kt`: `SettingsOverlay` called `SettingsMenu(ctx, onClose = onClose)`, but `SettingsMenu` only ever declared `ctx` — a pre-existing compile error.
- `HaModels.kt`: `EntityState.attrString()`/`attrDouble()`/`attrBoolean()` used the throwing `.jsonPrimitive` extension on a raw attribute value, crashing the app on any non-primitive attribute instead of returning null — switched to a safe `as? JsonPrimitive` cast. Reported against v0.7.0 in [issue #2](https://github.com/dckiller51/astrion-custom-dashboard/issues/2) with a Kodi `media_player` entity, whose `media_content_id` attribute is a nested object (`{"imdb": "...", "tmdb": "..."}`) rather than the plain string most other media players report: the `media_player` card's progress bar crashed on `variant: "full"` once playback started, and crashed the long-press Detail dialog outright, both of which key their `remember`/`LaunchedEffect` on that attribute. `MediaPlayerCard.kt`/`MediaPlayerDetailDialog.kt` also switched that key from `attrString("media_content_id")` to `attr("media_content_id")?.toString()`, so the progress bar still resets correctly between tracks for Kodi (a plain `attrString()` would now just always read null for it, post-fix, since it's never a primitive) as well as for every player that reports it as a plain string.
- Top status bar clock now honors the device's 12/24h setting instead of always rendering 24h, and is centered to the full bar width rather than drifting with the Wi-Fi/battery glyph widths. `ConfigServer` no longer crashes with `EADDRINUSE` on connection save, and retries once on a delay if the initial `:8080` bind fails. An unmapped physical BACK press no longer destroys the launcher activity; saving new connection settings now reconnects HA/Harmony clients and restarts `ConfigServer` in place instead of relying on `Activity.recreate()`, which was unreliable on the HA100's Android 8.1. All three via [PR #3](https://github.com/dckiller51/astrion-custom-dashboard/pull/3), contributed by [@ClemsonJeeper](https://github.com/dckiller51/astrion-custom-dashboard/commits?author=ClemsonJeeper).

## [0.7.0] - 2026-08-14

### Added

- `MediaPlayerCard`: full Mushroom-style rewrite of the `compact` layout — round album-art/icon avatar, name + state row, and a control row below that switches between transport buttons (previous/play-pause/next, plus optional power/shuffle/repeat) and volume controls (mute, -/+ buttons, or a slider) via a small swap button, matching Home Assistant's own Mushroom media-player card behavior. Tap the tile to toggle play/pause; long-press opens the new `MediaPlayerDetailDialog` (see below).
- `MediaPlayerCard`: new `MediaPlayerDetailDialog`, opened by long-pressing the compact tile (same gesture `LightCard`/`CoverCard` use) — large artwork, a live progress bar, the full transport row, a volume slider with mute, and a power toggle when the entity supports it.
- `MediaPlayerCard`: `variant` config option (`"compact"` (default) / `"full"`) replaces the old fixed layout; the `full` variant keeps the dedicated-media-page look (large art, `top_buttons`) but adds a live progress bar (computed from `media_position` + `media_position_updated_at`, advancing every second while playing) and the same feature-gated transport/volume rows as the compact tile.
- `MediaPlayerCard`: `use_media_info` (default true — shows `media_title`/`media_artist`/`app_name` instead of the entity's friendly name/state), `show_volume_level` (appends "⸱ N%" to the state line), `media_controls` (comma list: `on_off,shuffle,previous,play_pause,next,repeat`), and `volume_controls` (comma list: `mute,buttons,set`) config options — every button is checked live against the entity's `supported_features` bitmask, so a control requested in config but not supported by the entity never renders.
- `MdiIcons`: `Play`, `Pause`, `SkipPrevious`, `SkipNext`, `VolumeHigh`, `VolumeOff`, `Repeat`, `Shuffle`, `Cast`, `CastOff` glyphs, replacing the generic Material icons the old media player card used. `Cast`/`CastOff` also become the compact tile's (and full page's) fallback avatar — device on/off — whenever the entity reports no `entity_picture`, instead of guessing a play/pause icon.
- New `media_state_playing`/`paused`/`idle`/`buffering`/`on`/`off` string resources (English and French), used on the state line whenever the entity reports no `media_title`/`media_artist`/`app_name`.
- Dashboard builder (`docs/index.html`): `media_player` cards now have their own dedicated form (previously only the raw-JSON fallback) — variant, name, entity, `use_media_info`/`show_volume_level` checkboxes, per-control checkboxes for `media_controls`/`volume_controls`, and a `top_buttons` JSON field (full variant only) — plus a real preview matching the on-device look, including the swap-button behavior and shuffle/repeat's tinted-not-swapped active state.
- `CoverCard`/`LightCard`: new optional controls, matching Home Assistant's Mushroom cards. Covers can show open/stop/close buttons, a position slider, and a tilt slider (any combination); lights can show a brightness slider, a colour temperature slider, and colour swatches. If more than one is turned on for a card, a small button lets you flip between them. All configurable from the dashboard builder, with a matching preview. Existing dashboards aren't affected unless you turn these on.
- Dashboard builder: the remote preview now lights up the physical buttons that already have a hotkey assigned to them (on the current page or globally), so it's easy to see at a glance what's already mapped.

### Changed

- `MediaPlayerCard`: the compact layout's control row now offers mute and full transport (previous/play/pause/next, optionally shuffle/repeat/power) — the previous compact layout only ever showed a fixed volume up/down pair with no way to control playback.
- Shuffle and repeat only have one glyph each (no separate "active" variant) — `MediaPlayerCard`/`MediaPlayerDetailDialog` tint the button instead of swapping its icon when shuffle is on or repeat isn't `"off"`.
- Dashboard builder: the remote preview is now a proper redrawing of the physical remote instead of a photo, and much closer to true scale — icon/text sizes, how many cards fit on screen before scrolling, and button positions all now match the real device.

### Fixed

- `CoverCard`/`LightCard`: the new sliders' fill bar was centering and shrinking from both sides instead of filling left to right.
- Dashboard builder: the zoomed-in preview rendered everything about 9% smaller than the real device.
- Dashboard builder: some elements in the remote preview (screen, buttons) could end up slightly out of position depending on your browser.
- Dashboard builder: two of the physical media buttons could render slightly past the edge of the remote.

### Removed

- `remote.png` — the static photo the dashboard builder used to overlay the preview onto, now unused: the remote preview is a fully HTML/CSS recreation of the physical device (see *Changed* above).

## [0.6.0] - 2026-08-11

### Added

- Settings: new "Local config server" switch, next to "Wake on motion". `ConfigServer` (the unauthenticated `:8080` admin surface — connection settings, `dashboard.json`, icon uploads, `/builder/`) now defaults to on but can be switched off once a device is fully set up, closing that LAN-reachable surface for good; it's started/stopped live from `MainActivity` with no app restart, and can always be switched back on from this same on-device screen (never from the web page itself, to avoid a lockout). Persisted in `SharedPreferences` alongside the existing motion-wake setting.
- `CoverCard`: `layout` config option (`"default"`, `"horizontal"`, `"vertical"`), matching Home Assistant's Mushroom cover card:
  - `"default"` (new) — icon + name/state row, with the open/stop/close buttons full-width on their own row below.
  - `"horizontal"` — icon + name/state on the left, buttons inline on the right (the card's only layout before this release, kept as-is).
  - `"vertical"` (new) — icon, name, state, and buttons all centered and stacked in one column.
- `CoverCard`: dedicated icons via new `MdiIcons` entries — `WindowShutterClosed`/`WindowShutterOpen` for the main icon (reflects the cover's last known open/closed state, updated live), and `CoverUp`/`CoverDown` for the raise/lower buttons, replacing the earlier generic Material icons (`Blinds`, `KeyboardArrowUp`/`KeyboardArrowDown`).
- `CoverCard`: the raise button now disables (dimmed, non-clickable) once the cover is fully open, and the lower button disables once fully closed — the stop button stays active either way.
- `LightCard`: `layout` config option (`"default"`, `"horizontal"`, `"vertical"`), matching Home Assistant's Mushroom light card — same pattern `CoverCard` got in 0.6.0:
  - `"default"` (new) — icon + name/state row, with a slim brightness bar full-width below it (only drawn while on and dimmable).
  - `"horizontal"` (new) — icon + name/state, single row, no bar.
  - `"vertical"` (new) — icon, name, and state, all centered and stacked in one column.
- `LightCard`: `use_light_color` option — when true and the light reports an `rgb_color`, the icon (and the default layout's brightness bar) tint with that colour instead of the plain amber "on" look.
- `LightCard`: `show_brightness` option (default true) — shows the live brightness as `"N%"` on the state line while on; set false to always show a plain "On" instead.
- `LightCard`: icon now swaps between a filled and an outline lightbulb depending on on/off state (Mushroom's own look), instead of a static tile background swap — new `MdiIcons.LightbulbOn`/`MdiIcons.LightbulbOff` (the latter a slashed bulb, clearer than a plain outline for "off"), same pattern as `WindowShutterOpen`/`Closed`.
- `LightCard`: tap toggles, long-press opens the same brightness/colour detail dialog the bubble-style card used (`LightDetailDialog`, unchanged) — see Removed, below.
- New `light_state_on` / `light_state_off` / `light_brightness_pct` string resources (English and French — "Allumé"/"Éteint" rather than the generic switch-style "Marche"/"Arrêt") so the state line is translated: 0% brightness (or a plain off state) reads as "Off"/"Éteint", anything else reads as its live percentage.
- Dashboard builder (`docs/index.html`): `light` cards now have their own dedicated form (previously grouped in with the generic name/entity/icon-only cards) with a `Layout` picker and the two new checkboxes, plus a real preview for all three layouts driven by a generic example entity (color_temp/xy profile, no real device name or local IP baked into a publicly-shipped file), including the icon colour tint and brightness bar.
- `HaLabels.coverState()` / `assets/ha_labels/*.json`'s new `cover_state` category (open/closed/opening/closing/stopped/unknown, English and French) — used as `CoverCard`'s fallback label for covers that report no `current_position` attribute at all, matching the pattern already used for `VacuumCard`.
- Dashboard builder (`docs/index.html`): `cover` cards now have their own dedicated form (previously grouped in with the generic name/entity/icon-only cards) with a `Layout` picker, plus a real preview for all three layouts driven by an example entity (`cover.volet_chambre_noham`).
- Dashboard builder preview: `scene_grid`/`button_grid` tiles now render their actual configured icon (uploaded to `/sdcard/astrion/icons/` on the remote) as an image, instead of only showing the tile's name — via a new `GET /icons/<filename>` endpoint on `ConfigServer.kt` that serves files back out of that folder (the same one `POST /icons` writes into). Only works when the builder is opened from the remote itself (`/builder/`); the standalone GitHub Pages copy has no device behind it to serve the files from and falls back to the same blank-icon layout the app uses when a file is missing.
- Dashboard builder: every icon field (name/entity cards, `cover`, and `scene_grid`/`button_grid` items) now has a "Choose…" button and a live thumbnail alongside the path text field, opening a picker that lists every icon already uploaded to the device as clickable thumbnails (new `GET /icons-list` endpoint on `ConfigServer.kt`) — typing the `/sdcard/astrion/icons/xxx.png` path by hand is still possible but no longer the only way. Same "only works when served by the device itself" caveat as the preview thumbnails above; the picker explains that inline instead of doing nothing when it can't reach `/icons-list`.
- `CoverCard`: new `CoverDetailDialog`, opened by long-pressing the card's icon/name area (same gesture `LightCard` uses) — a vertical position pill you can drag or tap to set an exact 0–100% position, plus quick-preset chips (Closed/25%/50%/75%/Open) for jumping straight to a common position. Uses `cover.set_cover_position` (or `open_cover`/`close_cover` at the 0%/100% ends).
- `LightCard`: the `"default"` layout's brightness bar is now a real slider instead of a read-only indicator — drag or tap it to raise/lower brightness directly from the card, no need to open `LightDetailDialog` first. Made a bit thicker (20dp) to stay easy to grab on a touch panel.

### Removed

- `BubbleLightCard` (`bubble_light` card type) — its slider-pill interaction and long-press detail popup are superseded by `LightCard`'s new layouts (the `"default"` layout's brightness bar is itself now draggable, see Added above) plus its existing long-press into `LightDetailDialog`. Existing `bubble_light` cards in a saved `dashboard.json` should be changed to `"type": "light"` (same `entity_id`/`name` options still apply).
- Dashboard builder: the separate "Light — dimmable (bubble_light)" entry — the builder's `light` entry now covers both use cases.

### Fixed

- `CoverCard`'s status label wasn't translated at all — it was a hardcoded `"$position% open"` English string. It now reads "Open"/"Closed" (translated) at 100%/0% position, and a translated "N% open" in between — new `cover_open`, `cover_closed`, `cover_position_open` string resources (English and French).
- Dashboard builder preview: `scene_grid`/`button_grid` tiles used a generic fixed-size placeholder (`preview-tile`) that didn't match the real on-device sizing at all. Tile height now matches the real dp values (74dp/58dp icon vs. text-only for `scene_grid`, 68dp/48dp per button for `button_grid`), and `scene_grid` tiles use each scene's configured color (with the same luminance-based text-color logic as `SceneGridCard.kt`) instead of a flat gray background.
- Dashboard builder preview: `scene_grid`/`button_grid` real-icon preview (see Added, above) never actually worked — `docs/js/cards.js`'s `iconUrl()` correctly pointed at `/icons/<filename>`, but `ConfigServer.kt` only ever wired up `POST /icons` (upload); the matching `GET /icons/<filename>` to serve an uploaded icon back out didn't exist, so every icon request 404'd and silently fell back to the blank-icon look. Added the missing route.
- `Dashboard`: jumping to a page (menu-card `navigateToPage`, a physical hotkey, or a page-indicator dot) used `pagerState.animateScrollToPage()`, which visibly scrolls through every page in between the current one and the target — on the HA100's weak CPU this showed up as the previous page flashing up right before the intended one landed. Switched to `scrollToPage()` (instant, no animation) for all three, so a direct jump lands directly; swipe gestures between adjacent pages are unaffected.

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
