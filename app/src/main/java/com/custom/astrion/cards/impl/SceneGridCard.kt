package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
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
 * Example scene grid — the kind of custom layout HaRemote won't let you build.
 *
 * Instead of one-scene-per-row, this packs N scene buttons into a configurable
 * grid. Demonstrates that a "card type" here can be an arbitrarily complex
 * multi-entity layout, not just a single-entity tile.
 *
 * Config shape:
 *   CardConfig("scene_grid", mapOf(
 *       "columns" to 2,
 *       "scenes" to listOf(
 *           mapOf("entity_id" to "scene.movie", "name" to "Movie"),
 *           mapOf("entity_id" to "scene.night", "name" to "Night"),
 *           ...
 *       ),
 *   ))
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
            // scene.* → scene.turn_on, script.* → script.turn_on, etc.
            val domain = entityId.substringBefore('.')
            ctx.client.callService(ServiceCall(domain = domain, service = "turn_on", entityId = entityId))
        }
        fun nameOf(scene: Map<String, Any?>, entityId: String) =
            scene["name"] as? String ?: ctx.entities[entityId]?.friendlyName ?: entityId
        fun colorOf(scene: Map<String, Any?>): Color =
            (scene["color"] as? String)?.let(::parseHexColor) ?: Color(0xFF2A4954)

        if (row) {
            // Horizontally scrollable / swipeable single row of fixed-width tiles.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                scenes.forEach { scene ->
                    val entityId = scene["entity_id"] as? String ?: return@forEach
                    SceneButton(
                        name = nameOf(scene, entityId),
                        color = colorOf(scene),
                        modifier = Modifier.width(104.dp),
                    ) { activate(entityId) }
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                scenes.chunked(columns).forEach { chunk ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        chunk.forEach { scene ->
                            val entityId = scene["entity_id"] as? String ?: return@forEach
                            SceneButton(
                                name = nameOf(scene, entityId),
                                color = colorOf(scene),
                                modifier = Modifier.weight(1f),
                            ) { activate(entityId) }
                        }
                        // Pad the final short row so tiles keep equal width.
                        repeat(columns - chunk.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        }
    }

    /** Parse "#AARRGGBB" (or RRGGBB) to a Color. */
    private fun parseHexColor(s: String): Color? =
        s.removePrefix("#").toLongOrNull(16)?.let { Color(it) }

    /** Perceived luminance of the base RGB (0..1) — used to pick a readable text colour. */
    private fun luminance(c: Color): Float =
        0.2126f * c.red + 0.7152f * c.green + 0.0722f * c.blue

    @Composable
    private fun SceneButton(name: String, color: Color, modifier: Modifier, onClick: () -> Unit) {
        // Dark text on light tiles (e.g. the white scene), light text otherwise.
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
