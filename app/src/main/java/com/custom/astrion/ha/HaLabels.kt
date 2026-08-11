package com.custom.astrion.ha

import android.content.Context
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.util.Locale

/**
 * Translations for the raw state values Home Assistant returns over its
 * WebSocket API (hvac_mode, fan_mode, weather condition, vacuum state...).
 * HA only translates these client-side in Lovelace, never over the API, so
 * we map them ourselves.
 *
 * These are NOT regular Android @string resources: some raw HA values
 * contain characters invalid in a resource name (e.g. "clear-night"), and
 * the key is only known at runtime (it comes from whatever integration
 * reports it) — a plain string lookup needs no such restriction.
 *
 * Community translations live in assets/ha_labels/<lang>.json — adding a
 * language is just dropping a file, no code change required. en.json is
 * the mandatory fallback if the requested language file is missing.
 */
object HaLabels {
    private var categories: Map<String, Map<String, String>> = emptyMap()
    private var loadedLang: String? = null

    /** Call once at startup (or again if the language changes). */
    fun init(
        context: Context,
        lang: String = Locale.getDefault().language,
    ) {
        if (lang == loadedLang) return
        val text =
            runCatching {
                context.assets.open("ha_labels/$lang.json").bufferedReader().use { it.readText() }
            }.getOrElse {
                context.assets.open("ha_labels/en.json").bufferedReader().use { it.readText() }
            }
        categories =
            runCatching {
                Json.parseToJsonElement(text).jsonObject.mapValues { (_, v) ->
                    v.jsonObject.mapValues { (_, s) -> s.jsonPrimitive.content }
                }
            }.getOrDefault(emptyMap())
        loadedLang = lang
    }

    fun hvacMode(raw: String): String = lookup("hvac_mode", raw)

    fun fanMode(raw: String): String = lookup("fan_mode", raw.lowercase())

    fun swingMode(raw: String): String = lookup("swing_mode", raw.lowercase())

    fun weatherCondition(raw: String): String = lookup("weather_condition", raw)

    fun vacuumState(raw: String): String = lookup("vacuum_state", raw)

    /**
     * Fan-speed / cleaning-mode names are reported verbatim by each vacuum
     * integration (not a fixed HA-wide set like the activity state), so
     * `assets/ha_labels/<lang>.json`'s `vacuum_fan_speed` category only
     * covers the common ones (min/quiet/medium/high/turbo/max/mop...) —
     * anything else still falls back to the best-effort prettifier below.
     */
    fun vacuumFanSpeed(raw: String): String = lookup("vacuum_fan_speed", raw.lowercase())

    fun coverState(raw: String): String = lookup("cover_state", raw)

    private fun lookup(
        category: String,
        raw: String,
    ): String =
        categories[category]?.get(raw) ?: fallback(raw)

    /** Best-effort display for a key with no translation entry. */
    private fun fallback(raw: String): String =
        raw.split('_', '-').joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
}
