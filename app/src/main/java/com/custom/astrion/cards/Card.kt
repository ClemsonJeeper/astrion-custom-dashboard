package com.custom.astrion.cards

import androidx.compose.runtime.Composable
import com.custom.astrion.config.IrActivityConfig
import com.custom.astrion.ha.EntityMap
import com.custom.astrion.ha.HaClient

/**
 * THE EXTENSIBILITY CORE.
 *
 * A card in your dashboard config is defined as:
 * `{ type: "<your-type>", <arbitrary options...> }`.
 * `CardConfig.options` passes these options straight to your renderer.
 */

/** One card entry from your dashboard layout config. */
data class CardConfig(
    val type: String,
    /** Free-form per-card options. Your renderer decides how to read these. */
    val options: Map<String, Any?> = emptyMap(),
) {
    fun string(key: String): String? = options[key] as? String
    fun stringList(key: String): List<String> =
        (options[key] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
    @Suppress("Unused")
    fun bool(key: String, default: Boolean = false): Boolean =
        options[key] as? Boolean ?: default
    fun int(key: String, default: Int = 0): Int =
        (options[key] as? Number)?.toInt() ?: default
}

/**
 * Context handed to every card render.
 *
 * Gives the card read access to live entity states and service calls.
 * It also enables navigation between pages (e.g. tapping an item to open a page).
 */
class CardContext(
    val entities: EntityMap,
    val client: HaClient,
    /** No-op default so existing cards/tests that don't pass this keep working. */
    val navigateToPage: (String) -> Unit = {},
    /** Starts a Harmony Activity directly on a hub (bypasses HA). `hub` is a
     * HarmonyHubConfig.localId; null/blank falls back to the first configured hub. */
    val startHarmonyActivity: (activityId: String, hub: String?) -> Unit = { _, _ -> },
    /** Sends an IR command to a device directly on a hub (bypasses HA). `hub` is a
     * HarmonyHubConfig.localId; null/blank falls back to the first configured hub. */
    val sendHarmonyCommand: (deviceId: String, command: String, hub: String?) -> Unit = { _, _, _ -> },
    /** Current state of the motion-wake feature, and a way to toggle it —
     * used by the settings page (mirrors HaRemote's "Wake on movement" switch). */
    val wakeOnMotionEnabled: Boolean = true,
    val setWakeOnMotionEnabled: (Boolean) -> Unit = {},
    /** Live connection state of the direct Harmony hub link — for a status
     * indicator on the settings page (HA's own state is on ctx.client.connection). */
    val harmonyConnected: Boolean = false,
    /** Local IR activities (id -> config), resolved once from AppConfig.irActivities.
     * Used by scene_grid items with an `irActivity` field to send a sequence
     * of raw IR commands directly through the device's own blaster. */
    val irActivities: Map<String, IrActivityConfig> = emptyMap(),
)

/**
 * Implement this to create a new native card type.
 *
 * `type` matches the key used in your config. Render uses Jetpack Compose,
 * giving you full control over layout, colors, animations, and sizing.
 */
interface CardRenderer {
    val type: String

    @Composable
    fun Render(config: CardConfig, ctx: CardContext)
}

/**
 * Global registry. Register once at startup.
 * Lookup by type happens when the dashboard is built.
 */
object CardRegistry {
    private val renderers = LinkedHashMap<String, CardRenderer>()

    fun register(renderer: CardRenderer) {
        renderers[renderer.type] = renderer
    }

    fun register(vararg rs: CardRenderer) = rs.forEach { register(it) }

    fun get(type: String): CardRenderer? = renderers[type]

    @Suppress("Unused")
    fun known(): Set<String> = renderers.keys
}