package com.custom.astrion.config

import com.custom.astrion.cards.CardConfig

/**
 * Full app configuration: swipeable pages of cards plus hardware-button
 * bindings. Loaded from /sdcard/astrion/dashboard.json by DashboardLoader,
 * with `DashboardConfig.default` as the compiled-in fallback.
 */
@Suppress("Unused")
data class AppConfig(
    /** Left-to-right page order; swipe between them. */
    val pages: List<PageConfig>,
    /** Index of the page shown at launch (the "home" page). */
    val startPage: Int = 0,
    /** Short-press button bindings. */
    val hotkeys: List<HotkeyConfig> = emptyList(),
    /** Long-press (~500ms hold) button bindings — same shape as hotkeys. */
    val longHotkeys: List<HotkeyConfig> = emptyList(),
)

/**
 * One swipeable page: a name (used by hotkey `page` navigation), its cards,
 * and optional page-scoped hotkeys that override the global ones while this
 * page is on screen (e.g. the D-pad targets the Apple TV only on its page,
 * while VOLUME_UP/DOWN keep pointing at the soundbar everywhere).
 */
@Suppress("Unused")
data class PageConfig(
    val name: String,
    val cards: List<CardConfig>,
    val hotkeys: List<HotkeyConfig> = emptyList(),
    val longHotkeys: List<HotkeyConfig> = emptyList(),
)

/**
 * One physical-button binding. `key` is a HardwareKey name — the HA100 has:
 * UP DOWN LEFT RIGHT CENTER, PAGE_UP PAGE_DOWN, VOLUME_UP VOLUME_DOWN MUTE,
 * BACK HOME POWER VOICE, LIGHT CURTAIN SCENE AC, CUSTOM_1...CUSTOM_4.
 *
 * Exactly one action per binding:
 *  - `page`: navigate to the page with that name (case-insensitive), or
 *  - `service` ("domain.service") + optional `entityId` + flat `data` map
 *    (routed through Home Assistant), or
 *  - `harmonyDevice` + `harmonyCommand`: IR command sent DIRECTLY to the
 *    Harmony hub (HarmonyHubClient), bypass HA — same ids as checklist_codes_ir.csv, or
 *  - `harmonyActivity`: starts a Harmony Activity by its id (from
 *    harmony_config.json), PowerOff = "-1".
 */
@Suppress("Unused")
data class HotkeyConfig(
    val key: String,
    val page: String? = null,
    val service: String? = null,
    val entityId: String? = null,
    val data: Map<String, Any?> = emptyMap(),
    val harmonyDevice: String? = null,
    val harmonyCommand: String? = null,
    val harmonyActivity: String? = null,
) {
    /** Helper flags to quickly check hotkey action type. */
    val isPageNavigation: Boolean get() = !page.isNullOrBlank()
    val isServiceCall: Boolean get() = !service.isNullOrBlank()
    val isHarmonyCommand: Boolean get() = !harmonyDevice.isNullOrBlank() && !harmonyCommand.isNullOrBlank()
    val isHarmonyActivity: Boolean get() = !harmonyActivity.isNullOrBlank()
}