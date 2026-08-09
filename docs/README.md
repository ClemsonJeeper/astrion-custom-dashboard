# Dashboard Editor

A single-file, static HTML tool for building `dashboard.json` visually — no hand-written JSON required. Matches the exact schema the [Astrion Custom](../README.md) app reads.

**Live version**: [Online Dashboard Editor](https://dckiller51.github.io/astrion-custom-dashboard/)

No install, no build step — open the link (or `index.html` locally in any browser) and start building.

## What it does

- **Pages**: add, rename, delete, and pick which one opens on launch (`startPage`).
- **Cards**: add cards to a page through per-type forms (light, switch, cover, fan, climate, source selector, button/scene grids, Apple TV / TV remotes...), edit an existing card by clicking the ✎ icon in the preview, delete with ✕.
- **Hotkeys**: bind physical remote buttons either globally or per page, to a page-navigation, a Home Assistant service call, or a direct Harmony IR command/activity — listed with edit/delete, same as cards.
- **Import**: paste an existing `dashboard.json` to load and continue editing it, instead of starting from scratch.
- **Output**: the JSON updates live as you build; copy it or download `dashboard.json` directly.

Once you have your file, upload it from the app's local configurator (`http://<remote-ip>:8080` on the device — see the main README's [Local configuration](../README.md#local-configuration-no-adb-needed) section) or push it to `/sdcard/astrion/dashboard.json` manually.

## Card types

Ten common card types have full dedicated forms (`bubble_light`, `light`, `switch`, `cover`, `fan`, `climate`, `source_select`, `button_grid`, `scene_grid`, `apple_tv_remote`, `tv_remote`). The remaining types (`clock_weather`, `media_player`, `speaker_group`, `monitor`, `picture_elements`, `plex`, `row`, `vacuum`, or any custom type) use a raw JSON options field — check the corresponding `CardRenderer`'s Kotlin file in `src/main/java/com/custom/astrion/cards/impl/` for its exact fields.
