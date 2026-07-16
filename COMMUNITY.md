# A fully custom, native dashboard app for the Sanytron/Astrion HA100 remote

*A from-scratch Android app that replaces the stock HaRemote dashboard with a fast,
fully configurable native UI — no cloud, no vendor lock-in, no laggy WebView.*

---

## Why

The HA100 is a lovely bit of hardware (480×800 touchscreen + real buttons) held back
by its software: the stock app only renders 11 hardcoded card types from your Lovelace
config and drops everything else, and running a real HA dashboard through Fully Kiosk
or the Companion app is far too slow on the 2015-era MT6580 SoC with 1 GB RAM.

So this replaces the *rendering* layer entirely, while speaking to Home Assistant
exactly the same way the stock app does.

## How it talks to Home Assistant

One plain **WebSocket to `ws://<ha-host>:8123/api/websocket`** — the standard HA API,
nothing custom:

```
┌──────────────┐      auth (long-lived token)      ┌────────────────┐
│  HA100 app   │ ────────────────────────────────► │ Home Assistant │
│  (native,    │ ◄──────────────────────────────── │                │
│   Compose)   │      auth_ok                      └────────────────┘
│              │
│              │  get_states            → seeds an in-memory entity map
│              │  subscribe_events      → state_changed keeps it live
│              │  call_service          → every button/slider/tap
│              │  weather.get_forecasts → forecast card (return_response)
│              │  media_player/browse_media → media library dialog
│              │  ping/pong             → 30s heartbeat + auto-reconnect
└──────────────┘
```

- The entity map is a Kotlin `StateFlow`; every card observes it, so any state change
  in HA repaints only the affected cards, instantly.
- Album art / camera-style images are fetched over plain HTTP with the same token.
- The optional Plex card talks **directly to the Plex server's HTTP API** (posters,
  On Deck, Recently Added) and starts playback by deep-linking the TV's Plex app via
  HA's `remote.turn_on` — the app itself never transcodes anything.

## Why it's fast on 1 GB / MT6580

| Technique | Effect |
|---|---|
| Native Jetpack Compose, no WebView | no JS engine, no DOM, no card_mod CSS |
| One WebSocket, one entity map | no polling, no REST chatter |
| Plain `Column` + `verticalScroll` per page | no heavy list machinery for ~10 cards |
| `LazyRow` only where there are many images (Plex posters) | offscreen posters never decode |
| Posters requested pre-scaled from the server (~140×210) | tiny decode, tiny memory |
| "Blur" = downscale-to-32px + upscale | real blur APIs don't exist on Android 8.1 |
| Icons: vector Material icons + user PNGs from /sdcard | no icon fonts, no network icons |
| Config = one small JSON file read at launch/resume | no YAML parsing, no HA dashboard fetch |

Cold start to fully rendered is ~1–2 s; card taps fire a service call in single-digit ms.

## The card system

Cards are tiny Kotlin classes registered in an open registry — adding a new card type
is one class + one registration line. Current set:

| Card type | What it does | HA services used |
|---|---|---|
| `clock_weather` | Device-clock time/date + current conditions + N-day forecast with min/max gradient bars; optional thin line below the date showing today's calendar event (only shown if the linked calendar's next/current event falls today) | `weather.get_forecasts` |
| `light` | Simple light tile: icon + name/state, tap to toggle | `light.toggle` |
| `bubble_light` | Bubble-card-style light pill: tap-to-toggle icon, drag anywhere to dim, fill tinted with the light's live `rgb_color`; **long-press opens a colour/brightness popup** (swatches + colour-temp presets, shown only if the light supports them) | `light.turn_on/off` (`brightness_pct`, `rgb_color`, `color_temp_kelvin`) |
| `picture_elements` | Floorplan image from `/sdcard/astrion/floorplan.png` with tappable light icons at % positions (glow when on); optional `radar` overlay plotting mmWave presence dots via an affine transform; optional `vacuum` overlay showing a robot-vacuum glyph at its current room (or a docked cradle glyph), rocking gently while cleaning — tap it to open the same controls as the `vacuum` card in a popup | `light.toggle`, `light.turn_off` |
| `climate` | Setpoint steppers (respects the entity's real `target_temp_step` + min/max), HVAC mode chips, fan mode chips, dedicated off button | `climate.set_temperature`, `set_hvac_mode`, `set_fan_mode`, `turn_off` |
| `cover` | Mushroom-horizontal tile: icon + name/state left, open/stop/close right | `cover.open/stop/close_cover` |
| `fan` | Toggle tile + speed slider | `fan.turn_on/off`, `fan.set_percentage` |
| `switch` | Toggle tile with icon + configurable on-colour (e.g. dark red for a heater) | `switch.toggle` |
| `media_player` (compact) | One row: round art, title/artist, vol−/vol+; tap body = play/pause; blurred-art background | `media_player.*` |
| `media_player` (full) | Big art, centred now-playing, vol−/prev/play/next/vol+, configurable action buttons at the top (e.g. Group/Ungroup scripts) | `media_player.*`, any script |
| `speaker_group` | Sonos-style speaker list: tick = joined to the master player (join/unjoin fires immediately), live volume bar + mute/vol buttons per speaker | `media_player.join/unjoin`, `volume_set`, `volume_mute` |
| `source_select` | Dropdown source picker for a media player | `media_player.select_source` |
| `scene_grid` | Scene/script tiles — grid or horizontally swipeable row, per-tile colours, can be **pinned to the bottom** of a page | `scene.turn_on` / `script.turn_on` (by domain) |
| `button_grid` | Generic grid of buttons, each firing any service, with optional PNG icons from /sdcard | anything |
| `plex` | Native Plex browser: On Deck + Recently Added poster rows, tap → plays on the TV | Plex HTTP API + `remote.turn_on` (deep link) |
| `tv_remote` | On-screen D-pad/transport remote with a configurable command map | `remote.send_command` |
| `vacuum` | Robot-vacuum map (rotated to match the floorplan), start/pause/dock/locate controls, cleaning-mode dropdown, per-room segment-clean buttons. The same options map doubles as the `picture_elements` floorplan's `vacuum` overlay | `vacuum.*`, `vacuum.send_command` (`app_segment_clean`) |
| `monitor` | Read-only sensor list with units | none (read-only) |
| `row` | Lays any two+ cards side by side | – |

## Pages & navigation

The UI is a horizontal **pager** with dot indicators — swipe between pages, tap a dot,
or press a physical shortcut button. Example layout:

```
   Lights  ◄──swipe──►  Main  ◄──swipe──►  Media  ◄──swipe──►  Climate
   14 light sliders     clock/weather      full player          aircon + fan modes
   + pinned scene row   floorplan          group/ungroup        heater switch
                        mini player        playlist buttons     covers
                                           Plex browser
```

## Physical buttons

The HA100's buttons arrive as ordinary Android key events (keycode map extracted from
the stock firmware), so the app intercepts them in `dispatchKeyEvent` — **before** the
OS — and routes them through a config-defined table. Every button supports a **tap**
action and an optional **long-press (1.5 s)** action; keys *without* a long-press
binding keep Android's native auto-repeat (hold-to-scroll / hold-to-ramp).

| Button | Tap | Hold (1.5 s) |
|---|---|---|
| D-pad ↑↓←→ | TV `DPAD_*` (auto-repeats while held) | – |
| OK | TV `DPAD_CENTER` | `script.long_center` |
| Back / Home / Power | TV `BACK` / `HOME` / `POWER` | – |
| Vol ± | speaker `volume_up/down` (auto-repeats) | – |
| Mute | TV `HOME` | – |
| CH ▲ / CH ▼ | brightness up/down scripts | open / close blinds scripts |
| Light | → Lights page | `script.long_lights` |
| Curtain | → Main page | `script.long_curtain` |
| Music | → Media page | `script.long_music` |
| Aircon | → Climate page | `script.long_aircon` |
| Red / Green / Blue / Yellow | launch Netflix / Plex / ABC / VLC on the TV | `script.long_red` … `script.long_yellow` |

App launches use `media_player.play_media` with `media_content_type: app` against the
Android-TV media player; TV keys use `remote.send_command` against the Android-TV
remote entity. The `script.long_*` targets are just HA scripts — put anything in them.

## User configuration — no rebuild, ever

Everything above is driven by **one JSON file on shared storage**:

```
/sdcard/astrion/dashboard.json      the whole layout + button map
/sdcard/astrion/floorplan.png       your floorplan render
/sdcard/astrion/icons/*.png         custom button icons
```

- On first launch the app **writes its built-in default config out** to that file, so
  there is always something to edit.
- The file is **re-read every time the app returns to the foreground** — edit it with
  `adb push`, or any on-device file manager, then reopen the app. No rebuild, no
  reinstall.
- If the JSON is broken, the app falls back to its compiled-in defaults and shows a
  small banner saying why — it never crashes over config.

Schema sketch:

```json
{
  "startPage": 1,
  "pages": [
    { "name": "Lights", "cards": [
      { "type": "bubble_light", "options": { "entity_id": "light.living_room", "name": "Living Room" } },
      { "type": "scene_grid",   "options": { "layout": "row", "pin": "bottom",
          "scenes": [ { "entity_id": "scene.movie", "name": "Movie", "color": "#663F51B5" } ] } }
    ] }
  ],
  "hotkeys":     [ { "key": "LIGHT", "page": "Lights" },
                   { "key": "UP", "service": "remote.send_command",
                     "entityId": "remote.tv", "data": { "command": "DPAD_UP" } } ],
  "longHotkeys": [ { "key": "PAGE_UP", "service": "script.open_blinds" } ]
}
```

Key names for `hotkeys`/`longHotkeys`: `UP DOWN LEFT RIGHT CENTER, PAGE_UP PAGE_DOWN,
VOLUME_UP VOLUME_DOWN MUTE, BACK HOME POWER VOICE, LIGHT CURTAIN SCENE AC,
CUSTOM_1..CUSTOM_4` (the colour row).

## Coexisting with the stock app

The stock HaRemote app stays installed as the home/launcher app (the device firmware
expects it). A button mapped in **Key Mapper** (or any launcher shortcut) opens this
app on demand — both live side by side.

## Stack

Kotlin + Jetpack Compose (Material 3), OkHttp WebSocket, kotlinx.serialization.
minSdk 26 / targetSdk 34, one activity, zero native code, ~20 MB debug APK.
