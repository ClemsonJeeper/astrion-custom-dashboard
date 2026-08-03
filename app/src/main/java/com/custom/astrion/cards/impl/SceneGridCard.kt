package com.custom.astrion.cards.impl

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.ServiceCall

/**
 * Scene, activity, or navigation grid tile.
 *
 * Each tile triggers an action based on its fields:
 * - "entity_id": activates a scene or script via Home Assistant.
 * - "activityId": triggers a Harmony activity directly on the hub.
 * - "page": navigates to a specific dashboard page (ctx.navigateToPage).
 *
 * Config shape:
 * ```json
 * {
 *   "type": "scene_grid",
 *   "options": {
 *     "layout": "row",
 *     "scenes": [
 *       { "page": "Apple TV", "name": "Apple TV" },
 *       { "entity_id": "scene.night", "name": "Night" }
 *     ]
 *   }
 * }
 * ```
 */
class SceneGridCard : CardRenderer {
    override val type = "scene_grid"

    @Suppress("UNCHECKED_CAST")
    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val columns = config.int("columns", 2).coerceAtLeast(1)
        val scenes = (config.options["scenes"] as? List<Map<String, Any?>>) ?: emptyList()
        val row = config.string("layout") == "row"

        fun activate(entityId: String) {
            val domain = entityId.substringBefore('.')
            ctx.client.callService(ServiceCall(domain = domain, service = "turn_on", entityId = entityId))
        }

        fun onTap(scene: Map<String, Any?>) {
            (scene["entity_id"] as? String)?.let(::activate)
            (scene["activityId"] as? String)?.let(ctx.startHarmonyActivity)
            (scene["page"] as? String)?.let(ctx.navigateToPage)
        }

        fun nameOf(scene: Map<String, Any?>): String {
            (scene["name"] as? String)?.let { return it }
            val entityId = scene["entity_id"] as? String
            if (entityId != null) return ctx.entities[entityId]?.friendlyName ?: entityId
            return scene["page"] as? String ?: "?"
        }

        fun colorOf(scene: Map<String, Any?>): Color =
            (scene["color"] as? String)?.let(::parseHexColor) ?: Color(0xFF2A4954)

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
        val cleanHex = s.removePrefix("#")
        val parsed = cleanHex.toLongOrNull(16) ?: return null
        return if (cleanHex.length <= 6) {
            Color(0xFF000000 or parsed)
        } else {
            Color(parsed)
        }
    }

    private fun luminance(c: Color): Float =
        0.2126f * c.red + 0.7152f * c.green + 0.0722f * c.blue

    @Composable
    private fun SceneButton(name: String, color: Color, modifier: Modifier, onClick: () -> Unit) {
        val textColor = if (luminance(color) > 0.75f) Color(0xFF141414) else Color(0xFFF0F2F6)
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
                name,
                color = textColor,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
            )
        }
    }
}