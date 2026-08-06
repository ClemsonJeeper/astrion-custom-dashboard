package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.Blinds
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.R
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.HaLabels
import com.custom.astrion.ha.ServiceCall

/**
 * Cover / curtain card: open / stop / close buttons plus a position readout.
 *
 * Uses cover.open_cover / cover.close_cover / cover.stop_cover.
 *
 * Config: CardConfig("cover", mapOf("entity_id" to "cover.living_room", "name" to "Curtains"))
 */
class CoverCard : CardRenderer {
    override val type = "cover"

    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val entityId = config.string("entity_id") ?: return
        val e = ctx.entities[entityId]
        val name = config.string("name") ?: e?.friendlyName ?: entityId
        val position = e?.attrInt("current_position") // 0..100
        val stateLabel = position?.let { "$it% open" } ?: (e?.state ?: "—")

        fun call(service: String) {
            ctx.client.callService(ServiceCall(domain = "cover", service = service, entityId = entityId))
        }

        // Mushroom horizontal: icon + name/state on the left, controls on the right.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFF1E3841))
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF2A4954)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Blinds, contentDescription = null, tint = Color(0xFFB6C9CE))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    name,
                    color = Color(0xFFE6F0F1),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                )
                Text(stateLabel, color = Color(0xFF93AFB6), fontSize = 13.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CircleBtn(Icons.Filled.KeyboardArrowUp) { call("open_cover") }
                CircleBtn(Icons.Filled.Stop) { call("stop_cover") }
                CircleBtn(Icons.Filled.KeyboardArrowDown) { call("close_cover") }
            }
        }
    }
}

/**
 * Fan card. Two layouts, auto-picked from what the entity actually reports
 * (or forced via the `style` option):
 *
 * - **simple** (default when the entity has neither `preset_modes` nor
 *   `oscillating`): the original compact single-row tile — tap to toggle,
 *   chevrons step `percentage` up/down. Unchanged behavior for plain
 *   percentage-only fans.
 * - **full** (auto-picked when the entity reports `preset_modes` and/or an
 *   `oscillating` attribute — e.g. many Xiaomi/Smart-Fan integrations, which
 *   drive speed via named presets like "Level 1".."Level 4" rather than a
 *   0-100 percentage): a bigger card with a dedicated power button, preset
 *   chips (or a percentage stepper if there are no presets), and an
 *   oscillate on/off toggle.
 *
 * Uses fan.toggle, fan.set_percentage, fan.set_preset_mode, and fan.oscillate.
 *
 * Config shape:
 * ```json
 * {
 *   "type": "fan",
 *   "options": {
 *     "entity_id": "fan.mi_smart_standing_fan_2",
 *     "name": "Standing fan",
 *     "style": "auto",
 *     "preset_modes": ["Level 1", "Level 2", "Level 3", "Level 4"],
 *     "step": 20
 *   }
 * }
 * ```
 * `style` — `"auto"` (default), `"simple"`, or `"full"`. `preset_modes` is an
 * optional override (order respected), same pattern as `ClimateCard`'s
 * `fan_modes`/`swing_modes`: normally read straight from the entity so it
 * always matches what the device actually supports. `"off"` is always
 * excluded from the preset chips — the card's own power button covers it.
 */
class FanCard : CardRenderer {
    override val type = "fan"

    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val entityId = config.string("entity_id") ?: return
        val e = ctx.entities[entityId]
        val name = config.string("name") ?: e?.friendlyName ?: entityId
        val on = e?.isOn == true
        val percentage = e?.attrInt("percentage")
        val step = (config.options["step"] as? Number)?.toInt()
            ?: e?.attrInt("percentage_step")
            ?: 20
        val presetModes = config.stringList("preset_modes")
            .ifEmpty { e?.attrStringList("preset_modes").orEmpty() }
            .filter { !it.equals("off", ignoreCase = true) }
        val presetMode = e?.attrString("preset_mode")
        // Presence of the attribute (not its value) is what indicates support —
        // a fan that can't oscillate simply doesn't report this attribute at all.
        val oscillateSupported = e?.attr("oscillating") != null
        val oscillating = e?.attrBoolean("oscillating") == true

        val styleOpt = config.string("style")
        val useFull = styleOpt == "full" || (styleOpt != "simple" && (presetModes.isNotEmpty() || oscillateSupported))
        val showCaptions = config.options["show_captions"] as? Boolean ?: true

        fun setPercentage(p: Int) = ctx.client.callService(
            ServiceCall.of("fan", "set_percentage", entityId, "percentage" to p.coerceIn(0, 100))
        )
        fun setPreset(m: String) = ctx.client.callService(
            ServiceCall.of("fan", "set_preset_mode", entityId, "preset_mode" to m)
        )
        fun setOscillate(v: Boolean) = ctx.client.callService(
            ServiceCall.of("fan", "oscillate", entityId, "oscillating" to v)
        )

        if (!useFull) {
            val pct = percentage ?: 0
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(if (on) Color(0xFF2B3A67) else Color(0xFF1E3841))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { ctx.client.toggle(entityId) }
                ) {
                    Text(name, color = Color(0xFFE6F0F1), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        if (on) "$pct%" else stringResource(R.string.state_off),
                        color = Color(0xFF93AFB6),
                        fontSize = 13.sp,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CircleBtn(Icons.Filled.KeyboardArrowDown) { setPercentage(pct - step) }
                    CircleBtn(Icons.Filled.KeyboardArrowUp) { setPercentage(pct + step) }
                }
            }
            return
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(Color(0xFF1B343D))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Header: name + a dedicated power button (mirrors ClimateCard).
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(name, color = Color(0xFFE6F0F1), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(if (on) Color(0xFF1E3A2E) else Color(0xFF3A2E2E))
                        .clickable { ctx.client.toggle(entityId) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Filled.PowerSettingsNew,
                        contentDescription = "Power",
                        tint = if (on) Color(0xFF9BE7C4) else Color(0xFFE06767),
                        modifier = Modifier.size(20.dp),
                    )
                }
            }

            // Speed: preset chips if the entity has named presets, else a
            // plain percentage stepper (same control as simple mode).
            if (presetModes.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (showCaptions) {
                        Text(
                            stringResource(R.string.fan_preset_caption),
                            color = Color(0xFF6D8891),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        balancedChunks(presetModes, maxPerRow = 4).forEach { row ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                row.forEach { m ->
                                    FanChip(
                                        label = m,
                                        selected = on && presetMode?.equals(m, ignoreCase = true) == true,
                                        modifier = Modifier.weight(1f),
                                    ) { setPreset(m) }
                                }
                            }
                        }
                    }
                }
            } else if (percentage != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircleBtn(Icons.Filled.KeyboardArrowDown) { setPercentage(percentage - step) }
                    Text(
                        "$percentage%",
                        color = Color(0xFFE6F0F1),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    CircleBtn(Icons.Filled.KeyboardArrowUp) { setPercentage(percentage + step) }
                }
            }

            // Oscillate toggle.
            if (oscillateSupported) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (showCaptions) {
                        Text(
                            stringResource(R.string.fan_oscillate_caption),
                            color = Color(0xFF6D8891),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    FanChip(
                        // Reuses ClimateCard's swing_mode "on"/"off" translation —
                        // same concept (oscillation on/off), no need for a second key.
                        label = HaLabels.swingMode(if (oscillating) "on" else "off"),
                        selected = oscillating,
                        modifier = Modifier.fillMaxWidth(),
                    ) { setOscillate(!oscillating) }
                }
            }
        }
    }
}

/** Small text-only chip, shared by [FanCard]'s preset and oscillate rows. */
@Composable
private fun FanChip(
    label: String,
    selected: Boolean,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .height(34.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) Color(0xFF4C6EF5) else Color(0xFF23414B))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (selected) Color.White else Color(0xFF93AFB6),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

/**
 * Split [items] into rows of at most [maxPerRow], balanced (e.g. 5 items @
 * max 4 -> 3+2, not a lopsided 4+1). Shared by [FanCard]; [ClimateCard] has
 * its own private copy of the same logic.
 */
private fun <T> balancedChunks(items: List<T>, maxPerRow: Int): List<List<T>> {
    if (items.isEmpty()) return emptyList()
    val rows = (items.size + maxPerRow - 1) / maxPerRow
    val perRow = (items.size + rows - 1) / rows
    return items.chunked(perRow)
}

/**
 * Switch tile: simple toggle. Works for switch.* (and anything toggleable).
 *
 * Config: CardConfig("switch", mapOf("entity_id" to "switch.porch", "name" to "Porch"))
 */
class SwitchCard : CardRenderer {
    override val type = "switch"

    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val entityId = config.string("entity_id") ?: return
        val e = ctx.entities[entityId]
        val name = config.string("name") ?: e?.friendlyName ?: entityId
        val on = e?.isOn == true
        val icon = switchIcon(config.string("icon"))
        // On-state background (e.g. a semi-transparent dark red for a heater).
        val onColor = parseColor(config.options["on_color"]) ?: Color(0xFF2E5A46)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(if (on) onColor else Color(0xFF1E3841))
                .clickable { ctx.client.toggle(entityId) }
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Leading icon box, matching the cover tiles below it.
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF2A4954)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = if (on) Color(0xFFE79A9A) else Color(0xFFB6C9CE))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(name, color = Color(0xFFE6F0F1), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    if (on) stringResource(R.string.state_on) else stringResource(R.string.state_off),
                    color = Color(0xFF93AFB6),
                    fontSize = 13.sp,
                )
            }
        }
    }
}

/** Map a switch card's `icon` option name to a Material icon. */
private fun switchIcon(name: String?): ImageVector = when (name) {
    "heater", "heat" -> Icons.Filled.Whatshot
    "fan" -> Icons.Filled.Air
    "bulb", "light" -> Icons.Filled.Lightbulb
    else -> Icons.Filled.PowerSettingsNew
}

/** Parse an `on_color` option: a hex string ("#AARRGGBB") or an ARGB number. */
private fun parseColor(v: Any?): Color? = when (v) {
    is Number -> Color(v.toLong())
    is String -> v.removePrefix("#").toLongOrNull(16)?.let { Color(it) }
    else -> null
}

/** Shared small circular icon button used by the tile cards above. */
@Composable
private fun CircleBtn(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(Color(0xFF2C4C58))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = Color(0xFFCBDCE0))
    }
}