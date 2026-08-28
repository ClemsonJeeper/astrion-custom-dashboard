# Voice

This application supports two independent hotkey actions, both built on the
same live mic-streaming plumbing (16 kHz mono PCM16, chunked - audio leaves the
remote while you're still talking, not after):

- **Voice Assist** (`action: "voice"`) — press-to-talk into Home Assistant's
  Assist pipeline. Can be bound to a **short press or a long press**.
- **Siri passthrough** (`action: "voice_siri"`) — streams straight to an Apple
  TV's Siri, bypassing Assist entirely. **Long press only** - see
  [why](#why-siri-passthrough-is-long-press-only) below.

Both are configured the same two ways: through the [dashboard
editor](https://dckiller51.github.io/astrion-custom-dashboard/)'s hotkey
Action dropdown (pick **Voice**, then the "Voice action" it opens), or by
hand-editing `dashboard.json`.

## Voice Assist

```json
{ "key": "VOICE", "action": "voice" }
```

Requires the `astrion_voice` Home Assistant component in this repo
(`homeassistant/custom_components/astrion_voice`). Copy that folder into your
HA config's `custom_components/`, restart HA, and optionally configure it in
`configuration.yaml`:

```yaml
astrion_voice:
  pipeline: Vortex Voice   # optional: which Assist pipeline to use; omit = your preferred one
  contexts:                # optional: route a transcript to a service instead of answering it
    "Shield TV":
      service: script.shield_tv_search
      extract: "(?:search|find)\\s*(?:for)?\\s*:?\\s*(.+)"
```

See the component's own docstring (top of `__init__.py`) for the full
`contexts:` behavior and response shape.

Optional layout-level tuning in `dashboard.json`'s top-level `voice` block:
`path`, `max_ms`, `silence_ms`, `no_speech_ms`, `suggestions` (see
`VoiceConfig` in `AppConfig.kt`). None of this is required for a working
setup — defaults are sane.

## Siri Passthrough

You can talk directly into your HA100 just like your Siri remote.

The capture starts the instant the key goes down and stops the instant it's
released — matching how a real Siri remote works. A short press has no release
to signal "done talking," so it can't drive this; that's specifically why it's
restricted to `longHotkeys`, and why the editor auto-switches "Press type" to
Long press the moment you pick Siri passthrough.

```json
{ "key": "VOICE", "action": "voice_siri" }
```

bound under `longHotkeys` (or a page's `longHotkeys`), never `hotkeys`.

This does **not** use the `astrion_voice` component above — it needs a
separate project, not bundled in this repo:

**[marcusadolfsson/appletv-siri-voice](https://github.com/marcusadolfsson/appletv-siri-voice)**

That project provides both the Home Assistant integration and the HomeKit
bridge add-on that actually talks to the Apple TV. Follow its own README to
install and pair it before setting this up here. Once paired, add the target
Apple TV to `dashboard.json`'s top-level `voice` block:

```json
"voice": {
  "siri_target": "#######"
}
```

The dashboard editor's Siri passthrough picker fills this in for you from the
bridge's `sensor.apple_tv_siri_bridge_apple_tvs_found` entity, once Home
Assistant is connected — no need to look up the id by hand.
