package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer

/**
 * Apple TV remote styled like a Siri Remote.
 *
 * Features a circular trackpad (d-pad + select), Menu/Home buttons, and Play/Pause.
 * Commands bypass Home Assistant and route straight to the Harmony hub via `ctx.sendHarmonyCommand`.
 *
 * Config shape:
 * ```json
 * { "type": "apple_tv_remote", "options": { "deviceId": "62846050", "hub": "<localId>" } }
 * ```
 * `hub` is optional — a HarmonyHubConfig.localId; omit it to use the first configured hub.`
 */
class AppleTvRemoteCard : CardRenderer {
    override val type = "apple_tv_remote"

    @Composable
    override fun Render(
        config: CardConfig,
        ctx: CardContext,
    ) {
        val deviceId = config.string("deviceId") ?: return
        val hub = config.string("hub") // HarmonyHubConfig.localId; falls back to the first hub if absent

        fun send(command: String) = ctx.sendHarmonyCommand(deviceId, command, hub)

        var isPlaying by remember { mutableStateOf(true) }

        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFF161616))
                    .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Trackpad(
                onUp = { send("DirectionUp") },
                onDown = { send("DirectionDown") },
                onLeft = { send("DirectionLeft") },
                onRight = { send("DirectionRight") },
                onSelect = { send("Select") },
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                PillButton(icon = Icons.Filled.Menu, label = "Menu") { send("Menu") }
                PillButton(label = "Home") { send("Home") }
            }

            Box(
                modifier =
                    Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF2A2A2A))
                        .clickable {
                            send(if (isPlaying) "Pause" else "Play")
                            isPlaying = !isPlaying
                        },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = Color(0xFFE6E6E6),
                )
            }
        }
    }

    @Composable
    private fun Trackpad(
        onUp: () -> Unit,
        onDown: () -> Unit,
        onLeft: () -> Unit,
        onRight: () -> Unit,
        onSelect: () -> Unit,
    ) {
        Box(
            modifier =
                Modifier
                    .size(220.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF232323))
                    .clickable(onClick = onSelect),
            contentAlignment = Alignment.Center,
        ) {
            EdgeIcon(Icons.Filled.KeyboardArrowUp, Alignment.TopCenter, onUp)
            EdgeIcon(Icons.Filled.KeyboardArrowDown, Alignment.BottomCenter, onDown)
            EdgeIcon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, Alignment.CenterStart, onLeft)
            EdgeIcon(Icons.AutoMirrored.Filled.KeyboardArrowRight, Alignment.CenterEnd, onRight)
            Box(
                modifier =
                    Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF303030)),
            )
        }
    }

    @Composable
    private fun EdgeIcon(
        icon: ImageVector,
        align: Alignment,
        onClick: () -> Unit,
    ) {
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(14.dp),
            contentAlignment = align,
        ) {
            Box(
                modifier =
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .clickable(onClick = onClick),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = Color(0xFF9A9A9A))
            }
        }
    }

    @Composable
    private fun PillButton(
        icon: ImageVector? = null,
        label: String,
        onClick: () -> Unit,
    ) {
        Row(
            modifier =
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xFF2A2A2A))
                    .clickable(onClick = onClick)
                    .padding(horizontal = 18.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            icon?.let { Icon(it, contentDescription = null, tint = Color(0xFFE6E6E6)) }
            Text(label, color = Color(0xFFE6E6E6), fontSize = 13.sp, fontWeight = FontWeight.Medium)
        }
    }
}
