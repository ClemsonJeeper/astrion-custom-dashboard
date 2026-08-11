package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
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
import com.custom.astrion.ha.HaLabels
import com.custom.astrion.ha.ServiceCall
import com.custom.astrion.ui.icons.MdiIcons

/**
 * Cover / curtain card: open / stop / close controls plus a position readout —
 * styled after Home Assistant's Mushroom cover card, including its 3 layout
 * options.
 *
 * Long-press anywhere on the tile (outside the open/stop/close buttons) opens
 * CoverDetailDialog, where the position can be dragged to an exact percentage
 * or set via 25/50/75% quick presets — mirrors LightCard's long-press-for-detail
 * pattern.
 *
 * Uses cover.open_cover / cover.close_cover / cover.stop_cover / cover.set_cover_position.
 *
 * Config shape:
 *   { "type": "cover", "options": {
 *       "entity_id": "cover.living_room", "name": "Curtains",
 *       "layout": "default"
 *       //   "default"    — icon + name/state row, open/stop/close buttons
 *       //                  full-width on their own row below (Mushroom's
 *       //                  own default look)
 *       //   "horizontal" — icon + name/state on the left, buttons inline on
 *       //                  the right, single row (this card's previous —
 *       //                  and only — layout)
 *       //   "vertical"   — icon, name, state and buttons all centered and
 *       //                  stacked in one column
 *   } }
 */
class CoverCard : CardRenderer {
    override val type = "cover"

    @Composable
    override fun Render(config: CardConfig, ctx: CardContext) {
        val entityId = config.string("entity_id") ?: return
        val e = ctx.entities[entityId]
        val name = config.string("name") ?: e?.friendlyName ?: entityId
        val position = e?.attrInt("current_position") // 0..100
        val rawState = e?.state ?: "unknown"

        // A cover with no position attribute (some cover devices don't report
        // one) falls back to its raw open/closed state instead.
        val isOpen = position?.let { it >= 100 } ?: (rawState == "open")
        val isClosed = position?.let { it <= 0 } ?: (rawState == "closed")
        // Only 2 icon variants exist (fully open / fully closed shutter) — show
        // "closed" only when truly closed (0%); anything else (1-99%, or fully
        // open) reads as "open" since the shutter isn't down. isOpen/isClosed
        // themselves stay tied to the exact 0/100 thresholds for the status
        // label and the up/down button enable state below.
        val showOpenIcon = !isClosed
        // Previously went blank (null icon) while rawState was "opening"/
        // "closing", to avoid showing a stale open/closed icon mid-move. That
        // backfired: HA's opening/closing state itself lags the real motor by
        // several seconds, so the icon sat blank for that whole stretch — a
        // worse look than a briefly-stale icon. The up/down/stop buttons in
        // ControlsRow are the actual real-time affordance (their enabled state
        // still updates live off isOpen/isClosed); this icon just reflects the
        // last known open/closed state, full stop.
        val coverIcon = if (showOpenIcon) MdiIcons.WindowShutterOpen else MdiIcons.WindowShutterClosed

        val stateLabel = when {
            position == 100 -> stringResource(R.string.cover_open)
            position == 0 -> stringResource(R.string.cover_closed)
            position != null -> stringResource(R.string.cover_position_open, position)
            else -> HaLabels.coverState(rawState)
        }

        fun call(service: String) {
            ctx.client.callService(ServiceCall(domain = "cover", service = service, entityId = entityId))
        }

        // Long-press anywhere on the tile opens the detail dialog — same
        // gesture LightCard uses to open LightDetailDialog.
        var showDetail by remember { mutableStateOf(false) }
        val gestureModifier =
            Modifier.pointerInput(entityId) {
                detectTapGestures(onLongPress = { showDetail = true })
            }

        when (config.string("layout")) {
            "horizontal" -> HorizontalLayout(name, stateLabel, coverIcon, isOpen, isClosed, ::call, gestureModifier)
            "vertical" -> VerticalLayout(name, stateLabel, coverIcon, isOpen, isClosed, ::call, gestureModifier)
            else -> DefaultLayout(name, stateLabel, coverIcon, isOpen, isClosed, ::call, gestureModifier)
        }

        if (showDetail) {
            CoverDetailDialog(
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
private fun CoverIcon(icon: ImageVector, size: Dp = 42.dp) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF2A4954)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = Color(0xFFB6C9CE))
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

/** Up is disabled once fully open, down is disabled once fully closed — stop is always available. */
@Composable
private fun ControlsRow(
    isOpen: Boolean,
    isClosed: Boolean,
    call: (String) -> Unit,
    modifier: Modifier = Modifier,
    arrangement: Arrangement.Horizontal = Arrangement.spacedBy(8.dp),
) {
    Row(modifier = modifier, horizontalArrangement = arrangement) {
        CircleBtn(MdiIcons.CoverUp, enabled = !isOpen) { call("open_cover") }
        CircleBtn(Icons.Filled.Stop) { call("stop_cover") }
        CircleBtn(MdiIcons.CoverDown, enabled = !isClosed) { call("close_cover") }
    }
}

@Composable
private fun CircleBtn(
    icon: ImageVector,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(Color(0xFF2C4C58))
            .alpha(if (enabled) 1f else 0.35f)
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = Color(0xFFCBDCE0))
    }
}

// ---- "default": icon + name/state row, buttons full-width below -----------

@Composable
private fun DefaultLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    isOpen: Boolean,
    isClosed: Boolean,
    call: (String) -> Unit,
    gestureModifier: Modifier = Modifier,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF1E3841))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().then(gestureModifier)) {
            CoverIcon(icon)
            Spacer(Modifier.width(12.dp))
            NameState(name, stateLabel)
        }
        ControlsRow(
            isOpen,
            isClosed,
            call,
            modifier = Modifier.fillMaxWidth(),
            arrangement = Arrangement.SpaceEvenly,
        )
    }
}

// ---- "horizontal": icon + name/state on the left, buttons on the right ----

@Composable
private fun HorizontalLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    isOpen: Boolean,
    isClosed: Boolean,
    call: (String) -> Unit,
    gestureModifier: Modifier = Modifier,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF1E3841))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.then(gestureModifier)) { CoverIcon(icon) }
        Spacer(Modifier.width(12.dp))
        Box(Modifier.weight(1f).then(gestureModifier)) { NameState(name, stateLabel) }
        ControlsRow(isOpen, isClosed, call)
    }
}

// ---- "vertical": icon, name, state, buttons — all centered and stacked ----

@Composable
private fun VerticalLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    isOpen: Boolean,
    isClosed: Boolean,
    call: (String) -> Unit,
    gestureModifier: Modifier = Modifier,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF1E3841))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().then(gestureModifier)) {
            CoverIcon(icon, size = 48.dp)
            Spacer(Modifier.height(8.dp))
            NameState(name, stateLabel, horizontalAlignment = Alignment.CenterHorizontally, textAlign = TextAlign.Center)
        }
        Spacer(Modifier.height(10.dp))
        ControlsRow(isOpen, isClosed, call)
    }
}
