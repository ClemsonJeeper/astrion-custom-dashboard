package com.custom.astrion.cards.impl

import android.content.Context
import android.graphics.BitmapFactory
import android.hardware.ConsumerIrManager
import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.toColorInt
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.ServiceCall
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import kotlin.time.Duration.Companion.milliseconds

/**
 * Scene, activity, or navigation grid tile.
 *
 * Each tile triggers an action based on its fields:
 * - "entity_id": activates a scene or script via Home Assistant.
 * - "activityId" / "harmonyDevice"+"harmonyCommand": Harmony hub actions,
 *   routed through an optional "hub" field (HarmonyHubConfig.localId);
 *   falls back to the first configured hub when absent.
 * - "activityId": triggers a Harmony activity directly on the hub.
 * - "irActivity": runs a named sequence of raw IR sends locally through the
 *   device's own IR blaster (see AppConfig.irActivities) — works fully
 *   offline, no Harmony hub or Home Assistant needed.
 * - "page": navigates to a specific dashboard page (ctx.navigateToPage).
 *
 * Config shape:
 * ```json
 * {
 *   "type": "scene_grid",
 *   "options": {
 *     "layout": "row",
 *     "show_labels": true,
 *     "scenes": [
 *       { "page": "Apple TV", "name": "Apple TV", "color": "#66009688",
 *         "icon": "/sdcard/astrion/icons/apple-tv_dark_icon.png" },
 *       { "entity_id": "scene.night", "name": "Night" }
 *     ]
 *   }
 * }
 * ```
 *
 * If any scene in the grid has an "icon", every tile in that grid uses the
 * taller icon layout (uniform height) — set "show_labels": false to show
 * icons only, no text underneath.
 */
class SceneGridCard : CardRenderer {
    override val type = "scene_grid"

    @Suppress("UNCHECKED_CAST")
    @Composable
    override fun Render(
        config: CardConfig,
        ctx: CardContext,
    ) {
        val columns = remember(config) { config.int("columns", 2).coerceAtLeast(1) }
        val scenes = remember(config) { (config.options["scenes"] as? List<Map<String, Any?>>) ?: emptyList() }
        val row = remember(config) { config.string("layout") == "row" }

        val androidContext = LocalContext.current
        val scope = rememberCoroutineScope()
        val irManager = remember(androidContext) {
            androidContext.getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager
        }

        // Reference to cancel the current IR transmission if a new one is triggered
        var activeIrJob by remember { mutableStateOf<Job?>(null) }

        fun activate(entityId: String) {
            val domain = entityId.substringBefore('.')
            ctx.client.callService(ServiceCall(domain = domain, service = "turn_on", entityId = entityId))
        }

        // Fires each step in order, waiting delayAfterMs between them. Runs on
        // the composable's own coroutine scope so it survives the click
        // handler returning, but gets canceled automatically if the card
        // leaves composition mid-sequence.
        fun runIrActivity(activityId: String) {
            val activity = ctx.irActivities[activityId] ?: return
            val manager = irManager ?: return
            activeIrJob = scope.launch {
                val lastIndex = activity.steps.lastIndex
                activity.steps.forEachIndexed { index, step ->
                    runCatching {
                        manager.transmit(step.freq, step.pattern.toIntArray())
                    }.onFailure { error ->
                        Log.e("SceneGridCard", "IR send failed at step $index", error)
                    }

                    if (index < lastIndex && step.delayAfterMs > 0) {
                        delay(step.delayAfterMs.milliseconds)
                    }
                }
            }
        }

        fun onTap(scene: Map<String, Any?>) {
            (scene["entity_id"] as? String)?.let(::activate)
            val hub = scene["hub"] as? String
            (scene["activityId"] as? String)?.let { ctx.startHarmonyActivity(it, hub) }
            val harmonyDevice = scene["harmonyDevice"] as? String
            val harmonyCommand = scene["harmonyCommand"] as? String
            if (harmonyDevice != null && harmonyCommand != null) {
                ctx.sendHarmonyCommand(harmonyDevice, harmonyCommand, hub)
            }
            (scene["irActivity"] as? String)?.let(::runIrActivity)
            (scene["page"] as? String)?.let(ctx.navigateToPage)
        }

        fun nameOf(scene: Map<String, Any?>): String {
            (scene["name"] as? String)?.let { return it }
            val entityId = scene["entity_id"] as? String
            if (entityId != null) return ctx.entities[entityId]?.friendlyName ?: entityId
            return scene["page"] as? String ?: "?"
        }

        fun colorOf(scene: Map<String, Any?>): Color = (scene["color"] as? String)?.let(::parseHexColor) ?: Color(0xFF2A4954)

        fun iconOf(scene: Map<String, Any?>): String? = scene["icon"] as? String

        // Decided once for the whole grid (not per-tile) so every tile in a
        // row/grid shares the same height — a mix of icon (74dp) and
        // text-only (58dp) tiles side by side looked uneven.
        val hasIcon = remember(scenes) { scenes.any { !iconOf(it).isNullOrBlank() } }
        val showLabels = remember(config) { config.options["show_labels"] as? Boolean ?: true }

        if (row) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                scenes.forEach { scene ->
                    SceneButton(
                        name = nameOf(scene),
                        color = colorOf(scene),
                        iconPath = iconOf(scene),
                        hasIcon = hasIcon,
                        showLabel = showLabels,
                        modifier = Modifier.width(104.dp),
                    ) { onTap(scene) }
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                scenes.chunked(columns).forEach { chunk ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        chunk.forEach { scene ->
                            SceneButton(
                                name = nameOf(scene),
                                color = colorOf(scene),
                                iconPath = iconOf(scene),
                                hasIcon = hasIcon,
                                showLabel = showLabels,
                                modifier = Modifier.weight(1f),
                            ) { onTap(scene) }
                        }
                        repeat(columns - chunk.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        }
    }

    private fun parseHexColor(s: String): Color? {
        return runCatching {
            val hex = if (s.startsWith("#")) s else "#$s"
            Color(hex.toColorInt())
        }.getOrNull()
    }

    private fun luminance(c: Color): Float = 0.2126f * c.red + 0.7152f * c.green + 0.0722f * c.blue

    @Composable
    private fun SceneButton(
        name: String,
        color: Color,
        iconPath: String?,
        hasIcon: Boolean,
        showLabel: Boolean,
        modifier: Modifier,
        onClick: () -> Unit,
    ) {
        val textColor = if (luminance(color) > 0.75f) Color(0xFF141414) else Color(0xFFF0F2F6)
        val bitmap = remember(iconPath) {
            iconPath?.let {
                runCatching {
                    val f = File(it)
                    if (f.exists()) BitmapFactory.decodeFile(f.absolutePath)?.asImageBitmap() else null
                }.getOrNull()
            }
        }

        if (hasIcon) {
            // Every tile in the grid uses this branch once any one of them has
            // an icon, even tiles with no icon of their own — a blank 28dp
            // spacer keeps their label lined up with the others instead of
            // sitting lower.
            Column(
                modifier = modifier
                    .height(74.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(color)
                    .clickable(onClick = onClick)
                    .padding(6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                if (bitmap != null) {
                    Image(bitmap = bitmap, contentDescription = name, modifier = Modifier.size(28.dp))
                } else {
                    Spacer(Modifier.size(28.dp))
                }
                if (showLabel) {
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = name,
                        color = textColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                    )
                }
            }
        } else {
            Box(
                modifier = modifier
                    .height(58.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(color)
                    .clickable(onClick = onClick)
                    .padding(horizontal = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = name,
                    color = textColor,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}
