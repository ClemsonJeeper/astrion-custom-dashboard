package com.custom.astrion.input

/**
 * Physical button map for the Astrion HA100 hardware.
 *
 * These keycodes were extracted directly from the stock app's
 * assets/device_key_code.json (the "HA100" block). When a physical button is
 * pressed, the OS delivers a standard Android KeyEvent with these codes to the
 * focused Activity, which is why a standalone app can handle them via
 * dispatchKeyEvent / onKeyDown — no vendor SDK required for the buttons.
 *
 * The dedicated shortcut buttons (light / curtain / scene / ac / custom_1..4)
 * are the real prize: you can bind each of them to any action you want, instead
 * of HaRemote's fixed behavior.
 */
@Suppress("SpellCheckingInspection")
enum class HardwareKey {
    BACK,
    HOME,
    POWER,
    VOLUME_UP,
    VOLUME_DOWN,
    PAGE_UP,
    PAGE_DOWN,
    UP,
    DOWN,
    LEFT,
    RIGHT,
    CENTER,
    MUTE,
    VOICE,
    MAIN,
    REWIND,
    PLAY,
    STOP,
    FASTFORWARD,
    RED_BUTTON,
    GREEN_BUTTON,
    BLUE_BUTTON,
    YELLOW_BUTTON,
    UNKNOWN
    ;

    companion object {
        // Android keycode -> logical button, straight from device_key_code.json (HA100).
        private val MAP: Map<Int, HardwareKey> =
            mapOf(
                4 to BACK,
                131 to HOME,
                132 to POWER,
                24 to VOLUME_UP,
                25 to VOLUME_DOWN,
                92 to PAGE_UP,
                93 to PAGE_DOWN,
                19 to UP,
                20 to DOWN,
                21 to LEFT,
                22 to RIGHT,
                23 to CENTER,
                82 to MAIN,
                164 to MUTE,
                133 to VOICE,
                134 to REWIND,
                135 to PLAY,
                136 to STOP,
                137 to FASTFORWARD,
                138 to RED_BUTTON,
                139 to GREEN_BUTTON,
                140 to BLUE_BUTTON,
                141 to YELLOW_BUTTON
            )

        fun fromKeyCode(code: Int): HardwareKey = MAP[code] ?: UNKNOWN
    }
}

/**
 * Bind hardware buttons to actions. Register short- and long-press handlers at
 * startup; MainActivity does the tap-vs-hold timing and calls back here.
 */
class HardwareKeyRouter {
    private val shortHandlers = mutableMapOf<HardwareKey, () -> Boolean>()
    private val longHandlers = mutableMapOf<HardwareKey, () -> Boolean>()
    private val longReleaseHandlers = mutableMapOf<HardwareKey, () -> Unit>()
    private val pressStartHandlers = mutableMapOf<HardwareKey, () -> Unit>()
    private val repeatable = mutableSetOf<HardwareKey>()

    /**
     * @param repeats whether holding the key should fire the handler again and
     *   again. True for level-triggered things like volume and channel; FALSE
     *   for edge-triggered ones like starting a voice capture, where auto-repeat
     *   would toggle it on and off several times a second.
     */
    fun on(key: HardwareKey, repeats: Boolean = true, handler: () -> Boolean) {
        shortHandlers[key] = handler
        if (repeats) repeatable += key else repeatable -= key
    }

    fun onLong(key: HardwareKey, handler: () -> Boolean) {
        longHandlers[key] = handler
    }

    /** Called immediately on ACTION_DOWN, before the long-press threshold has
     * had any chance to confirm this press is actually a hold — for an action
     * that has to start the instant the key goes down rather than after that
     * threshold (voice capture streaming to Siri: waiting for the threshold
     * before opening the mic would mean every hold starts with a dead sliver
     * of unrecorded audio, unlike a real Siri remote). The eventual [onLong] /
     * short-handler firing still happens on its own schedule and is
     * responsible for reconciling with whatever this already started — see
     * VoiceSession.startOrRedirect. */
    fun onPressStart(key: HardwareKey, handler: () -> Unit) {
        pressStartHandlers[key] = handler
    }

    /** Called on release, but only for a press that actually reached the long-press
     * threshold (i.e. [onLong]'s handler already fired) — a plain tap that resolved
     * to the short handler does not call this. For a hold whose action is ongoing
     * for as long as the key is down (voice capture streaming to Siri; see
     * MainActivity.startVoiceHotkey), release is the natural "stop now" signal
     * rather than something [onLong]'s handler can react to on its own. */
    fun onLongRelease(key: HardwareKey, handler: () -> Unit) {
        longReleaseHandlers[key] = handler
    }

    /** True if [key] already has a short-press handler bound — used to let a
     * fallback binding (e.g. parent-page navigation) yield to any explicit
     * hotkey already claiming that key, instead of overriding it. */
    fun isShortBound(key: HardwareKey): Boolean = shortHandlers.containsKey(key)

    /** Drop all bindings — used before rebinding from a reloaded config. */
    fun clear() {
        shortHandlers.clear()
        longHandlers.clear()
        longReleaseHandlers.clear()
        pressStartHandlers.clear()
        repeatable.clear()
    }

    /** True if holding this key should re-fire its handler. */
    fun repeatsWhileHeld(code: Int): Boolean = HardwareKey.fromKeyCode(code).let { it != HardwareKey.UNKNOWN && it in repeatable }

    fun shortHandler(code: Int): (() -> Boolean)? {
        val key = HardwareKey.fromKeyCode(code)
        return if (key == HardwareKey.UNKNOWN) null else shortHandlers[key]
    }

    fun longHandler(code: Int): (() -> Boolean)? {
        val key = HardwareKey.fromKeyCode(code)
        return if (key == HardwareKey.UNKNOWN) null else longHandlers[key]
    }

    fun longReleaseHandler(code: Int): (() -> Unit)? {
        val key = HardwareKey.fromKeyCode(code)
        return if (key == HardwareKey.UNKNOWN) null else longReleaseHandlers[key]
    }

    fun pressStartHandler(code: Int): (() -> Unit)? {
        val key = HardwareKey.fromKeyCode(code)
        return if (key == HardwareKey.UNKNOWN) null else pressStartHandlers[key]
    }
}
