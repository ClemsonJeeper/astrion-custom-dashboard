package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.R
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.ServiceCall
import com.custom.astrion.ui.icons.MdiIcons
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlin.math.roundToInt

/**
 * Light card — styled after Home Assistant's Mushroom light card, including
 * its 3 layout options (mirrors CoverCard.kt's approach, and replaces the
 * old dedicated slider-pill BubbleLightCard — dragging to set brightness now
 * lives only in the detail dialog below, opened the same way it always was).
 *
 * Tap toggles the light; long-press opens LightDetailDialog for brightness,
 * colour and colour-temperature control — that dialog is unchanged, only how
 * you get to it (previously the bubble pill, now any of the 3 layouts here).
 * The icon itself swaps between MdiIcons.LightbulbOn (lit) and
 * MdiIcons.LightbulbOff (slashed) depending on state, Mushroom-style.
 *
 * Uses light.toggle / light.turn_on / light.turn_off.
 *
 * Config shape:
 *   { "type": "light", "options": {
 *       "entity_id": "light.kitchen", "name": "Kitchen",
 *       "layout": "default"
 *       //   "default"    — icon + name/state row, with a brightness bar
 *       //                  full-width below it (Mushroom's own default
 *       //                  look) — only drawn while on and dimmable. The
 *       //                  bar itself is a slider: drag or tap it to raise
 *       //                  or lower the brightness directly from the card,
 *       //                  no need to open the long-press detail dialog.
 *       //   "horizontal" — icon + name/state, single row, no bar
 *       //   "vertical"   — icon, name and state — all centered and stacked
 *       "use_light_color": false,
 *       //   When true and the light reports an rgb_color, the icon (and the
 *       //   default layout's brightness bar) tint with that colour instead
 *       //   of the plain amber "on" look.
 *       "show_brightness": true,
 *       //   When true (default) the state line reads "N%" while the light
 *       //   is on and reports a brightness; set false to always show a
 *       //   plain "On" instead.
 *   } }
 */
class LightCard : CardRenderer {
    override val type = "light"

    @Composable
    override fun Render(
        config: CardConfig,
        ctx: CardContext,
    ) {
        val entityId = config.string("entity_id") ?: return
        val e = ctx.entities[entityId]
        val name = config.string("name") ?: e?.friendlyName ?: entityId
        val isOn = e?.isOn == true
        val useLightColor = config.bool("use_light_color", false)
        val showBrightness = config.bool("show_brightness", true)

        // brightness attribute is 0..255; convert to a 0..100 percent.
        val brightnessPct = e?.attrInt("brightness")?.let { (it / 255f * 100).roundToInt().coerceIn(0, 100) }

        // 0% reads as "Off" (translated), otherwise the raw percentage — the
        // light's own on/off state still wins when there's no brightness
        // attribute to read at all (plain toggle-only lights).
        val stateLabel =
            when {
                !isOn -> stringResource(R.string.light_state_off)
                !showBrightness || brightnessPct == null -> stringResource(R.string.light_state_on)
                brightnessPct <= 0 -> stringResource(R.string.light_state_off)
                else -> stringResource(R.string.light_brightness_pct, brightnessPct)
            }

        // Reflect the light's real colour when it reports one and the option
        // is on; otherwise fall back to the plain amber "on" look.
        val rgb = e?.attr("rgb_color") as? JsonArray
        val lightColor: Color? =
            if (isOn && useLightColor && rgb != null && rgb.size >= 3) {
                fun ch(i: Int) = (rgb[i] as? JsonPrimitive)?.content?.toIntOrNull()?.coerceIn(0, 255)
                val r = ch(0)
                val g = ch(1)
                val b = ch(2)
                if (r != null && g != null && b != null) Color(r, g, b) else null
            } else {
                null
            }

        val icon: ImageVector = if (isOn) MdiIcons.LightbulbOn else MdiIcons.LightbulbOff
        val iconBg: Color
        val iconTint: Color
        when {
            !isOn -> {
                iconBg = Color(0xFF2A4954)
                iconTint = Color(0xFFB6C9CE)
            }
            lightColor != null -> {
                iconBg = lightColor.copy(alpha = 0.22f)
                iconTint = lightColor
            }
            else -> {
                iconBg = Color(0xFFFFC24B)
                iconTint = Color(0xFF241A00)
            }
        }
        val barColor = lightColor ?: Color(0xFFFFC24B)
        val showBar = isOn && showBrightness && brightnessPct != null

        // Long-press anywhere on the tile opens the detail dialog; a plain
        // tap toggles — same gestures BubbleLightCard used, minus the drag.
        var showDetail by remember { mutableStateOf(false) }
        val gestureModifier =
            Modifier.pointerInput(entityId) {
                detectTapGestures(
                    onTap = { ctx.client.toggle(entityId) },
                    onLongPress = { showDetail = true },
                )
            }

        // Fires light.turn_on/off from a 0..1 fraction — shared by the
        // draggable brightness bar below.
        fun commitBrightness(fraction: Float) {
            val pct = (fraction.coerceIn(0f, 1f) * 100).roundToInt()
            if (pct <= 0) {
                ctx.client.callService(ServiceCall(domain = "light", service = "turn_off", entityId = entityId))
            } else {
                ctx.client.callService(ServiceCall.of("light", "turn_on", entityId, "brightness_pct" to pct))
            }
        }

        when (config.string("layout")) {
            "horizontal" -> HorizontalLayout(name, stateLabel, icon, iconBg, iconTint, gestureModifier)
            "vertical" -> VerticalLayout(name, stateLabel, icon, iconBg, iconTint, gestureModifier)
            else ->
                DefaultLayout(
                    name,
                    stateLabel,
                    icon,
                    iconBg,
                    iconTint,
                    showBar,
                    (brightnessPct ?: 0) / 100f,
                    barColor,
                    gestureModifier,
                    entityId,
                    ::commitBrightness,
                )
        }

        if (showDetail) {
            LightDetailDialog(
                entityId = entityId,
                name = name,
                e = e,
                client = ctx.client,
                onClose = { showDetail = false },
            )
        }
    }
}

// ---- shared pieces ---------------------------------------------------------

@Composable
private fun LightIcon(
    icon: ImageVector,
    bg: Color,
    tint: Color,
    size: Dp = 42.dp,
) {
    Box(
        modifier =
            Modifier
                .size(size)
                .clip(RoundedCornerShape(12.dp))
                .background(bg),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint)
    }
}

@Composable
private fun NameState(
    name: String,
    stateLabel: String,
    horizontalAlignment: Alignment.Horizontal = Alignment.Start,
    textAlign: TextAlign = TextAlign.Start,
) {
    Column(horizontalAlignment = horizontalAlignment) {
        Text(
            name,
            color = Color(0xFFE6F0F1),
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            textAlign = textAlign,
        )
        Text(stateLabel, color = Color(0xFF93AFB6), fontSize = 13.sp, textAlign = textAlign)
    }
}

/**
 * Brightness bar, doubling as a horizontal slider: drag or tap anywhere on
 * it to raise/lower brightness right from the card, no dialog needed. The
 * fraction shown always follows the live entity state except mid-drag, where
 * it tracks the finger for immediate feedback until release commits it.
 */
@Composable
private fun BrightnessBar(
    entityId: String,
    fraction: Float,
    color: Color,
    onCommit: (Float) -> Unit,
) {
    var dragFraction by remember(entityId) { mutableStateOf<Float?>(null) }
    val shownFraction = dragFraction ?: fraction
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .height(20.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFF152B33))
                .pointerInput(entityId) {
                    detectHorizontalDragGestures(
                        onDragEnd = {
                            dragFraction?.let(onCommit)
                            dragFraction = null
                        },
                        onDragCancel = { dragFraction = null },
                    ) { change, _ ->
                        dragFraction = (change.position.x / size.width).coerceIn(0f, 1f)
                    }
                }
                .pointerInput(entityId) {
                    detectTapGestures { offset ->
                        val f = (offset.x / size.width).coerceIn(0f, 1f)
                        dragFraction = f
                        onCommit(f)
                        dragFraction = null
                    }
                },
    ) {
        Box(
            modifier =
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(shownFraction.coerceIn(0.02f, 1f))
                    .clip(RoundedCornerShape(10.dp))
                    .background(color),
        )
    }
}

// ---- "default": icon + name/state row, brightness bar full-width below ----

@Composable
private fun DefaultLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    showBar: Boolean,
    barFraction: Float,
    barColor: Color,
    gestureModifier: Modifier,
    entityId: String,
    onBrightnessCommit: (Float) -> Unit,
) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFF1E3841))
                .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().then(gestureModifier)) {
            LightIcon(icon, iconBg, iconTint)
            Spacer(Modifier.width(12.dp))
            NameState(name, stateLabel)
        }
        // Slider lives outside gestureModifier's tap/long-press area so
        // dragging it doesn't also toggle the light or open the dialog.
        if (showBar) BrightnessBar(entityId, barFraction, barColor, onBrightnessCommit)
    }
}

// ---- "horizontal": icon + name/state, single row --------------------------

@Composable
private fun HorizontalLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    gestureModifier: Modifier,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFF1E3841))
                .then(gestureModifier)
                .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LightIcon(icon, iconBg, iconTint)
        Spacer(Modifier.width(12.dp))
        Box(Modifier.weight(1f)) { NameState(name, stateLabel) }
    }
}

// ---- "vertical": icon, name, state — all centered and stacked -------------

@Composable
private fun VerticalLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    gestureModifier: Modifier,
) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFF1E3841))
                .then(gestureModifier)
                .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        LightIcon(icon, iconBg, iconTint, size = 48.dp)
        Spacer(Modifier.height(8.dp))
        NameState(name, stateLabel, horizontalAlignment = Alignment.CenterHorizontally, textAlign = TextAlign.Center)
    }
}
