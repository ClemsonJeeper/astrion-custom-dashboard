package com.custom.astrion.cards.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
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
import com.custom.astrion.ui.ThemeColors
import com.custom.astrion.ui.icons.MdiIcons
import kotlin.math.roundToInt

/**
 * Cover / curtain card: open / stop / close controls plus a position readout —
 * styled after Home Assistant's Mushroom cover card, including its 3 layout
 * options AND its 3 independently-configurable controls
 * (show_buttons_control / show_position_control / show_tilt_position_control).
 *
 * Long-press anywhere on the tile (outside the controls area) opens
 * CoverDetailDialog, where the position can be dragged to an exact percentage
 * or set via 25/50/75% quick presets — mirrors LightCard's long-press-for-detail
 * pattern.
 *
 * Uses cover.open_cover / cover.close_cover / cover.stop_cover /
 * cover.set_cover_position / cover.set_cover_tilt_position.
 *
 * Config shape:
 *   { "type": "cover", "options": {
 *       "entity_id": "cover.living_room", "name": "Curtains",
 *       "layout": "default"
 *       //   "default"    — icon + name/state row, controls area full-width
 *       //                  below (Mushroom's own default look)
 *       //   "horizontal" — icon + name/state on the left, controls inline on
 *       //                  the right, single row (this card's previous —
 *       //                  and only — layout)
 *       //   "vertical"   — icon, name, state and controls all centered and
 *       //                  stacked in one column
 *
 *       // Mushroom-style controls — same 3 flags as the Mushroom cover
 *       // card, all independent. When none of the 3 are present at all,
 *       // the card falls back to its historical behaviour (buttons always
 *       // shown) so existing configs keep working untouched. As soon as
 *       // ANY of the 3 is set, only what's explicitly enabled shows —
 *       // exactly like Mushroom.
 *       "show_buttons_control": true,          // open/stop/close buttons
 *       "show_position_control": false,        // draggable position slider
 *       "show_tilt_position_control": false,   // draggable tilt slider
 *       //   When more than one control is enabled, only the first is shown
 *       //   at a time; a small chevron button cycles to the next one — same
 *       //   as Mushroom. Position/tilt controls only render when the
 *       //   entity actually reports that attribute.
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
        val tilt = e?.attrInt("current_tilt_position") // 0..100, null if unsupported
        val rawState = e?.state ?: "unknown"

        // A cover with no position attribute (some cover devices don't report
        // one) falls back to its raw open/closed state instead.
        val isOpen = position?.let { it >= 100 } ?: (rawState == "open")
        val isClosed = position?.let { it <= 0 } ?: (rawState == "closed")
        val showOpenIcon = !isClosed
        val coverIcon = if (showOpenIcon) MdiIcons.WindowShutterOpen else MdiIcons.WindowShutterClosed

        val stateLabel =
            when {
                position == 100 -> stringResource(R.string.cover_open)
                position == 0 -> stringResource(R.string.cover_closed)
                position != null -> stringResource(R.string.cover_position_open, position)
                else -> HaLabels.coverState(rawState)
            }

        fun call(service: String) {
            ctx.client.callService(ServiceCall(domain = "cover", service = service, entityId = entityId))
        }

        fun setPosition(pct: Int) {
            ctx.client.callService(ServiceCall.of("cover", "set_cover_position", entityId, "position" to pct))
        }

        fun setTiltPosition(pct: Int) {
            ctx.client.callService(ServiceCall.of("cover", "set_cover_tilt_position", entityId, "tilt_position" to pct))
        }

        // ---- which controls are enabled -----------------------------------
        // Mirrors Mushroom's cover card: 3 independent flags. If none of the
        // 3 keys are present in the config at all, fall back to the
        // historical default (buttons only) so existing dashboards keep
        // rendering exactly as before.
        val opts = config.options
        val hasExplicitControls =
            opts.containsKey("show_buttons_control") ||
                opts.containsKey("show_position_control") ||
                opts.containsKey("show_tilt_position_control")
        val showButtons = config.bool("show_buttons_control", !hasExplicitControls)
        val showPosition = config.bool("show_position_control", false) && position != null
        val showTilt = config.bool("show_tilt_position_control", false) && tilt != null

        val controls =
            buildList {
                if (showButtons) add(CoverControl.BUTTONS)
                if (showPosition) add(CoverControl.POSITION)
                if (showTilt) add(CoverControl.TILT)
            }

        // Long-press anywhere on the tile opens the detail dialog — same
        // gesture LightCard uses to open LightDetailDialog.
        var showDetail by remember { mutableStateOf(false) }
        val tileGestureModifier =
            Modifier.pointerInput(entityId) {
                detectTapGestures(onLongPress = { showDetail = true })
            }

        // Hoisted here (not inside a layout function) so the active-control
        // state survives regardless of which layout renders it.
        var activeControl by remember(entityId) { mutableStateOf(controls.firstOrNull()) }
        val resolvedActive = activeControl?.takeIf { it in controls } ?: controls.firstOrNull()

        val controlsSlot: @Composable (fillWidth: Boolean) -> Unit = { fillWidth ->
            if (controls.isNotEmpty()) {
                Row(
                    modifier = if (fillWidth) Modifier.fillMaxWidth() else Modifier,
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(Modifier.weight(1f, fill = fillWidth)) {
                        when (resolvedActive) {
                            CoverControl.BUTTONS ->
                                ControlsRow(
                                    isOpen,
                                    isClosed,
                                    ::call,
                                    theme = ctx.theme,
                                    modifier = if (fillWidth) Modifier.fillMaxWidth() else Modifier,
                                    arrangement = if (fillWidth) Arrangement.SpaceEvenly else Arrangement.spacedBy(8.dp)
                                )
                            CoverControl.POSITION ->
                                PercentSlider(
                                    entityId = "$entityId-position",
                                    value = position ?: 0,
                                    color = ctx.theme.accent,
                                    theme = ctx.theme,
                                    onCommit = ::setPosition
                                )
                            CoverControl.TILT ->
                                PercentSlider(
                                    entityId = "$entityId-tilt",
                                    value = tilt ?: 0,
                                    color = ctx.theme.success,
                                    theme = ctx.theme,
                                    onCommit = ::setTiltPosition
                                )
                            null -> {}
                        }
                    }
                    if (controls.size > 1) {
                        CycleControlButton(theme = ctx.theme) {
                            val idx = controls.indexOf(resolvedActive)
                            activeControl = controls[(idx + 1) % controls.size]
                        }
                    }
                }
            }
        }

        when (config.string("layout")) {
            "horizontal" -> HorizontalLayout(name, stateLabel, coverIcon, controlsSlot, ctx.theme, modifier = tileGestureModifier)
            "vertical" -> VerticalLayout(name, stateLabel, coverIcon, controlsSlot, ctx.theme, modifier = tileGestureModifier)
            else -> DefaultLayout(name, stateLabel, coverIcon, controlsSlot, ctx.theme, modifier = tileGestureModifier)
        }

        if (showDetail) {
            CoverDetailDialog(
                entityId = entityId,
                name = name,
                e = e,
                client = ctx.client,
                theme = ctx.theme,
                onClose = { showDetail = false }
            )
        }
    }
}

private enum class CoverControl { BUTTONS, POSITION, TILT }

// ---- shared pieces ---------------------------------------------------------

@Composable
private fun CoverIcon(icon: ImageVector, theme: ThemeColors, size: Dp = 42.dp) {
    Box(
        modifier =
        Modifier
            .size(size)
            .clip(RoundedCornerShape(12.dp))
            .background(theme.controlBackground),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = theme.iconTint)
    }
}

@Composable
private fun NameState(
    name: String,
    stateLabel: String,
    theme: ThemeColors,
    horizontalAlignment: Alignment.Horizontal = Alignment.Start,
    textAlign: TextAlign = TextAlign.Start
) {
    Column(horizontalAlignment = horizontalAlignment) {
        Text(
            name,
            color = theme.primaryText,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            textAlign = textAlign
        )
        Text(stateLabel, color = theme.mutedText, fontSize = 13.sp, textAlign = textAlign)
    }
}

/** Up is disabled once fully open, down is disabled once fully closed — stop is always available. */
@Composable
private fun ControlsRow(
    isOpen: Boolean,
    isClosed: Boolean,
    call: (String) -> Unit,
    theme: ThemeColors,
    modifier: Modifier = Modifier,
    arrangement: Arrangement.Horizontal = Arrangement.spacedBy(8.dp)
) {
    Row(modifier = modifier, horizontalArrangement = arrangement) {
        CircleBtn(MdiIcons.CoverUp, theme, enabled = !isOpen) { call("open_cover") }
        CircleBtn(Icons.Filled.Stop, theme) { call("stop_cover") }
        CircleBtn(MdiIcons.CoverDown, theme, enabled = !isClosed) { call("close_cover") }
    }
}

@Composable
private fun CircleBtn(icon: ImageVector, theme: ThemeColors, enabled: Boolean = true, onClick: () -> Unit) {
    Box(
        modifier =
        Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(theme.controlBackground)
            .alpha(if (enabled) 1f else 0.35f)
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = theme.iconTint)
    }
}

/** Small round "next control" button — cycles through the enabled controls, Mushroom-style. */
@Composable
private fun CycleControlButton(theme: ThemeColors, onClick: () -> Unit) {
    Box(
        modifier =
        Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(theme.controlBackground)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = theme.iconTint)
    }
}

/**
 * Draggable 0-100% slider used for both the position and tilt controls —
 * drag or tap anywhere on it, released value fires [onCommit]. Shows the
 * live percentage as a centered label, Mushroom-slider-style.
 */
@Composable
private fun PercentSlider(entityId: String, value: Int, color: Color, theme: ThemeColors, onCommit: (Int) -> Unit) {
    // Uses -1f as a sentinel to denote 'no active drag', avoiding Float autoboxing.
    var dragFraction by remember(entityId) { mutableFloatStateOf(-1f) }
    val liveFraction = (value / 100f).coerceIn(0f, 1f)
    val shownFraction = if (dragFraction >= 0f) dragFraction else liveFraction

    Box(
        modifier =
        Modifier
            .fillMaxWidth()
            .height(36.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(theme.insetSurface)
            .pointerInput(entityId) {
                detectHorizontalDragGestures(
                    onDragEnd = {
                        if (dragFraction >= 0f) {
                            onCommit((dragFraction * 100).roundToInt())
                        }
                        dragFraction = -1f
                    },
                    onDragCancel = { dragFraction = -1f }
                ) { change, _ ->
                    dragFraction = (change.position.x / size.width).coerceIn(0f, 1f)
                }
            }.pointerInput(entityId) {
                detectTapGestures { offset ->
                    val f = (offset.x / size.width).coerceIn(0f, 1f)
                    dragFraction = f
                    onCommit((f * 100).roundToInt())
                    dragFraction = -1f
                }
            },
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier =
            Modifier
                .align(Alignment.CenterStart)
                .fillMaxHeight()
                .fillMaxWidth(shownFraction.coerceIn(0.02f, 1f))
                .clip(RoundedCornerShape(18.dp))
                .background(color)
        )
        Text(
            "${(shownFraction * 100).roundToInt()}%",
            color = theme.primaryText,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

// ---- "default": icon + name/state row, controls area full-width below -----

@Composable
private fun DefaultLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    controls: @Composable (fillWidth: Boolean) -> Unit,
    theme: ThemeColors,
    modifier: Modifier = Modifier
) {
    Column(
        modifier =
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(theme.controlBackground)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().then(modifier)) {
            CoverIcon(icon, theme)
            Spacer(Modifier.width(12.dp))
            NameState(name, stateLabel, theme)
        }
        controls(true)
    }
}

// ---- "horizontal": icon + name/state on the left, controls on the right ---

@Composable
private fun HorizontalLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    controls: @Composable (fillWidth: Boolean) -> Unit,
    theme: ThemeColors,
    modifier: Modifier = Modifier
) {
    Row(
        modifier =
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(theme.controlBackground)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.then(modifier)) { CoverIcon(icon, theme) }
        Spacer(Modifier.width(12.dp))
        Box(Modifier.weight(1f).then(modifier)) { NameState(name, stateLabel, theme) }
        Box(Modifier.width(140.dp)) { controls(false) }
    }
}

// ---- "vertical": icon, name, state, controls — all centered and stacked ---

@Composable
private fun VerticalLayout(
    name: String,
    stateLabel: String,
    icon: ImageVector,
    controls: @Composable (fillWidth: Boolean) -> Unit,
    theme: ThemeColors,
    modifier: Modifier = Modifier
) {
    Column(
        modifier =
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(theme.controlBackground)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().then(modifier)) {
            CoverIcon(icon, theme, size = 48.dp)
            Spacer(Modifier.height(8.dp))
            NameState(name, stateLabel, theme, horizontalAlignment = Alignment.CenterHorizontally, textAlign = TextAlign.Center)
        }
        Spacer(Modifier.height(10.dp))
        controls(true)
    }
}
