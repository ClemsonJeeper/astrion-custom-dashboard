package com.custom.astrion.config

import android.content.Context

/**
 * Runtime-editable connection settings (Home Assistant + Harmony Hub),
 * stored in SharedPreferences. Deliberately has NO compile-time fallback —
 * release builds published for the community must never bundle anyone's
 * personal Home Assistant URL or access token. Every install starts
 * unconfigured and is set up afterward through the local web configurator
 * on port 8080 (see ConfigServer / SettingsMenu, which shows the address).
 */
object RemoteSettings {
    private const val PREFS = "astrion_settings"
    private const val KEY_HA_URL = "ha_url"
    private const val KEY_HA_TOKEN = "ha_token"
    private const val KEY_HARMONY_IP = "harmony_hub_ip"
    private const val KEY_HARMONY_ID = "harmony_hub_id"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun haUrl(context: Context): String = prefs(context).getString(KEY_HA_URL, "") ?: ""
    fun haToken(context: Context): String = prefs(context).getString(KEY_HA_TOKEN, "") ?: ""
    fun harmonyIp(context: Context): String = prefs(context).getString(KEY_HARMONY_IP, "") ?: ""
    fun harmonyId(context: Context): String = prefs(context).getString(KEY_HARMONY_ID, "") ?: ""

    /** True once a Home Assistant URL and token have been entered via the web configurator. */
    fun isConfigured(context: Context): Boolean = haUrl(context).isNotBlank() && haToken(context).isNotBlank()

    fun save(context: Context, haUrl: String, haToken: String, harmonyIp: String, harmonyId: String) {
        prefs(context).edit()
            .putString(KEY_HA_URL, haUrl)
            .putString(KEY_HA_TOKEN, haToken)
            .putString(KEY_HARMONY_IP, harmonyIp)
            .putString(KEY_HARMONY_ID, harmonyId)
            .apply()
    }
}