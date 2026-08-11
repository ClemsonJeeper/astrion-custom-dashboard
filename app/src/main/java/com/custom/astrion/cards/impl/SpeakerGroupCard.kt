package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Speaker
import androidx.compose.material.icons.filled.VolumeDown
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.ServiceCall
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlin.math.roundToInt

/**
 * Sonos-style speaker group + volume controller.
 *
 * One row per speaker: a check circle showing LIVE group membership (tick =
 * grouped with the master), the name, current volume as a bar + percentage,
 * and mute / vol- / vol+ buttons per speaker.
 *
 * Ticking a speaker immediately fires `media_player.join` against the master
 * (no apply step); unticking fires `media_player.unjoin` on that speaker.
 *
 * Group state is read from the SPEAKER's own `group_members` attribute
 * (checked = it contains the master's entity id). This is deliberate: some
 * Sonos setups expose alias entity ids inside `group_members`, so checking
 * "is the speaker in the master's list" can never match — the reverse
 * containment is robust, and it also means speakers only ever show as grouped
 * while the master is actually part of a group right now.
 *
 * Config shape:
 *   { "type": "speaker_group", "options": {
 *       "master": "media_player.living_room",
 *       "name": "Living Room",
 *       "speakers": [
 *         { "entity_id": "media_player.kitchen", "name": "Kitchen" },
 *         { "entity_id": "media_player.bedroom", "name": "Bedroom" }
 *       ]
 *   } }
 */
class SpeakerGroupCard : CardRenderer {
    override val type = "speaker_group"

    @Suppress("UNCHECKED_CAST")
    @Composable
    override fun Render(
        config: CardConfig,
        ctx: CardContext,
    ) {
        val master = config.string("master") ?: return
        val speakers = (config.options["speakers"] as? List<Map<String, Any?>>) ?: emptyList()

        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color(0xFF1B343D))
                    .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                "Speakers",
                color = Color(0xFF93AFB6),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.sp,
            )
            SpeakerRow(ctx, master, config.string("name"), isMaster = true, master = master)
            speakers.forEach { sp ->
                val id = sp["entity_id"] as? String ?: return@forEach
                SpeakerRow(ctx, id, sp["name"] as? String, isMaster = false, master = master)
            }
        }
    }

    @Composable
    private fun SpeakerRow(
        ctx: CardContext,
        entityId: String,
        name: String?,
        isMaster: Boolean,
        master: String,
    ) {
        val e = ctx.entities[entityId]
        val label = name ?: e?.friendlyName ?: entityId
        val vol = e?.attrDouble("volume_level")
        val muted = (e?.attr("is_volume_muted") as? JsonPrimitive)?.booleanOrNull == true
        val members = e?.attrStringList("group_members") ?: emptyList()
        // Grouped = this speaker's own group contains the master (and it isn't
        // just a group of itself).
        val grouped = !isMaster && members.contains(master) && members.size > 1

        fun toggleGroup() {
            if (grouped) {
                ctx.client.callService(ServiceCall("media_player", "unjoin", entityId))
            } else {
                ctx.client.callService(
                    ServiceCall(
                        "media_player",
                        "join",
                        master,
                        mapOf("group_members" to JsonArray(listOf(JsonPrimitive(entityId)))),
                    ),
                )
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            // Name row: membership tick, name, volume %.
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (isMaster) {
                    Icon(
                        Icons.Filled.Speaker,
                        contentDescription = null,
                        tint = Color(0xFF6EA8FE),
                        modifier = Modifier.size(24.dp),
                    )
                } else {
                    Icon(
                        if (grouped) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                        contentDescription = if (grouped) "Ungroup" else "Group",
                        tint = if (grouped) Color(0xFF6EA8FE) else Color(0xFF5A7783),
                        modifier =
                            Modifier
                                .size(26.dp)
                                .clip(CircleShape)
                                .clickable { toggleGroup() },
                    )
                }
                Text(
                    label,
                    color = Color(0xFFE6F0F1),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    when {
                        muted -> "Muted"
                        vol != null -> "${(vol * 100).roundToInt()}%"
                        else -> "—"
                    },
                    color = if (muted) Color(0xFFE79A9A) else Color(0xFF93AFB6),
                    fontSize = 12.sp,
                )
            }
            // Volume bar — tap or drag to set this speaker's volume.
            VolumeBar(entityId, vol, muted, ctx)
            // Controls: mute / vol- / vol+.
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SmallBtn(Icons.Filled.VolumeOff, active = muted) {
                    ctx.client.callService(
                        ServiceCall.of("media_player", "volume_mute", entityId, "is_volume_muted" to !muted),
                    )
                }
                SmallBtn(Icons.Filled.VolumeDown) {
                    ctx.client.callService(ServiceCall("media_player", "volume_down", entityId))
                }
                SmallBtn(Icons.Filled.VolumeUp) {
                    ctx.client.callService(ServiceCall("media_player", "volume_up", entityId))
                }
            }
        }
    }

    /** Tap/drag volume bar. Local state responds instantly; commits to HA. */
    @Composable
    private fun VolumeBar(
        entityId: String,
        vol: Double?,
        muted: Boolean,
        ctx: CardContext,
    ) {
        val level = (vol ?: 0.0).toFloat().coerceIn(0f, 1f)
        // Re-syncs to the live level whenever HA reports a new one.
        var dragLevel by remember(level) { mutableStateOf(level) }

        fun commit(fraction: Float) {
            ctx.client.callService(
                ServiceCall.of(
                    "media_player",
                    "volume_set",
                    entityId,
                    "volume_level" to fraction.coerceIn(0f, 1f).toDouble(),
                ),
            )
        }

        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(24.dp) // taller touch target than the visible bar
                    .pointerInput(entityId) {
                        detectTapGestures { offset ->
                            val f = (offset.x / size.width).coerceIn(0f, 1f)
                            dragLevel = f
                            commit(f)
                        }
                    }
                    .pointerInput(entityId) {
                        detectHorizontalDragGestures(
                            onDragEnd = { commit(dragLevel) },
                        ) { change, _ ->
                            dragLevel = (change.position.x / size.width).coerceIn(0f, 1f)
                        }
                    },
            contentAlignment = Alignment.CenterStart,
        ) {
            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0xFF152B33)),
            ) {
                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth(dragLevel)
                            .fillMaxHeight()
                            .background(if (muted) Color(0xFF5A7783) else Color(0xFF57C4A3)),
                )
            }
        }
    }

    @Composable
    private fun SmallBtn(
        icon: ImageVector,
        active: Boolean = false,
        onClick: () -> Unit,
    ) {
        Box(
            modifier =
                Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(if (active) Color(0xFF3A2E2E) else Color(0xFF2C4C58))
                    .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (active) Color(0xFFE06767) else Color(0xFFCBDCE0),
                modifier = Modifier.size(18.dp),
            )
        }
    }
}
