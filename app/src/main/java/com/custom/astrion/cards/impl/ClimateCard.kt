package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.ServiceCall

/**
 * Climate / thermostat card.
 *
 * Big setpoint readout with +/- steppers, current temperature, and a row of
 * HVAC mode chips read live from the entity's `hvac_modes` attribute.
 *
 * Uses:
 *   climate.set_temperature { entity_id, temperature }
 *   climate.set_hvac_mode   { entity_id, hvac_mode }
 *
 * Config shape:
 *   CardConfig("climate", mapOf(
 *       "entity_id" to "climate.lounge",
 *       "step" to 0.5,          // optional, default 0.5
 *   ))
 */
class ClimateCard : CardRenderer {
    override val type = "climate"

    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val entityId = config.string("entity_id") ?: return
        val e = ctx.entities[entityId]
        // Prefer the entity's real step; a 1° aircon ignores 0.5° changes and
        // the down button looks broken (25.5 rounds back to 26).
        val step = e?.attrDouble("target_temp_step")
            ?: (config.options["step"] as? Number)?.toDouble()
            ?: 1.0
        val minT = e?.attrDouble("min_temp")
        val maxT = e?.attrDouble("max_temp")

        val target = e?.attrDouble("temperature")
        val current = e?.attrDouble("current_temperature")
        val mode = e?.state ?: "off"
        val modes = e?.attrStringList("hvac_modes") ?: emptyList()
        val name = config.string("name") ?: e?.friendlyName ?: entityId
        val fanMode = e?.attrString("fan_mode")
        val fanModes = config.stringList("fan_modes").ifEmpty { listOf("low", "medium", "high", "auto") }

        fun setTemp(t: Double) {
            val clamped = t.coerceIn(minT ?: t, maxT ?: t)
            ctx.client.callService(
                ServiceCall.of("climate", "set_temperature", entityId, "temperature" to clamped)
            )
        }
        fun setMode(m: String) {
            ctx.client.callService(
                ServiceCall.of("climate", "set_hvac_mode", entityId, "hvac_mode" to m)
            )
        }
        fun setFan(f: String) {
            ctx.client.callService(
                ServiceCall.of("climate", "set_fan_mode", entityId, "fan_mode" to f)
            )
        }
        fun turnOff() {
            ctx.client.callService(ServiceCall("climate", "turn_off", entityId))
        }

        val isOff = mode == "off"

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(Color(0xFF1B343D))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // Header: name + a dedicated off button.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(name, color = Color(0xFFE6F0F1), fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(if (isOff) Color(0xFF3A2E2E) else Color(0xFF2C4C58))
                        .clickable { turnOff() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Filled.PowerSettingsNew,
                        contentDescription = "Off",
                        tint = if (isOff) Color(0xFFE06767) else Color(0xFFCBDCE0),
                    )
                }
            }

            // Setpoint with steppers
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Stepper(Icons.Filled.Remove) { target?.let { setTemp(it - step) } }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        target?.let { "${trim(it)}°" } ?: "—",
                        color = Color(0xFFE6F0F1),
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        current?.let { "Now ${trim(it)}°" } ?: "",
                        color = Color(0xFF93AFB6),
                        fontSize = 13.sp,
                    )
                }

                Stepper(Icons.Filled.Add) { target?.let { setTemp(it + step) } }
            }

            // HVAC mode chips
            if (modes.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    modes.take(4).forEach { m ->
                        ModeChip(
                            label = m.replaceFirstChar { it.uppercase() },
                            selected = m == mode,
                            modifier = Modifier.weight(1f),
                        ) { setMode(m) }
                    }
                }
            }

            // Fan mode chips
            if (fanModes.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    fanModes.forEach { f ->
                        ModeChip(
                            label = f.replaceFirstChar { it.uppercase() },
                            selected = fanMode?.equals(f, ignoreCase = true) == true,
                            modifier = Modifier.weight(1f),
                        ) { setFan(f) }
                    }
                }
            }
        }
    }

    private fun trim(d: Double): String =
        if (d == d.toLong().toDouble()) d.toLong().toString() else d.toString()

    @Composable
    private fun Stepper(
        icon: androidx.compose.ui.graphics.vector.ImageVector,
        onClick: () -> Unit,
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(Color(0xFF2C4C58))
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = Color(0xFFCBDCE0))
        }
    }

    @Composable
    private fun ModeChip(
        label: String,
        selected: Boolean,
        modifier: Modifier,
        onClick: () -> Unit,
    ) {
        Box(
            modifier = modifier
                .height(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (selected) Color(0xFF4C6EF5) else Color(0xFF23414B))
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                label,
                color = if (selected) Color.White else Color(0xFF93AFB6),
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}
