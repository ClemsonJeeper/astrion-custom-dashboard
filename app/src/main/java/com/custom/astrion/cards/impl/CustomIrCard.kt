package com.custom.astrion.cards.impl

import android.content.Context
import android.hardware.ConsumerIrManager
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer

/**
 * Grid of IR buttons sent locally via ConsumerIrManager.
 *
 * Transmits directly through the device's built-in IR blaster.
 * Operates offline without Home Assistant or a Harmony hub.
 *
 * Config shape:
 * ```json
 * {
 *   "type": "custom_ir",
 *   "options": {
 *     "columns": 2,
 *     "buttons": [
 *       { "name": "TV Power", "freq": 38029, "pattern": [9098,4575,552,579] }
 *     ]
 *   }
 * }
 * ```
 */
@Suppress("SpellCheckingInspection")
class CustomIrCard : CardRenderer {
    override val type = "custom_ir"

    @Suppress("UNCHECKED_CAST")
    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val context = LocalContext.current
        val columns = config.int("columns", 2).coerceAtLeast(1)
        val buttons = (config.options["buttons"] as? List<Map<String, Any?>>) ?: emptyList()

        val irManager = remember {
            context.getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager
        }
        val hasEmitter = runCatching { irManager?.hasIrEmitter() }.getOrNull() == true
        val carrierFreqs = runCatching { irManager?.carrierFrequencies }.getOrNull()
        Log.d("CustomIrCard", "irManager=$irManager hasEmitter=$hasEmitter carrierFrequencies=${carrierFreqs?.contentToString()}")

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (!hasEmitter) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF5C2B2B))
                        .padding(10.dp),
                ) {
                    Text(
                        "Pas de blaster IR détecté sur cet appareil (hasIrEmitter=false)",
                        color = Color(0xFFFFD3D3),
                        fontSize = 13.sp,
                    )
                }
            }

            buttons.chunked(columns).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    row.forEach { b ->
                        IrButton(b, Modifier.weight(1f), enabled = hasEmitter) {
                            transmit(irManager, b)
                        }
                    }
                    repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }

    private fun transmit(irManager: ConsumerIrManager?, b: Map<String, Any?>) {
        val name = b["name"] as? String ?: "?"
        if (irManager == null) {
            Log.e("CustomIrCard", "[$name] irManager est null")
            return
        }
        val freq = (b["freq"] as? Number)?.toInt()
        if (freq == null) {
            Log.e("CustomIrCard", "[$name] pas de 'freq' dans la config")
            return
        }
        val rawPattern = (b["pattern"] as? List<Any?>)
        val pattern = rawPattern?.mapNotNull { (it as? Number)?.toInt() }?.toIntArray()
        if (pattern == null || pattern.isEmpty()) {
            Log.e("CustomIrCard", "[$name] pattern vide ou invalide")
            return
        }
        Log.d("CustomIrCard", "[$name] transmit freq=$freq, ${pattern.size} valeurs, total=${pattern.sum()}µs")
        runCatching { irManager.transmit(freq, pattern) }
            .onSuccess { Log.d("CustomIrCard", "[$name] transmit() OK") }
            .onFailure { Log.e("CustomIrCard", "[$name] transmit() a échoué", it) }
    }

    @Composable
    private fun IrButton(
        b: Map<String, Any?>,
        modifier: Modifier,
        enabled: Boolean,
        onClick: () -> Unit,
    ) {
        val name = b["name"] as? String ?: "?"
        Box(
            modifier = modifier
                .height(48.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(if (enabled) Color(0xFF2A4954) else Color(0xFF3A3A3A))
                .clickable(enabled = enabled, onClick = onClick)
                .padding(6.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                name,
                color = Color(0xFFE6F0F1),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
        }
    }
}