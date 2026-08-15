# AGENTS.md

Guidance for AI assistants working on this codebase. Read this before doing anything.

## What This Is

Custom Android home-screen launcher for the **Sanytron Astrion HA100** — a wall-mounted smart-home remote (480x800 portrait, MT6580 SoC, 1GB RAM, Android 8.1). Replaces the stock "HaRemote" launcher with a swipeable dashboard that controls a Home Assistant installation. Optional Logitech Harmony Hub integration for IR devices. Configured entirely via a JSON file on `/sdcard/astrion/dashboard.json` — no credentials are compiled in.

## Tech Stack

- **Kotlin** (JVM 17), **Jetpack Compose** (Material 3, BOM 2024.09.02), single-activity
- **Gradle** Kotlin DSL, AGP 8.5.2, Kotlin 2.2.10
- **kotlinx-serialization** (JSON config), **kotlinx-coroutines** (async)
- **OkHttp** (WebSocket clients for HA + Harmony), **NanoHTTPD 2.3.1** (embedded web server on :8080)
- **Vanilla HTML/CSS/JS** for the bundled dashboard editor (served from `assets/docs/`, also published to GitHub Pages)
- minSdk 26, targetSdk 34, compileSdk 34, versionName 0.7.0

## Build & Install

```bash
./gradlew assembleDebug                                          # builds app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk         # install (may need: adb uninstall com.custom.astrion first for signature conflicts)
adb shell am force-stop com.aiks.HaRemote && adb shell am force-stop com.custom.astrion && adb shell am start -n com.custom.astrion/.MainActivity
```

No `secrets.properties` or pre-build config needed. Credentials are entered post-install via the local web configurator at `http://<device-ip>:8080`.

There is no test suite configured. Verify changes by building and installing on the device.

### IMPORTANT: Always rebuild, install, and restart after making changes
After any code or asset change, always run the full cycle — `./gradlew assembleDebug`, `adb install -r`, then force-stop both `com.aiks.HaRemote` and `com.custom.astrion` and restart the activity (the one-liner above). Do not skip steps. The user verifies changes on the device, so an uncommitted change that was never installed looks like a bug.

### Git commit log format
When asked for a commit log, generate it to match the repo's existing style (run `git log -5 --format="%B%n---"` to see examples). Format:

```
<type>(<scope>): <subject>

<optional body — bullet points or short paragraphs explaining what and why>
```

- `<type>` — `feat`, `fix`, `refactor`, `chore`, `docs`, etc.
- `<scope>` — the affected area: `cards`, `ui`, `ha`, `web`, `editor`, `harmony`, etc.
- `<subject>` — imperative, lowercase, no trailing period.
- Body (when the change is non-trivial): one blank line after the subject, then concise bullet points covering the key changes, decisions, and any side-effect fixes. **Keep it terse.** Omit context the subject already conveys; one short line per bullet, no preamble, no summary restating the subject. Aim for the minimum text that conveys the *what* and *why* — if a bullet reads like a sentence, trim it to a phrase. Mirror the tone of recent commits but skew toward the shorter ones (single bullet to a few lines).

Prefer a single combined commit log when the changes form one feature; split into multiple logs only when the user asks for separate logical commits.

## Hardware / Device

The HA100 is connected via adb. Verify with `adb devices` and `adb shell getprop ro.product.model` (returns `HA100`). Key characteristics that affect development decisions:

- **Android 8.1** (API 26) — old APIs, deprecated methods still required
- **1GB RAM, weak MT6580 SoC** — performance matters; avoid heavy work on main thread
- **Physical hardware keys** — keycodes extracted from stock `reference/device_key_code.json`, handled via `dispatchKeyEvent` (no vendor SDK)
- **Fullscreen kiosk mode** — immersive sticky, no system bars visible
- **HOME launcher** — registered with `android.intent.category.HOME` in the manifest; this has lifecycle implications (see Gotchas below)

## Project Structure

```
app/src/main/java/com/custom/astrion/
  AstrionApp.kt          — Application: registers all card types in CardRegistry
  MainActivity.kt        — Single activity: owns HaClient, HarmonyHubRegistry, ConfigServer, HardwareKeyRouter, VoiceSession
  cards/
    Card.kt              — CardConfig, CardContext, CardRenderer interface, CardRegistry
    impl/                — 18 card implementations (Light, Climate, MediaPlayer, Vacuum, etc.)
  config/                — AppConfig, DashboardConfig (compiled-in fallback), DashboardLoader, RemoteSettings, VoiceConfig
  ha/                    — HaClient (WebSocket), HaModels, HaLabels (state translations)
  harmony/               — HarmonyHubClient, HarmonyHubDiscovery, HarmonyHubRegistry
  input/                 — HardwareKeys enum, HardwareKeyRouter
  ui/                    — Dashboard (pager + settings overlay), SettingsMenu, Topstatusbar, MdiIcons, Theme.kt (ThemeColors, LocalTheme)
  update/                — UpdateChecker (GitHub Releases OTA)
  voice/                 — VoiceSession (capture + stream), VoiceOverlay (UI), MicCapture, MicProbe (adb diagnostic)
  web/                   — Configserver.kt (NanoHTTPD on :8080)
app/src/main/assets/
  ha_labels/             — HA state value translations (en.json, fr.json)
  docs/                  — Bundled dashboard editor (= GitHub Pages site)
homeassistant/
  custom_components/
    astrion_voice/       — HA custom component: receives the PCM stream, runs it through Assist, optionally routes per-page
reference/               — Extracted from stock HaRemote.apk (device_key_code.json, etc.)
scripts/                 — adb helper scripts (grab_screens.sh, record_screen.sh)
```

## Key Architecture

- **Card plugin system**: `CardRenderer` is a `@Composable` interface. Each card type is an independent class registered once in `AstrionApp.onCreate()`. `CardRegistry.get(type)` does dynamic dispatch. Adding a card = one new class + one registration line.
- **JSON-driven config**: All layout (pages, cards, hotkeys, IR activities, theme) lives in `/sdcard/astrion/dashboard.json`, parsed by `DashboardLoader` into `AppConfig` data classes via kotlinx.serialization. Free-form per-card `options` maps flow to each renderer.
- **Single activity**: `MainActivity` owns everything — HA client, Harmony registry, ConfigServer, key router. Renders `Dashboard` (a `HorizontalPager` of pages + a swipe-down `SettingsOverlay`).
- **Theme system**: 12 semantic color tokens (`background`, `cardSurface`, `insetSurface`, `controlBackground`, `primaryText`, `mutedText`, `iconTint`, `accent`, `accentSecondary`, `amber`, `danger`, `success`) stored in `AppConfig.theme` (`ThemeConfig`). Resolved to Compose `Color`s via `ThemeConfig.toColors()` and provided via `LocalTheme` CompositionLocal (`ui/Theme.kt`). All UI reads `LocalTheme.current.<token>` (shell) or `ctx.theme.<token>` (cards). Defaults match the original hardcoded palette, so an empty `theme` block renders identically to before. Per-card color overrides (`SwitchCard.on_color`, `SceneGridCard` per-scene `color`, `LightCard` `rgb_color`) take precedence over the theme.
- **ConfigServer**: NanoHTTPD on :8080. Unauthenticated (trusted home LAN assumption). Serves the config form, dashboard editor, icon upload/download, Harmony config fetch, and OTA updates.
- **Layered hotkey system**: Global hotkeys merged with current page's hotkeys (page overrides global per-key) on page change. Short-press vs. long-press (1500ms) via `Handler`-posted delayed runnable.
- **Connection coalescing in HaClient**: Entity state updates batched and published at most every 120ms so chatty sensors don't overwhelm the weak SoC's UI thread.
- **VOICE key**: The hardware VOICE key is wired by default to `VoiceSession` (no `hotkeys` binding needed) — press to talk, captures 16 kHz mono PCM16 from the mic and streams it chunked to a configurable HA endpoint (`voice.path`, default `/api/hap_remote/audio`). The remote makes no routing decision; the server (the `astrion_voice` HA custom component) decides what to do with the audio — runs it through an Assist pipeline (STT + intent, no wake word, no TTS) and optionally routes the transcript to an HA service per page (`contexts:` in `configuration.yaml`, matched against the `X-Astrion-Page` header the remote sends). `VoiceOverlay` shows listening/thinking/done/error state and any configured suggestion prompts. Press-to-start, silence-to-stop (the HA100's VOICE key emits an instant press+release rather than a hold, so hold-to-talk isn't available); a second press cancels. The key is edge-triggered — `HardwareKeyRouter` marks it non-repeatable so holding it doesn't toggle capture on and off.

## Debugging On The Device

### Restart the app after installing
```bash
adb shell am force-stop com.aiks.HaRemote && adb shell am force-stop com.custom.astrion && adb shell am start -n com.custom.astrion/.MainActivity
```
Always force-stop `com.aiks.HaRemote` (stock launcher) too — see the HaRemote overlay gotcha below.

### Check if ConfigServer is listening on 8080
```bash
adb shell "cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep -i 1F90"
```
- State `0A` = LISTEN (good), `06` = TIME_WAIT (closed), `01` = ESTABLISHED (active connection)

### Get the app PID
```bash
adb shell "ps -A 2>/dev/null | grep astrion || ps | grep astrion"
```

### View logs (filter by PID or tag)
```bash
adb logcat -d -t 500 --pid=<PID>                                # by PID
adb logcat -d | grep -iE "ConfigServer|HaClient|MainActivity"   # by tag
```

### Clear logs before reproducing
```bash
adb logcat -c
```

### Key log tags
- `ConfigServer` — web server start/stop/errors
- `MainActivity` — activity lifecycle, reconnectWithNewSettings
- `HaClient` — HA WebSocket connection, auth, ping/pong
- `HarmonyHubRegistry` / `HarmonyHubClient` — Harmony hub connections
- `AstrionKeys` — physical key presses (keyCode + name)
- `DashboardLoader` — config file loading
- `MotionWake` — motion-wake setup, triggers (with consecutive counter), warmup/subfloor drops, wakelock acquire/skip/release, 5-min ambient-noise summary
- `ScreenTimeout` — `applyScreenTimeout` calls (pref vs current vs canWrite) and `ACTION_SCREEN_ON`/`ACTION_SCREEN_OFF` transitions with the live system timeout value

## Gotchas

### Do NOT use `Activity.recreate()` on this HOME launcher
`recreate()` silently fails on Android 8.1 HOME launcher activities — the old instance is destroyed but the new one never starts, leaving the app in a broken state (server stopped, no UI). Use in-place reconnection instead (see `reconnectWithNewSettings()` in `MainActivity.kt`).

### BACK key must be suppressed
The physical BACK key (keyCode 4) is unmapped in the default config. If it falls through to `super.dispatchKeyEvent()`, it triggers `onBackPressed()` → `finish()`, destroying the launcher. `onBackPressed()` is overridden to do nothing.

### ConfigServer lifecycle races
NanoHTTPD's `stop()` closes the server socket and joins the accept thread. If you call `stop()` then immediately `start()` on a new instance, the old socket may still be in TIME_WAIT. NanoHTTPD sets `SO_REUSEADDR` which handles TIME_WAIT but not active listening sockets. Always ensure `stop()` completes before starting a new instance.

### ConfigServer response must complete before stopping
The `handleSaveConnection` endpoint calls `onConnectionSaved()` which stops the server. If `onConnectionSaved()` runs synchronously before the HTTP response is sent, the browser gets an empty/broken response. The fix: defer `onConnectionSaved()` via `Handler.postDelayed(500ms)` so the redirect response is sent first.

### NanoHTTPD `stop()` can block
`NanoHTTPD.stop()` calls `thread.join()` on the accept thread and `closeAll()` on all client handler threads. On the weak MT6580, this can take a few hundred milliseconds. Never call `stop()` on the main thread in a time-critical path without accounting for this.

### HaClient WebSocket ping timeouts
The HA WebSocket connection uses OkHttp's 20-second ping interval. If HA doesn't respond to pings, you'll see `SocketTimeoutException: sent ping but didn't receive pong within 20000ms`. This is expected when the HA server is unreachable; `HaClient` auto-reconnects with a 3-second delay.

### HaRemote system overlay intercepts gestures
The stock `com.aiks.HaRemote` launcher runs a `ScreenSaverService` with a system overlay window (prefixed `Sys2038:` in logcat) that sits on top of our app even when we're the active home launcher. This overlay intercepts swipe-down gestures, showing HaRemote's own settings dropdown instead of ours. Always force-stop HaRemote after restarting our app: `adb shell am force-stop com.aiks.HaRemote`.

### Compose `detectVerticalDragGestures` + `verticalScroll` conflict
Putting `pointerInput { detectVerticalDragGestures { ... } }` and `verticalScroll()` on the same Compose node does not work — the scroll consumer eats all vertical drag events before the drag detector fires. To detect a swipe gesture on scrollable content, either put the gesture detector on a separate overlay node (e.g., a bottom strip in a `Box` above the scrollable `Column`), or use `nestedScroll` to react to leftover (unconsumed) scroll.

### Immersive sticky mode and bottom-edge swipes
`SYSTEM_UI_FLAG_IMMERSIVE_STICKY` causes Android to intercept swipes from the very bottom edge to transiently reveal the hidden navigation bar. Compose gesture detectors never see these events. Place swipe-up gesture targets slightly above the bottom edge (e.g., a 50dp strip), not at the extreme bottom.

### Accelerometer resume glitch causes spurious motion-wake
The HA100's accelerometer (`wakeUp=false`) emits a single garbage sample (|a| ≈ 1 m/s², physically impossible for a stationary device on Earth where gravity guarantees ≥ 9.8) when it resumes from low-power state around `ACTION_SCREEN_OFF`. With a naive single-sample `|mag - lastMag| > threshold` check, this glitch produced delta ≈ 8.8 and re-woke the screen within seconds of every 30s timeout — the panel appeared to "stay on" because it cycled off→on repeatedly. The motion detector in `MainActivity.kt` now requires three consecutive above-threshold samples (`MOTION_CONSECUTIVE_N`), drops all samples for 1.5s after `ACTION_SCREEN_OFF` (`SCREEN_OFF_WARMUP_MS`), and rejects any sample with `|a| < 5 m/s²` (`MAGNITUDE_SANITY_FLOOR`). Do NOT regress to a single-sample trigger. The `MotionWake` and `ScreenTimeout` logcat tags diagnose this class of issue — check those first if the screen misbehaves.

## ConfigServer Bug History (Fixed)

The ConfigServer on :8080 would crash and stop listening. Three root causes were identified and fixed:

1. **BACK key destroying the launcher** — Unmapped BACK key fell through to `onBackPressed()` → `finish()`. Android immediately restarted the launcher, but the new `onCreate()` raced ahead of the old `onDestroy()`, causing `EADDRINUSE` on port 8080. Fixed by overriding `onBackPressed()` to do nothing.

2. **`recreate()` silently failing** — Saving connection settings called `recreate()`, which on Android 8.1 HOME launchers destroys the old activity but never creates the new one. The server was stopped by the old instance and never restarted. Fixed by replacing `recreate()` with `reconnectWithNewSettings()` which reconnects everything in-place within the same activity.

3. **HTTP response lost on save** — `onConnectionSaved()` stopped the server before the redirect response was sent to the browser, resulting in an empty page. Fixed by deferring `onConnectionSaved()` via `Handler.postDelayed(500ms)`.

A retry-with-backoff was also added to `startConfigServer()` as a safety net for transient bind failures.

## ConfigServer endpoints (current)

- `GET /` — connection form (HA URL/token, Harmony hubs, icon upload, OTA updates)
- `GET /builder/` — dashboard editor (bundled from `assets/docs/`, same as GitHub Pages)
- `GET /ha-states` — live HA entity snapshot (`{connected, states: {entity_id: {state, friendly_name, attributes}}}`) consumed by the editor preview's `liveMock()` to render cards with real data instead of static mocks
- `GET /camera-snapshot?entity=<id>` — proxies one still frame for a `camera.*` entity through the device's HA token as `image/jpeg` (the browser has no token). Backs the `camera` card's editor preview `<img>`
- `GET /dashboard.json` / `POST /dashboard.json` — download / replace the config (live-reload)
- `POST /icons` / `GET /icons-list` / `GET /icons/<file>` — icon upload/list/serve
- `GET /harmony-hubs` / `GET /harmony-config` / `GET /harmony-discover` — Harmony hub management
- `GET /check-update` / `POST /install-update` — GitHub Releases OTA

## PlexCard config

`cards/impl/PlexCard.kt` is a native card that talks straight to the Plex server's HTTP API for browsing (On Deck / Recently Added poster rows) — bypasses HA entirely for that part. Options:

```json
{ "type": "plex", "options": {
    "host": "http://<plex-server-ip>:32400",
    "token": "<X-Plex-Token>",
    "media_entity": "media_player.<cast-or-adb-entity-for-the-tv>",
    "source": "Plex",
    "play_entity": "media_player.<plex-integration-client-entity>"
} }
```

- `media_entity` + `source` — fallback tap behavior: `media_player.select_source` just opens the app, no deep link.
- `play_entity` — real playback: `media_player.play_media` with `plex://preplay/?metadataKey=<item>&server=<machineIdentifier>`, jumping straight to that title. Requires the HA `plex` integration to see the target Android TV's Plex app as a registered companion client — it then shows up as its own `media_player.*` entity (e.g. `media_player.<device>_plex_on_<device>`), separate from any Cast or ADB entity for the same physical device.
- `docs/js/cards.js` (mirrored in `app/src/main/assets/docs/js/cards.js`) now has a dedicated form for `type: "plex"` — the 5 fields above, matching `PlexCard.kt`'s `config.string(...)` keys 1:1. `preview.js`'s builder preview for this card type fetches On Deck / Recently Added directly from the given `host`/`token` in the browser (no device-side proxy needed, unlike `camera` — the token already lives in the card's own options) and falls back to an inline error message on CORS/network failure.

## Dashboard editor preview architecture

The editor (`assets/docs/` + `docs/` mirror) uses a `liveMock(entityId, baseMock)` helper that overlays live HA entity attributes (from `/ha-states`) onto static `*_MOCK` objects. Key behaviours:

- **Null-safe merge**: HA sends `null` for attributes a device doesn't currently have (e.g. `temperature` on a `heat_cool` climate). `liveMock()` skips nulls so they don't clobber the mock's sane defaults (otherwise the preview renders "null°").
- **Range mode detection**: `heat_cool` climate entities have `temperature: null` with `target_temp_high`/`target_temp_low` set. The preview checks the live entity's raw attributes directly (not the merged mock) to detect this, since the null-safe merge would mask it.
- **Entity autocomplete**: Entity ID fields in the card editor use `attachEntityAutocomplete()` — a singleton `position: fixed` dropdown with capture-phase scroll listeners (the card-edit modal scrolls internally; `window` scroll never fires). Domain-filtered per card type.
- **Graceful fallback**: When `haStates` is null (GitHub Pages, HA offline), all live-data features silently fall back to the static mocks + `prettyEntityName()`.
- **Theme controls**: A "Theme & Colors" left-pane section (`js/theme.js`) exposes the 12 theme tokens as swatch + hex field + per-token reset (↺). The preview reflects changes live via CSS variables on `.remote-screen` (`--bg`, `--card`, `--inset`, `--control`, `--text`, `--muted`, `--icon`, `--accent`, `--accent2`, `--amber`, `--danger`, `--success`), consumed by the preview card styles in `styles.css`. The same color picker control (`colorFieldHtml()`) is reused for per-card color overrides in `cards.js` (SwitchCard `on_color`, SceneGridCard per-scene `color`); it's ARGB-aware — the swatch shows the RGB part and preserves the alpha prefix.

### IMPORTANT: Keep the editor mirror in sync
The dashboard editor lives in two byte-identical locations: `docs/` (GitHub Pages source) and `app/src/main/assets/docs/` (bundled in the APK). After editing any editor file (HTML, CSS, JS), always copy it to the mirror before building: `cp docs/<file> app/src/main/assets/docs/<file>`. Verify with `diff -rq docs app/src/main/assets/docs`. A change made to only one side means the on-device editor and the published GitHub Pages editor diverge — the user sees one in the browser and a different one on the device.

## Service-call latency debugging

A temporary debug overlay was used to diagnose perceived light-toggle lag. The approach: record `System.currentTimeMillis()` in `callService()` when a service call is dispatched, and again in `onEvent()` when the matching `state_changed` event arrives, then display the delta on-screen. This isolates whether the delay is in dispatch (remote → HA) or round-trip (HA → state_changed → coalescing publisher → Compose). The overlay was removed after diagnosis; see git history for the implementation pattern if needed again.
