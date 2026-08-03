package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.ServiceCall
import kotlin.math.roundToInt

/**
 * Bubble-Card-style light control, inspired by the popular Bubble Card HACS
 * front-end. The whole pill is a horizontal brightness slider; the circular icon
 * on the left is a tap-target that toggles on/off. Drag anywhere along the pill
 * to set brightness. The fill tracks the current brightness level, and the pill
 * tints warm when on.
 *
 * This is exactly the sort of interaction the stock aiks-light-card can't do —
 * and it's ~120 lines of Compose here.
 *
 * Uses:
 *   light.toggle
 *   light.turn_on { brightness_pct }
 *
 * Config shape:
 *   CardConfig("bubble_light", mapOf(
 *       "entity_id" to "light.kitchen",
 *       "name" to "Kitchen",
 *   ))
 */
class BubbleLightCard : CardRenderer {
    override val type = "bubble_light"

    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val entityId = config.string("entity_id") ?: return
        val e = ctx.entities[entityId]
        val on = e?.isOn == true
        val name = config.string("name") ?: e?.friendlyName ?: entityId

        // brightness attribute is 0..255; convert to 0..1 fraction.
        val brightness = e?.attrInt("brightness")
        val level: Float = when {
            !on -> 0f
            brightness != null -> (brightness / 255f).coerceIn(0f, 1f)
            else -> 1f
        }

        // Local drag state so the fill responds instantly, then commits to HA.
        var dragLevel by remember(level) { mutableStateOf(level) }

        // Long-press opens the color/brightness detail popup.
        var showDetail by remember { mutableStateOf(false) }

        fun commit(fraction: Float) {
            val pct = (fraction.coerceIn(0f, 1f) * 100).roundToInt()
            if (pct <= 0) {
                ctx.client.callService(ServiceCall("light", "turn_off", entityId))
            } else {
                ctx.client.callService(
                    ServiceCall.of("light", "turn_on", entityId, "brightness_pct" to pct)
                )
            }
        }

        // Reflect the light's real color when it reports one (rgb_color);
        // otherwise a neutral blue-gray. Icon stays yellow-when-on as the
        // on/off indicator.
        val rgb = e?.attr("rgb_color") as? kotlinx.serialization.json.JsonArray
        val lightColor: Color? = if (on && rgb != null && rgb.size >= 3) {
            fun ch(i: Int) = (rgb[i] as? kotlinx.serialization.json.JsonPrimitive)
                ?.content?.toIntOrNull()?.coerceIn(0, 255)
            val r = ch(0); val g = ch(1); val b = ch(2)
            if (r != null && g != null && b != null) Color(r, g, b) else null
        } else null

        val fillColor = lightColor ?: Color(0xFF6E7E92) // blue-grey fallback
        val pillBg = Color(0xFF1E3841)                  // neutral dark body
        val iconBg = if (on) Color(0xFFFFC24B) else Color(0xFF33525E)
        val iconTint = if (on) Color(0xFF241A00) else Color(0xFFB6C9CE)

        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clip(RoundedCornerShape(32.dp))
                .background(pillBg)
                .pointerInput(entityId) {
                    detectHorizontalDragGestures(
                        onDragEnd = { commit(dragLevel) },
                    ) { change, _ ->
                        val frac = (change.position.x / size.width).coerceIn(0f, 1f)
                        dragLevel = frac
                    }
                }
                .pointerInput(entityId) {
                    detectTapGestures(
                        onLongPress = { showDetail = true },
                    ) { offset ->
                        val frac = (offset.x / size.width).coerceIn(0f, 1f)
                        dragLevel = frac
                        commit(frac)
                    }
                },
        ) {
            // Brightness fill
            if (on) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(dragLevel.coerceIn(0.001f, 1f))
                        .background(fillColor.copy(alpha = 0.38f))
                )
            }

            Row(
                modifier = Modifier
                    .matchParentSize()
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Icon toggle (stops slider from stealing the tap by handling click first)
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(iconBg)
                        .clickable { ctx.client.toggle(entityId) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Lightbulb, contentDescription = null, tint = iconTint)
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        name,
                        color = Color(0xFFE6F0F1),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        if (on) "${(dragLevel * 100).roundToInt()}%" else "Off",
                        color = Color(0xFF93AFB6),
                        fontSize = 12.sp,
                    )
                }
            }
        }

        if (showDetail) {
            LightDetailDialog(
                entityId = entityId,
                e = e,
                client = ctx.client,
                onClose = { showDetail = false },
            )
        }
    }
}
