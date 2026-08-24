package com.custom.astrion.cards.impl

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * A held DPAD_CENTER/Enter key doesn't naturally produce a "long click" in
 * Compose Foundation — combinedClickable's onLongClick only ever fires from
 * a touch gesture's press duration, never from a hardware key held down
 * (which just sends repeated KeyEvents, no built-in "long key press"
 * concept). This starts its own hold timer on KeyDown via
 * onPreviewKeyEvent — which runs before combinedClickable sees the event —
 * and, if the hold lasted long enough, consumes the eventual KeyUp so a
 * paired combinedClickable's onClick doesn't also fire for the same press.
 *
 * Shared by every card with a long-press-to-open-detail-dialog gesture
 * (LightCard, CoverCard) — chain it before .combinedClickable(...):
 *   rememberLongPressKeyModifier(entityId) { showDetail = true }
 *       .combinedClickable(onClick = ..., onLongClick = { showDetail = true })
 */
@Composable
internal fun rememberLongPressKeyModifier(key: Any?, onLongPress: () -> Unit): Modifier {
    val scope = rememberCoroutineScope()
    var longPressJob by remember(key) { mutableStateOf<Job?>(null) }
    var longPressFired by remember(key) { mutableStateOf(false) }
    return Modifier.onPreviewKeyEvent { event ->
        if (event.key != Key.DirectionCenter && event.key != Key.Enter && event.key != Key.NumPadEnter) {
            return@onPreviewKeyEvent false
        }
        when (event.type) {
            KeyEventType.KeyDown -> {
                if (longPressJob == null) {
                    longPressFired = false
                    longPressJob =
                        scope.launch {
                            delay(500L)
                            longPressFired = true
                            onLongPress()
                        }
                }
                false
            }
            KeyEventType.KeyUp -> {
                longPressJob?.cancel()
                longPressJob = null
                val consumed = longPressFired
                longPressFired = false
                consumed
            }
            else -> false
        }
    }
}
