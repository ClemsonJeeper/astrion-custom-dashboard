package com.custom.astrion.config

import android.os.Environment
import com.custom.astrion.cards.CardConfig

/**
 * Compiled-in FALLBACK layout. At runtime DashboardLoader reads the live layout
 * from /sdcard/astrion/dashboard.json (and writes this out as the initial file
 * when none exists). Edit the JSON and reopen the app to change things.
 *
 * Four swipeable pages, each also reachable by a physical shortcut button:
 *   0  Lights   — Light button   — scenes on top, then brightness sliders
 *   1  Main     — Curtain button — clock/weather, floorplan, compact media
 *   2  Media    — Music button   — full player + group/ungroup + playlists
 *   3  Climate  — Aircon button  — aircon, covers, TV-app launch row
 *
 * The physical D-pad / home / back keys drive the Android TV directly, and the
 * four color buttons (red/green/blue/yellow) launch Netflix/Plex/ABC/VLC.
 */
@Suppress("Unused", "SpellCheckingInspection")
object DashboardConfig {

    private val storagePath: String
        get() = Environment.getExternalStorageDirectory().path

    private const val WEATHER = "weather.forecast_home"
    private const val CLIMATE = "climate.aircon"
    private const val COVER = "cover.blinds"
    private const val CLUB_MEDIA = "media_player.club"
    private const val TV_REMOTE = "remote.the_club_tvv"
    private const val TV_MEDIA = "media_player.the_club_tvv" // app-launch target
    private const val CALENDAR = "calendar.family"

    private val iconsDir: String
        get() = "$storagePath/astrion/icons" // playlist button PNGs

    private val floorplanImg: String
        get() = "$storagePath/astrion/floorplan.png"

    /**
     * One options map, used both by the standalone `vacuum` card at the bottom
     * of Main and by the floorplan's "vacuum" overlay — so the entity/map/room
     * list stays in one place. The floorplan-only keys (room_entity,
     * room_positions, dock_position) are simply ignored by the standalone card.
     */
    private val VACUUM_OPTIONS: Map<String, Any?> = mapOf(
        "entity_id" to "vacuum.roborock_qrevo_master",
        "name" to "Vacuum",
        "map_image" to "image.kitchen_roborock_qrevo_master_map_0_custom",
        "map_rotation" to 90, // matches the floorplan card's orientation above
        "rooms" to listOf(
            mapOf("name" to "Club", "id" to 17),
            mapOf("name" to "Kitchen", "id" to 18),
            mapOf("name" to "Bedroom", "id" to 22),
            mapOf("name" to "Bathroom", "id" to 16),
            mapOf("name" to "Office", "id" to 21),
        ),
        // Coarse room-based position on the (non-scale) floorplan — reuses the
        // same % spots as that room's light icon. The vacuum has no live X/Y
        // in HA, only a "current room" sensor, so room-level is as precise as
        // it gets (and matches a stylized floorplan better than pixels would).
        "room_entity" to "sensor.roborock_qrevo_master_current_room",
        "room_positions" to mapOf(
            "Club" to listOf(42, 44),
            "Kitchen" to listOf(69, 57),
            "Bedroom" to listOf(29, 90),
            "Bathroom" to listOf(57, 90),
            "Office" to listOf(88, 82),
        ),
        // Left wall of the bedroom, near the window/plant, above the bed.
        "dock_position" to listOf(6, 63),
    )

    /** Big "turn everything off" target list, from the original dashboard. */
    private val ALL_LIGHTS = listOf(
        "light.apollo_r_pro_1_f5c680_rgb_light",
        "light.art_pendanta",
        "light.art_pendants",
        "light.bar_lights",
        "light.bathroom_downlights",
        "light.bathroom_mirror_led",
        "light.bed_lamp_left",
        "light.bed_lamp_right",
        "light.bedroom_lights",
        "light.club_accent_lights",
        "light.club_led_group",
        "light.philips_hue_omniglow_lightstrip",
        "light.downlights",
        "light.hue_play",
        "light.hue_records",
        "light.kitchen",
        "light.office_hue_lightstrip_solo",
        "light.office_lights",
        "light.play_art",
        "light.play_tv",
        "light.tv_art_light",
        "light.couch",
        "light.wardrobe",
    )

    // ---- Page 0: Lights -----------------------------------------------------
    private val lightsPage = PageConfig(
        name = "Lights",
        cards = listOf(
            slider("light.downlights", "Downlights"),
            slider("light.club_led_group", "Club LED"),
            slider("light.art_group", "Art"),
            slider("light.club_accent_lights", "Accent"),
            slider("light.bar_lights", "Bar"),
            slider("light.kitchen_group", "Kitchen"),
            slider("light.kitchen_console_candles", "Candles"),
            slider("light.bedroom_lights", "Bedroom"),
            slider("light.bedlamps", "Bed Lamps"),
            slider("light.bathroom_all", "Bathroom"),
            slider("light.wardrobes", "Wardrobes"),
            slider("light.office_only", "Office"),
            slider("light.mood_1", "Mood 1"),
            slider("light.mood_2", "Mood 2"),
            // Scenes pinned to the bottom as a swipeable, color-coded row.
            CardConfig(
                type = "scene_grid",
                options = mapOf(
                    "layout" to "row",
                    "pin" to "bottom",
                    "scenes" to listOf(
                        mapOf("entity_id" to "script.mood_scene", "name" to "Mood", "color" to "#66E91E63"),
                        mapOf("entity_id" to "scene.night", "name" to "Night", "color" to "#663F51B5"),
                        mapOf("entity_id" to "scene.white", "name" to "White", "color" to "#66FFFFFF"),
                        mapOf("entity_id" to "script.day", "name" to "Day", "color" to "#66FFB300"),
                        mapOf("entity_id" to "script.club", "name" to "Club", "color" to "#669C27B0"),
                        mapOf("entity_id" to "script.off", "name" to "Off", "color" to "#66000000"),
                    ),
                ),
            ),
        ),
    )

    private fun slider(entityId: String, name: String) = CardConfig(
        type = "bubble_light",
        options = mapOf("entity_id" to entityId, "name" to name),
    )

    // ---- Page 1: Main -------------------------------------------------------
    private val mainPage: PageConfig
        get() = PageConfig(
            name = "Main",
            cards = listOf(
                CardConfig(
                    type = "clock_weather",
                    options = mapOf(
                        "entity_id" to WEATHER, "time_format" to 12, "forecast_rows" to 2,
                        "calendar_entity" to CALENDAR,
                    ),
                ),
                CardConfig(
                    type = "picture_elements",
                    options = mapOf(
                        "image" to floorplanImg,
                        "aspect" to 1.3,
                        "elements" to listOf(
                            // Positions are % of the border-cropped floorplan image.
                            elem("light.hue_play", 16, 9),
                            elem("light.club_led_group", 12, 46),
                            elem("light.couch", 27, 30),
                            elem("light.downlights", 65, 28),
                            elem("light.art_group", 45, 11),
                            elem("light.bar_spotlights", 85, 13),
                            elem("light.kitchen_group", 69, 54),
                            elem("light.office_lights", 88, 78),
                            elem("light.bathroom_downlights", 57, 90),
                            elem("light.bedroom_lights", 29, 90),
                            // Console candles on the new sideboard (right wall).
                            elem("light.kitchen_console_candles", 93, 33),
                        ),
                        // mmWave presence dots (Apollo LD2450). Tune origin/scale/
                        // rotation until a real person lands in the right spot.
                        "radar" to mapOf(
                            "prefix" to "sensor.club_apollo_r_pro_1_ld2450_target",
                            "targets" to 3,
                            "origin_left" to 53,
                            "origin_top" to 10,
                            "scale_x" to 8.66,
                            "scale_x_right" to 17.32, // right half stretched wider
                            "scale_y" to 9.01,
                            "top_offset_left" to 7.88, // nudge left-side dots down
                            "rotation" to 0,
                            "flip_x" to false,
                            "flip_y" to false,
                            "blend" to "overlay", // pop over light icons
                        ),
                        // Robot-vacuum icon overlaid on the same floorplan — tap it
                        // to open the full vacuum controls in a popup.
                        "vacuum" to VACUUM_OPTIONS,
                    ),
                ),
                // Compact player stays on Main.
                CardConfig(type = "media_player", options = mapOf("entity_id" to CLUB_MEDIA)),
            ),
        )

    private fun elem(entityId: String, left: Int, top: Int): Map<String, Any?> =
        mapOf("entity_id" to entityId, "left" to left, "top" to top)

    // ---- Page 2: Media ------------------------------------------------------
    private val mediaPage: PageConfig
        get() = PageConfig(
            name = "Media",
            cards = listOf(
                CardConfig(
                    type = "media_player",
                    options = mapOf(
                        "entity_id" to CLUB_MEDIA,
                        "variant" to "full",
                    ),
                ),
                // Playlist buttons — EDIT the service names to your real scripts.
                CardConfig(
                    type = "button_grid",
                    options = mapOf(
                        "columns" to 3,
                        "buttons" to listOf(
                            playlist("Disco", "disco.png", "script.play_disco"),
                            playlist("House", "house.png", "script.play_house"),
                            playlist("MoS", "mos.png", "script.play_mos"),
                            playlist("Purple Disco", "turntable.png", "script.play_pdm"),
                            playlist("Dimitri From", "paris.png", "script.play_dfp"),
                            playlist("Trap", "trap.png", "script.play_trap"),
                        ),
                    ),
                ),
                // Sonos speakers: tick = joined to the club (join/unjoin fires
                // immediately), with a live volume bar + mute/vol buttons each.
                CardConfig(
                    type = "speaker_group",
                    options = mapOf(
                        "master" to CLUB_MEDIA,
                        "name" to "Club",
                        "speakers" to listOf(
                            mapOf("entity_id" to "media_player.living_room_sonos", "name" to "Living Room"),
                            mapOf("entity_id" to "media_player.bathroom_sonos", "name" to "Bathroom"),
                            mapOf("entity_id" to "media_player.bedroom_sonos", "name" to "Bedroom"),
                            mapOf("entity_id" to "media_player.office_sonos", "name" to "Office"),
                        ),
                    ),
                ),
                // Source pickers at the very bottom.
                CardConfig(
                    type = "source_select",
                    options = mapOf("entity_id" to CLUB_MEDIA, "name" to "Club source"),
                ),
                CardConfig(
                    type = "source_select",
                    options = mapOf("entity_id" to "media_player.android_tv_10_0_1_248", "name" to "Android TV source"),
                ),
                CardConfig(
                    type = "source_select",
                    options = mapOf("entity_id" to "media_player.the_serif_qa55ls01dawxxy", "name" to "Serif TV source"),
                ),
            ),
        )

    private fun playlist(name: String, iconFile: String, service: String): Map<String, Any?> =
        mapOf("name" to name, "icon" to "$iconsDir/$iconFile", "service" to service)

    // ---- Page 3: Climate ----------------------------------------------------
    private val climatePage = PageConfig(
        name = "Climate",
        cards = listOf(
            CardConfig(
                type = "climate",
                options = mapOf("entity_id" to CLIMATE, "name" to "Aircon", "step" to 0.5),
            ),
            // On/off switch between aircon and covers.
            CardConfig(
                type = "switch",
                options = mapOf(
                    "entity_id" to "switch.bedroom_heater",
                    "name" to "Bedroom Heater",
                    "icon" to "heater",
                    "on_color" to "#B3902828", // semi-transparent dark red
                ),
            ),
            // Two covers stacked (not side by side).
            CardConfig(type = "cover", options = mapOf("entity_id" to COVER, "name" to "Sofa")),
            CardConfig(type = "cover", options = mapOf("entity_id" to "cover.smart_blinds_curtain", "name" to "Bed")),
        ),
    )

    // ---- Hotkeys (physical buttons → actions) -------------------------------
    private val hotkeys = listOf(
        // D-pad + home/back/power drive the Android TV.
        tvKey("UP", "DPAD_UP"),
        tvKey("DOWN", "DPAD_DOWN"),
        tvKey("LEFT", "DPAD_LEFT"),
        tvKey("RIGHT", "DPAD_RIGHT"),
        tvKey("CENTER", "DPAD_CENTER"),
        tvKey("HOME", "HOME"),
        tvKey("BACK", "BACK"),
        tvKey("POWER", "POWER"),
        tvKey("MUTE", "HOME"),
        // Volume → club media player.
        HotkeyConfig("VOLUME_UP", service = "media_player.volume_up", entityId = CLUB_MEDIA),
        HotkeyConfig("VOLUME_DOWN", service = "media_player.volume_down", entityId = CLUB_MEDIA),
        // Page up/down → the club brightness scripts.
        HotkeyConfig("PAGE_UP", service = "script.turn_on", entityId = "script.increase_club_brightness_on_lights_only"),
        HotkeyConfig("PAGE_DOWN", service = "script.turn_on", entityId = "script.decrease_club_brightness_on_lights_only"),
        // Shortcut buttons → pages.
        HotkeyConfig("LIGHT", page = "Lights"),    // light button
        HotkeyConfig("CURTAIN", page = "Main"),    // curtain button
        HotkeyConfig("SCENE", page = "Media"),     // music button (keycode 136)
        HotkeyConfig("AC", page = "Climate"),      // aircon button
        // Color buttons launch apps on the TV.
        appKey("CUSTOM_1", "com.netflix.ninja"),   // red    → Netflix
        appKey("CUSTOM_2", "com.plexapp.android"),  // green  → Plex
        appKey("CUSTOM_3", "au.net.abc.iview"),     // blue   → ABC iView
        appKey("CUSTOM_4", "org.videolan.vlc"),     // yellow → VLC
    )

    private fun tvKey(key: String, command: String) = HotkeyConfig(
        key = key, service = "remote.send_command", entityId = TV_REMOTE,
        data = mapOf("command" to command),
    )

    private fun appKey(key: String, appId: String) = HotkeyConfig(
        key = key, service = "media_player.play_media", entityId = TV_MEDIA,
        data = mapOf("media_content_type" to "app", "media_content_id" to appId),
    )

    // ---- Long-press bindings (~500ms hold) → scripts ------------------------
    // D-pad and the eight bottom buttons each fire a script on long press,
    // while a normal tap keeps its usual action.
    private val longHotkeys = listOf(
        // NOTE: no long-press on the D-pad arrows or volume — those keys
        // auto-repeat while held (hold-to-scroll on the TV, hold-to-ramp
        // volume). Long-press is reserved for keys where repeat isn't useful.
        // OK held → toggle play/pause on the club media player.
        HotkeyConfig("CENTER", service = "media_player.media_play_pause", entityId = CLUB_MEDIA),
        // CH (page) rocker long-press → blinds.
        longKey("PAGE_UP", "script.open_blinds"),
        longKey("PAGE_DOWN", "script.close_blinds"),
        // Shortcut row.
        longKey("LIGHT", "script.long_lights"),
        longKey("CURTAIN", "script.long_curtain"),
        longKey("SCENE", "script.long_music"),   // music button
        longKey("AC", "script.long_aircon"),
        // Color row.
        longKey("CUSTOM_1", "script.long_red"),
        longKey("CUSTOM_2", "script.long_green"),
        longKey("CUSTOM_3", "script.long_blue"),
        longKey("CUSTOM_4", "script.long_yellow"),
    )

    private fun longKey(key: String, script: String) = HotkeyConfig(key = key, service = script)

    val default: AppConfig
        get() = AppConfig(
            pages = listOf(lightsPage, mainPage, mediaPage, climatePage),
            startPage = 1, // open on Main
            hotkeys = hotkeys,
            longHotkeys = longHotkeys,
        )
}