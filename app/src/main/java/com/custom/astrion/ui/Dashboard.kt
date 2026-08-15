package com.custom.astrion.ui

import android.content.Context
import android.hardware.ConsumerIrManager
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.R
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRegistry
import com.custom.astrion.config.ActivityConfig
import com.custom.astrion.config.ActivityDeviceConfig
import com.custom.astrion.config.ActivityRuntime
import com.custom.astrion.config.AppConfig
import com.custom.astrion.config.PageConfig
import com.custom.astrion.ha.ConnectionState
import com.custom.astrion.ha.EntityMap
import com.custom.astrion.ha.HaClient
import com.custom.astrion.ha.HaLabels
import com.custom.astrion.ha.ServiceCall
import com.custom.astrion.harmony.HarmonyHubRegistry
import kotlin.time.Duration.Companion.milliseconds
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll

/**
 * Swipeable, paginated dashboard. Each config page is a horizontally-swipeable
 * screen; a row of dots at the bottom shows how many pages there are and which
 * one you're on. Swipe left/right to move between them, jump via a physical
 * shortcut button (see MainActivity hotkeys), OR tap a card that calls
 * ctx.navigateToPage("Page Name") — e.g. an Activities menu card.
 *
 * Swiping down from the very top edge opens the settings overlay — imitates
 * HaRemote's hidden gesture to reach settings, since the real status bar is
 * hidden (kiosk fullscreen).
 *
 * Sized for the HA100 panel (480x800, portrait). Each page scrolls vertically
 * on its own; the pager stays light for the 1GB / MT6580 hardware.
 */
@Composable
fun Dashboard(
    client: HaClient,
    harmonyRegistry: HarmonyHubRegistry,
    entitiesState: State<EntityMap>,
    connectionState: State<ConnectionState>,
    config: AppConfig,
    configNotice: String? = null,
    /** Page index requested by a hardware button; consumed via onNavHandled. */
    navTarget: Int? = null,
    onNavHandled: () -> Unit = {},
    /** Overlay requested by a hardware button — "settings" or "activities"
     * (case-insensitive); anything else is ignored. Consumed the same way
     * as [navTarget]/[onNavHandled], via [onOverlayHandled]. */
    overlayTarget: String? = null,
    onOverlayHandled: () -> Unit = {},
    /** Called whenever the visible page changes (swipe, dot, hardware nav, or
     * a card's navigateToPage) — MainActivity uses this to rebind hardware
     * hotkeys to the newly-visible page's own bindings. */
    onPageChanged: (Int) -> Unit = {},
    /** Called with the swipe-up overlay page index when it opens, and null
     * when it closes — MainActivity uses this to rebind hardware hotkeys to
     * the overlay page while it's on top, and restore the underlying page's
     * bindings on close. */
    onOverlayPageChanged: (Int?) -> Unit = {},
    wakeOnMotionEnabled: Boolean = true,
    setWakeOnMotionEnabled: (Boolean) -> Unit = {},
    configServerEnabled: Boolean = true,
    setConfigServerEnabled: (Boolean) -> Unit = {},
    /** Fired once per [ActivityRuntime] instance (i.e. once per config
     * load) so MainActivity can hold a live reference for ConfigServer's
     * `/activities*` routes — ActivityRuntime is created here, inside
     * Compose, rather than in MainActivity, so it can react to a
     * dashboard.json reload the same way `remember(config)` already does. */
    onActivityRuntimeReady: (ActivityRuntime) -> Unit = {},
    /** Same hoisting pattern for the start/stop actions themselves — these
     * close over `activitiesById`/`harmonyRegistry`/`client`, which only
     * exist in this Composable's scope, so ConfigServer gets a fresh
     * function reference instead of duplicating the dispatch logic. */
    onStartActivityReady: ((String) -> Unit) -> Unit = {},
    onStopActivityReady: ((String) -> Unit) -> Unit = {}
) {
    val entities by entitiesState
    val context = LocalContext.current
    LaunchedEffect(Unit) {
        HaLabels.init(context)
    }
    val connection by connectionState
    val theme = remember(config.theme) { config.theme.toColors() }
    ProvideTheme(theme) {
        // Status dot reflects the first configured hub — good enough for a single
        // glance indicator; a per-hub breakdown isn't worth the UI space here.
        val harmonyConnected by (harmonyRegistry.client()?.connected ?: remember { MutableStateFlow(false) }).collectAsState()
        val scope = rememberCoroutineScope()

    // Swipe-up overlay state — declared early so navigateToPage (below) can
    // capture it. A page may declare a `swipeUp` target (another page's name)
    // that opens as a full-screen overlay on top of the pager when the user
    // swipes up past the bottom of that page's content (overscroll). Stored as
    // a config-pages index so MainActivity can rebind hotkeys to it; null when
    // no overlay is open.
    var swipeUpPageIndex by remember { mutableStateOf<Int?>(null) }
    BackHandler(enabled = swipeUpPageIndex != null) { swipeUpPageIndex = null }
    val openSwipeUp: (String) -> Unit = { targetName ->
        val idx = config.pages.indexOfFirst { it.name.equals(targetName, ignoreCase = true) }
        if (idx >= 0) swipeUpPageIndex = idx
    }
    LaunchedEffect(swipeUpPageIndex) { onOverlayPageChanged(swipeUpPageIndex) }

    // Hidden pages are excluded from the horizontal pager and the dot row —
    // they're only reachable via a swipe-up overlay or a hotkey that opens
    // them as the overlay. The pager operates on visible-pages indices, so we
    // keep a list of config indices that maps visible-position → config-position.
    // All navigation (hotkeys, navigateToPage, dots) resolves names against the
    // full config.pages list, then translates to a visible index (or opens the
    // overlay if the target is hidden).
    val visibleIndices = remember(config) {
        config.pages.indices.filter { !config.pages[it].hidden }
    }
    val pageCount = visibleIndices.size.coerceAtLeast(1)
    val initialVisible = remember(config) {
        val start = config.startPage.coerceIn(0, config.pages.lastIndex.coerceAtLeast(0))
        visibleIndices.indexOf(start).let { if (it < 0) 0 else it }
    }
    val pagerState = rememberPagerState(
        initialPage = initialVisible,
        pageCount = { pageCount },
    )

    // Scans pages/hotkeys once per config load for every `"track": true`
    // item; re-scanned automatically whenever `config` itself changes
    // (dashboard.json reload). Bound to each hub's live state below.
    val activityRuntime = remember(config) { ActivityRuntime(config) }
        LaunchedEffect(activityRuntime) {
            harmonyRegistry.clientsByLocalId.forEach { (localId, hubClient) ->
                launch {
                    hubClient.connected.first { it }
                    hubClient.getCurrentActivity()
                    activityRuntime.bind(hubClient, localId)
                }
            }
        }
        LaunchedEffect(activityRuntime) { onActivityRuntimeReady(activityRuntime) }

        // Card-driven navigation: any card can call this with a page name (as it
        // appears in dashboard.json's "pages[].name", case-insensitive) to jump
        // there — same mechanism physical hotkeys use, just triggered by a tap.
        // Uses scrollToPage (instant, no animation) rather than
        // animateScrollToPage: the animated variant visibly scrolls through every
        // intermediate page between the current one and the target, which reads
        // as "the wrong page flashes up" right before the real one lands —
        // especially noticeable on the HA100's weak CPU. A direct jump should
        // land directly. A hidden target opens as the swipe-up overlay instead.
        val navigateToPage: (String) -> Unit = { pageName ->
            val cfgIdx = config.pages.indexOfFirst { it.name.equals(pageName, ignoreCase = true) }
            if (cfgIdx >= 0) {
                val visIdx = visibleIndices.indexOf(cfgIdx)
                if (visIdx >= 0) scope.launch { pagerState.scrollToPage(visIdx) }
                else swipeUpPageIndex = cfgIdx
            }
        }

        // Local IR — the resilience baseline: works fully offline, no hub, no
        // HA, no cloud. Shared by scene_grid's own irDevice/irCommand fields
        // AND by composed Activities' "ir"-sourced devices below, so there's
        // exactly one place that touches ConsumerIrManager.
        val androidContext = LocalContext.current
        val irManager =
            remember(androidContext) {
                androidContext.getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager
            }
        val irDevicesById = remember(config.irDevices) { config.irDevices.associateBy { it.id } }
        val activitiesById = activityRuntime.activityConfigs

        fun sendIrCommand(deviceId: String, command: String) {
            val device = irDevicesById[deviceId]
            val step = device?.commands?.get(command)
            val manager = irManager
            when {
                device == null -> Log.w("Dashboard", "sendIrCommand: unknown irDevice \"$deviceId\"")
                step == null -> Log.w("Dashboard", "sendIrCommand: device \"$deviceId\" has no command \"$command\"")
                manager == null -> Log.w("Dashboard", "sendIrCommand: no IR blaster on this device")
                else ->
                    runCatching { manager.transmit(step.freq, step.pattern.toIntArray()) }
                        .onFailure { Log.e("Dashboard", "IR send failed: $deviceId/$command", it) }
            }
        }

        // Sends one device's power/input command through whichever source it's
        // configured for — the one place that knows how to talk to all three
        // (ir/harmony/ha), shared by both the start and stop side of
        // switchActivity below.
        fun dispatchActivityCommand(d: ActivityDeviceConfig, command: String?) {
            if (command == null) return
            when (d.source) {
                "ir" -> sendIrCommand(d.deviceId, command)
                "harmony" ->
                    harmonyRegistry.client(d.hub)?.sendCommand(d.deviceId, command)
                        ?: Log.w("Dashboard", "activity device ${d.deviceId}: hub ${d.hub} not configured")
                "ha" -> {
                    val domain = d.deviceId.substringBefore('.')
                    client.callService(ServiceCall.of(domain, "select_source", d.deviceId, "source" to command))
                }
            }
        }

        fun dispatchActivityPower(d: ActivityDeviceConfig, on: Boolean) {
            if (d.source == "ha") {
                val domain = d.deviceId.substringBefore('.')
                client.callService(ServiceCall(domain = domain, service = if (on) "turn_on" else "turn_off", entityId = d.deviceId))
            } else {
                dispatchActivityCommand(d, if (on) d.powerOnCommand else d.powerOffCommand)
            }
        }

        // The composed-Activity switch: diffs the outgoing Activity (whatever
        // was active in `activity.room` before, if anything) against `activity`
        // itself. A device present in both is left alone — no power cycle, and
        // its input is only re-sent if this Activity gives it one — a device
        // only in the outgoing one gets powered off (unless powerOffOnExit is
        // false), a device only in the incoming one gets powered on + its input
        // (unless powerOnFirst is false). Devices execute in declared order,
        // each waited on for its own delayAfterMs before the next starts.
        // The composed-Activity switch: diffs the outgoing Activity (whatever
        // was active in `activity.room` before, if anything — Harmony-backed or
        // composed, both work uniformly via TrackedActivity.devices, see below)
        // against `activity` itself. A device present in both is left alone —
        // no power cycle, and its input is only re-sent if this Activity gives
        // it one — a device only in the outgoing one gets powered off (unless
        // powerOffOnExit is false), a device only in the incoming one gets
        // powered on + its input (unless powerOnFirst is false). Devices execute
        // in declared order, each waited on for its own delayAfterMs before the
        // next starts.
        //
        // "Already on" is read from TrackedActivity.devices, not from a
        // composed ActivityConfig's own device list — this matters a lot for a
        // shared device with only a toggle command (no discrete on/off, e.g.
        // many IR soundbars): if the outgoing Activity was Harmony-backed (no
        // ActivityConfig of its own at all), we'd otherwise have no idea a
        // shared device was already on and could send an unwanted toggle. See
        // HotkeyConfig.devices / the scene_grid "devices" hint for how a
        // Harmony-backed tracked tile declares which physical devices it
        // touches. Actual *stop* commands (powerOffCommand) still only fire for
        // a genuinely composed outgoing Activity — a Harmony-backed one has no
        // ActivityDeviceConfig of its own to run one from; its hub is left to
        // manage its own devices' power on its own terms.
        suspend fun switchActivity(activity: ActivityConfig) {
            val outgoingTracked = activityRuntime.activeActivity(activity.room)
            val outgoingDeviceIds = outgoingTracked?.devices?.toSet().orEmpty()
            val incomingIds = activity.devices.map { it.deviceId }.toSet()

            val outgoingComposed = outgoingTracked?.let { activitiesById[it.id] }
            outgoingComposed?.devices?.forEach { d ->
                if (d.deviceId !in incomingIds && d.powerOffOnExit) dispatchActivityPower(d, on = false)
            }

            activity.devices.forEachIndexed { index, d ->
                val alreadyOn = d.deviceId in outgoingDeviceIds
                if (!alreadyOn && d.powerOnFirst) dispatchActivityPower(d, on = true)
                dispatchActivityCommand(d, d.inputCommand)
                if (index < activity.devices.lastIndex && d.delayAfterMs > 0) {
                    delay(d.delayAfterMs.milliseconds)
                }
            }

            activityRuntime.markActiveById(activity.id)
        }

        val startActivity: (String) -> Unit = { activityId ->
            activitiesById[activityId]?.let { activity ->
                scope.launch { switchActivity(activity) }
            } ?: Log.w("Dashboard", "startActivity: unknown activity \"$activityId\"")
        }

        // The missing counterpart to switchActivity/startActivity: stops
        // whichever Activity is currently active in `room`, without starting a
        // new one. Two real cases:
        //  - Composed Activity (AppConfig.activities): send each device's own
        //    powerOffCommand (same as switchActivity's outgoing-diff branch,
        //    just with an empty incoming set), then clear the room.
        //  - Harmony-backed tracked Activity: Harmony has no "stop just this
        //    Activity" command — a hub always runs exactly one Activity at a
        //    time, so PowerOff on *that Activity's own hub* is the correct,
        //    narrowest possible stop (it never touches a different room's hub).
        //    ActivityRuntime.bind()'s own "-1" handling clears the room(s) that
        //    hub drives once the hub confirms it, so no explicit clear() here.
        // A plain HA-entity tracked tile has no dedicated "stop" of its own
        // (it's whatever a scene_grid tap already toggles) — just clear it.
        fun stopActivity(room: String) {
            val tracked = activityRuntime.activeActivity(room) ?: return
            val composed = activitiesById[tracked.id]
            when {
                composed != null -> {
                    composed.devices.forEach { d -> if (d.powerOffOnExit) dispatchActivityPower(d, on = false) }
                    activityRuntime.clear(room)
                }
                tracked.harmonyActivityId != null ->
                    harmonyRegistry.client(tracked.harmonyHub)?.startActivity("-1")
                        ?: Log.w("Dashboard", "stopActivity($room): hub ${tracked.harmonyHub} not configured")
                else -> activityRuntime.clear(room)
            }
        }
        LaunchedEffect(activityRuntime) {
            onStartActivityReady(startActivity)
            onStopActivityReady(::stopActivity)
        }

        val ctx =
            CardContext(
                entities = entities,
                client = client,
                navigateToPage = navigateToPage,
                startHarmonyActivity = { activityId, hub ->
                    harmonyRegistry.client(hub)?.startActivity(activityId)
                        ?: Log.w("Dashboard", "startHarmonyActivity($activityId, hub=$hub) but that hub isn't configured")
                },
                sendHarmonyCommand = { deviceId, command, hub ->
                    harmonyRegistry.client(hub)?.sendCommand(deviceId, command)
                        ?: Log.w("Dashboard", "sendHarmonyCommand($deviceId, $command, hub=$hub) but that hub isn't configured")
                },
                wakeOnMotionEnabled = wakeOnMotionEnabled,
                setWakeOnMotionEnabled = setWakeOnMotionEnabled,
                configServerEnabled = configServerEnabled,
                setConfigServerEnabled = setConfigServerEnabled,
                harmonyConnected = harmonyConnected,
                irDevices = irDevicesById,
                sendIrCommand = ::sendIrCommand,
                activities = activitiesById,
                startActivity = startActivity,
                activityRuntime = activityRuntime,
                theme = theme
            )

        // Hardware-button navigation: jump straight to the requested page, then
        // clear it. scrollToPage (not animateScrollToPage) for the same reason as
        // navigateToPage above — a physical shortcut button should land directly,
        // not visibly scroll through every page in between.
        LaunchedEffect(navTarget) {
            val target = navTarget ?: return@LaunchedEffect
            val visIdx = visibleIndices.indexOf(target)
            if (visIdx >= 0) pagerState.scrollToPage(visIdx)
            else if (target in 0 until config.pages.size) swipeUpPageIndex = target
            onNavHandled()
        }

        // Tell MainActivity which page is visible now, so it can rebind hardware
        // hotkeys to that page's own bindings (swipe, dot tap, hardware nav, or a
        // card's navigateToPage all funnel through pagerState.currentPage).
        LaunchedEffect(pagerState.currentPage) {
            onPageChanged(visibleIndices.getOrNull(pagerState.currentPage) ?: return@LaunchedEffect)
        }

        var showSettings by remember { mutableStateOf(false) }
        var showActivities by remember { mutableStateOf(false) }
        BackHandler(enabled = showSettings) { showSettings = false }
        BackHandler(enabled = showActivities) { showActivities = false }

        // Hardware-button counterpart to the two swipe gestures below (see
        // TopStatusBar's onSwipeDownToSettings and PageIndicator's
        // onSwipeUpToActivities) — same overlays, just also reachable from a
        // HotkeyConfig.openOverlay binding via MainActivity.
        LaunchedEffect(overlayTarget) {
            when (overlayTarget?.lowercase()) {
                "settings" -> showSettings = true
                "activities" -> showActivities = true
            }
            if (overlayTarget != null) onOverlayHandled()
        }

        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier =
                Modifier
                    .fillMaxSize()
                    .background(LocalTheme.current.background)
            ) {
                TopStatusBar(onSwipeDownToSettings = { showSettings = true })
                ConnectionBanner(connection)
                if (configNotice != null) ConfigNoticeBanner(configNotice)

                HorizontalPager(
                    state = pagerState,
                    modifier =
                    Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) { pageIndex ->
                    val page = config.pages[visibleIndices[pageIndex]]
                    PageContent(
                        page = page,
                        ctx = ctx,
                        swipeUp = page.swipeUp,
                        onOpen = { page.swipeUp?.let(openSwipeUp) },
                    )
                }

                // Bottom-edge swipe-up strip: catches bottom-originating upward
                // swipes that miss the pager's nestedScroll. Only activates when
                // the current page declares a swipeUp target.
                val currentSwipeUp = visibleIndices.getOrNull(pagerState.currentPage)
                    ?.let { config.pages[it].swipeUp }
                if (!currentSwipeUp.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(18.dp)
                            .pointerInput(currentSwipeUp) {
                                detectVerticalDragGestures { _, dragAmount ->
                                    if (dragAmount < -15f) currentSwipeUp?.let(openSwipeUp)
                                }
                            },
                    )
                }

                PageIndicator(
                    pages = visibleIndices.map { config.pages[it] },
                    current = pagerState.currentPage,
                    // Same instant scrollToPage as navigateToPage/hardware nav —
                    // a dot tap is a direct jump too, not a swipe gesture, so it
                    // shouldn't visibly scroll through pages in between.
                    onDotClick = { index -> scope.launch { pagerState.scrollToPage(index) } },
                    onNavigateToParent = {
                        val cfgIdx = visibleIndices.getOrNull(pagerState.currentPage)
                        val parentName = cfgIdx?.let { config.pages.getOrNull(it)?.parent }
                        val idx =
                            parentName?.let { name ->
                                config.pages.indexOfFirst { it.name.equals(name, ignoreCase = true) }
                                    .let { if (it >= 0) visibleIndices.indexOf(it) else -1 }
                            }
                        if (idx != null && idx >= 0) scope.launch { pagerState.scrollToPage(idx) }
                    },
                    onSwipeUpToActivities = { showActivities = true }
                )
            }

            if (showSettings) {
                SettingsOverlay(ctx = ctx, onClose = { showSettings = false })
            }
            if (showActivities) {
                ActivitiesOverlay(
                    activityRuntime = activityRuntime,
                    ctx = ctx,
                    onStop = ::stopActivity,
                    onClose = { showActivities = false }
                )
            }
        }

        // Drawn below the settings overlay so settings still wins if both are
        // somehow open (settings is reached via the top bar, which stays
        // tappable through nothing — but ordering is belt-and-braces).
        swipeUpPageIndex?.let { idx ->
            config.pages.getOrNull(idx)?.let { page ->
                SwipeUpOverlay(page = page, ctx = ctx, onClose = { swipeUpPageIndex = null })
            }
        }
    }
}

/**
 * Full-screen settings overlay, reached only by swiping down from the top
 * edge (see [TopStatusBar]) — deliberately NOT part of `config.pages`, so it
 * never shows up in the horizontal pager or the page-indicator dots.
 * Dismissed by an upward swipe from the bottom gesture strip, the system
 * back button, or the close row.
 *
 * The swipe-up-to-close gesture lives on a dedicated bottom strip that sits
 * above the scrollable content in z-order. This avoids the gesture conflict
 * between `detectVerticalDragGestures` and `verticalScroll` when both are on
 * the same node — the scroll consumer eats all vertical drags before the drag
 * detector ever fires.
 */
@Composable
private fun SettingsOverlay(ctx: CardContext, onClose: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().background(LocalTheme.current.background)) {
        Column(
            modifier =
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Text(
                    "✕ " + stringResource(R.string.close),
                    color = LocalTheme.current.mutedText,
                    fontSize = 13.sp,
                    modifier =
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { onClose() }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
            SettingsMenu(ctx)
        }
        // Bottom gesture strip: swipe up to close. Sits above the scrollable
        // content so the drag detector doesn't fight verticalScroll for events.
        // A visual handle bar cues the user where to swipe.
        Box(
            modifier =
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(50.dp)
                .pointerInput(Unit) {
                    detectVerticalDragGestures { change, dragAmount ->
                        if (dragAmount < -15f) onClose()
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier =
                Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(LocalTheme.current.controlBackground)
            )
        }
    }
}

/**
 * Full-screen overlay listing every currently-active AV Activity, grouped by
 * room — reached only by swiping UP from the bottom edge (see
 * [PageIndicator]'s onSwipeUpToActivities), the mirror-image gesture of
 * [SettingsOverlay]'s swipe-down-from-top. Dismissed by a downward swipe
 * from the top gesture strip (mirroring SettingsOverlay's bottom strip — see
 * its doc comment for why the gesture lives on its own node rather than on
 * the scrollable Column), the system back button, or the close row. Tapping
 * an Activity jumps to its page — the "CURRENT_ACTIVITY" one-tap-back
 * behaviour from the original design discussion.
 */
@Composable
private fun ActivitiesOverlay(
    activityRuntime: ActivityRuntime,
    ctx: CardContext,
    /** Stops the Activity active in a given room — see Dashboard()'s own
     * `stopActivity`. Separate from `onClose`: stopping doesn't dismiss the
     * overlay, so more than one room can be stopped in a row. */
    onStop: (room: String) -> Unit,
    onClose: () -> Unit
) {
    val activeByRoom by activityRuntime.activeByRoom.collectAsState()
    val active = remember(activeByRoom) { activityRuntime.activeActivities() }

    Box(modifier = Modifier.fillMaxSize().background(LocalTheme.current.background)) {
        Column(
            modifier =
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Leaves room at the top for the gesture strip below so the
            // first list item doesn't render underneath it.
            Spacer(Modifier.height(42.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Text(
                    "✕ " + stringResource(R.string.close),
                    color = LocalTheme.current.mutedText,
                    fontSize = 13.sp,
                    modifier =
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { onClose() }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
            Text(
                stringResource(R.string.active_activities),
                color = LocalTheme.current.primaryText,
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 10.dp)
            )
            if (active.isEmpty()) {
                Text(
                    stringResource(R.string.no_active_activities),
                    color = LocalTheme.current.mutedText,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(10.dp)
                )
            }
            active.groupBy { it.room }.forEach { (room, activities) ->
                Text(
                    room,
                    color = LocalTheme.current.accent,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
                activities.forEach { activity ->
                    Row(
                        modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(LocalTheme.current.insetSurface)
                            .clickable(enabled = activity.page != null) {
                                activity.page?.let {
                                    ctx.navigateToPage(it)
                                    onClose()
                                }
                            }.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(activity.name, color = LocalTheme.current.primaryText, fontSize = 15.sp)
                        // Dedicated per-room stop — the missing piece this
                        // overlay didn't have before: previously the only
                        // way to end a classic Harmony Activity was a
                        // generic PowerOff hotkey, which (when a hub drives
                        // more than one room) kills every room on that hub
                        // instead of just this one. stopActivity() targets
                        // only this Activity's own hub.
                        Text(
                            stringResource(R.string.stop_activity),
                            color = LocalTheme.current.danger,
                            fontSize = 13.sp,
                            modifier =
                            Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { onStop(room) }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
        // Top gesture strip: swipe down to close — mirror of SettingsOverlay's
        // bottom strip, same reasoning (keeps the drag detector off the
        // scrollable node so it doesn't lose the gesture to verticalScroll).
        Box(
            modifier =
            Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .height(50.dp)
                .pointerInput(Unit) {
                    detectVerticalDragGestures { change, dragAmount ->
                        if (dragAmount > 15f) onClose()
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier =
                Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(LocalTheme.current.controlBackground)
            )
        }
    }
}

@Composable
private fun PageContent(
    page: PageConfig,
    ctx: CardContext,
    swipeUp: String? = null,
    onOpen: () -> Unit = {},
) {
    val pinned = page.cards.filter { it.options["pin"] == "bottom" }
    val scrolling = page.cards.filter { it.options["pin"] != "bottom" }

    // Swipe-up-to-open: only attach a nestedScroll overscroll consumer when
    // this page actually declares a `swipeUp` target. The connection fires
    // on upward overscroll (user swipes up past the bottom of the scrollable
    // content — or immediately on a short page that doesn't fill the screen,
    // since there's nothing to scroll so the whole drag is leftover). Using
    // nestedScroll (not detectVerticalDragGestures) avoids the documented
    // conflict with verticalScroll on the same node, and never blocks taps,
    // so pinned-bottom cards keep working normally.
    val openConnection = if (!swipeUp.isNullOrBlank()) {
        val density = LocalDensity.current
        val triggerPx = with(density) { 30.dp.toPx() }
        rememberSwipeUpOpenConnection(onOpen = onOpen, triggerPx = triggerPx)
    } else {
        null
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier =
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .then(if (openConnection != null) Modifier.nestedScroll(openConnection) else Modifier)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            scrolling.forEach { RenderCard(it, ctx) }
        }
        if (pinned.isNotEmpty()) {
            Column(
                modifier =
                Modifier
                    .fillMaxWidth()
                    .background(LocalTheme.current.insetSurface)
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                pinned.forEach { RenderCard(it, ctx) }
            }
        }
    }
}

/**
 * [NestedScrollConnection] that opens the swipe-up overlay once an upward
 * overscroll accumulates past [triggerPx]. Upward overscroll arrives in
 * [onPostScroll] as a negative `available.y` (the scrolling child couldn't
 * consume the upward drag), so we accumulate its magnitude and fire [onOpen]
 * when it crosses the threshold. Opposite-direction (downward) scrolls reset
 * the accumulator so a partial upward flick that reverses doesn't carry over.
 * Only reacts to user drag, not momentum fling, to avoid stray opens.
 */
@Composable
private fun rememberSwipeUpOpenConnection(
    onOpen: () -> Unit,
    triggerPx: Float,
): NestedScrollConnection {
    val openRef = rememberUpdatedState(onOpen)
    val accumulated = remember { FloatArray(1) }
    return remember(triggerPx) {
        object : NestedScrollConnection {
            override fun onPostScroll(
                consumed: Offset,
                available: Offset,
                source: NestedScrollSource,
            ): Offset {
                if (source == NestedScrollSource.UserInput && available.y < 0f) {
                    accumulated[0] += -available.y
                    if (accumulated[0] >= triggerPx) {
                        accumulated[0] = 0f
                        openRef.value.invoke()
                    }
                    return available // consume the overscroll so the platform glow doesn't fire
                }
                accumulated[0] = 0f
                return Offset.Zero
            }
        }
    }
}

/**
 * Full-screen overlay showing another page's cards, opened by swiping up from
 * a page that declares a `swipeUp` target. Dismissed by swiping down from the
 * top handle strip, tapping ✕, or pressing the system Back button (handled by
 * the [BackHandler] in [Dashboard]). Renders the target page's cards with the
 * same pinned/scrolling split as [PageContent] so pinned-bottom cards (e.g. a
 * persistent media-player bar) keep their layout. Deliberately not part of the
 * horizontal pager, so it doesn't show up in the page-indicator dots.
 */
@Composable
private fun SwipeUpOverlay(page: PageConfig, ctx: CardContext, onClose: () -> Unit) {
    val pinned = page.cards.filter { it.options["pin"] == "bottom" }
    val scrolling = page.cards.filter { it.options["pin"] != "bottom" }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0E2229))) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top bar: swipe-down-to-close handle (centered) + close button (end).
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .pointerInput(Unit) {
                        detectVerticalDragGestures { change, dragAmount ->
                            if (dragAmount > 40f) onClose()
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .width(40.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Color(0xFF3A5560)),
                )
                Text(
                    "✕ " + stringResource(R.string.close),
                    color = Color(0xFF93AFB6),
                    fontSize = 13.sp,
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .padding(end = 10.dp, top = 6.dp, bottom = 6.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { onClose() }
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                )
            }

            // Page cards: same pinned/scrolling split as PageContent.
            Column(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    scrolling.forEach { RenderCard(it, ctx) }
                }
                if (pinned.isNotEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF13262D))
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        pinned.forEach { RenderCard(it, ctx) }
                    }
                }
            }
        }
    }
}

@Composable
private fun RenderCard(cardConfig: CardConfig, ctx: CardContext) {
    val renderer = CardRegistry.get(cardConfig.type)
    if (renderer != null) {
        renderer.Render(cardConfig, ctx)
    } else {
        UnknownCard(cardConfig.type)
    }
}

/**
 * Row of page dots + current page name at the bottom of the screen —
 * doubles as the swipe-UP trigger for the "Active Activities" overlay, the
 * bottom-edge mirror of [TopStatusBar]'s swipe-down-to-settings gesture.
 * Same accumulated-drag-past-a-threshold approach, just the opposite sign.
 *
 * The dots represent the *current page's siblings* — every page sharing
 * the same [PageConfig.parent] (including root pages, which all share the
 * implicit `parent == null`) — not the whole flat page list. On a
 * dashboard with no hierarchy at all every page shares `parent == null`,
 * so every page is a sibling of every other one and this renders exactly
 * as it did before parent/child pages existed: one dot per page, no
 * chevron. Windowed to at most [MAX_VISIBLE_DOTS] around the current
 * position so a page with many siblings never grows this row's height.
 *
 * The chevron on the left only appears on a child page (one with a
 * non-null `parent`) and is the on-screen twin of the hardware BACK key's
 * new behavior (see PageConfig.parent's own doc comment): tap it, or press
 * BACK, to jump straight to this page's parent. Swiping itself is
 * unaffected by hierarchy — it's still one continuous pager over the full
 * flat `pages` list in file order, same as always; only the dots and the
 * chevron change to reflect where you are in the tree.
 */
private const val MAX_VISIBLE_DOTS = 5

@Composable
private fun PageIndicator(
    pages: List<PageConfig>,
    current: Int,
    onDotClick: (Int) -> Unit,
    onNavigateToParent: () -> Unit,
    onSwipeUpToActivities: () -> Unit
) {
    val density = LocalDensity.current
    val triggerPx = with(density) { 40.dp.toPx() }
    var dragAccumulated by remember { mutableFloatStateOf(0f) }

    val currentPage = pages.getOrNull(current)
    val hasHierarchy = remember(pages) { pages.any { it.parent != null } }
    val siblings =
        remember(pages, currentPage?.parent) {
            pages.withIndex().filter { (_, p) -> p.parent == currentPage?.parent }
        }
    val currentSiblingPos = siblings.indexOfFirst { it.index == current }.coerceAtLeast(0)

    val windowStart: Int
    val windowEnd: Int
    if (siblings.size <= MAX_VISIBLE_DOTS) {
        windowStart = 0
        windowEnd = siblings.lastIndex
    } else {
        val half = MAX_VISIBLE_DOTS / 2
        val centeredStart = (currentSiblingPos - half).coerceAtLeast(0)
        windowStart = centeredStart.coerceAtMost(siblings.size - MAX_VISIBLE_DOTS)
        windowEnd = windowStart + MAX_VISIBLE_DOTS - 1
    }

    Row(
        modifier =
        Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp, horizontal = 10.dp)
            .pointerInput(Unit) {
                detectVerticalDragGestures(
                    onDragStart = { dragAccumulated = 0f },
                    onDragEnd = { dragAccumulated = 0f },
                    onVerticalDrag = { change, dragAmount ->
                        change.consume()
                        dragAccumulated += dragAmount
                        if (dragAccumulated < -triggerPx) {
                            onSwipeUpToActivities()
                            dragAccumulated = 0f
                        }
                    }
                )
            },
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left zone: only a child page shows this — jump to its parent.
        // A fixed-width spacer on other pages keeps the dots visually
        // centered instead of drifting sideways as you move between a
        // child page and a root one within the same dashboard.
        if (currentPage?.parent != null) {
            Row(
                modifier =
                Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { onNavigateToParent() }
                    .defaultMinSize(minWidth = 44.dp, minHeight = 44.dp)
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("‹", color = LocalTheme.current.accent, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.width(4.dp))
                Text(
                    currentPage.parent,
                    color = LocalTheme.current.accent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        } else if (hasHierarchy) {
            Spacer(Modifier.width(44.dp))
        }

        // Center zone: the windowed sibling dots.
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (windowStart > 0) EdgeEllipsis()
            for (i in windowStart..windowEnd) {
                val sibling = siblings[i]
                val active = i == currentSiblingPos
                Box(
                    modifier =
                    Modifier
                        .padding(horizontal = 5.dp)
                        .size(if (active) 10.dp else 8.dp)
                        .clip(CircleShape)
                        .background(if (active) LocalTheme.current.accent else LocalTheme.current.controlBackground)
                        .clickable { onDotClick(sibling.index) }
                )
            }
            if (windowEnd < siblings.lastIndex) EdgeEllipsis()
        }

        // Right zone: current page name — unchanged from before hierarchy
        // existed, deliberately not repeating the parent name (the left
        // zone already owns that) to avoid saying it twice in one row.
        Text(
            text = currentPage?.name ?: "",
            color = LocalTheme.current.mutedText,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/** A small "there are more siblings this way" marker at a clipped edge of
 * the dot window — text rather than a dot so it can never be mistaken for
 * a page itself. Not clickable; swipe (or the chevron, for the parent) is
 * how you get past the visible window. */
@Composable
private fun EdgeEllipsis() {
    Text("…", color = LocalTheme.current.mutedText, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 2.dp))
}

@Composable
private fun ConnectionBanner(connection: ConnectionState) {
    if (connection == ConnectionState.CONNECTED) return
    val (label, color) =
        when (connection) {
            ConnectionState.CONNECTING,
            ConnectionState.AUTHENTICATING
            -> "Connecting…" to LocalTheme.current.accentSecondary
            ConnectionState.AUTH_FAILED -> "Auth failed — check token" to LocalTheme.current.danger
            ConnectionState.ERROR -> "Connection error — retrying" to LocalTheme.current.danger
            else -> "Disconnected" to LocalTheme.current.controlBackground
        }
    Box(
        modifier =
        Modifier
            .fillMaxWidth()
            .background(color)
            .padding(12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text = label, color = Color.White, fontSize = 14.sp)
    }
}

@Composable
private fun ConfigNoticeBanner(text: String) {
    Box(
        modifier =
        Modifier
            .fillMaxWidth()
            .background(LocalTheme.current.amber.copy(alpha = 0.25f))
            .padding(10.dp)
    ) {
        Text(text = text, color = LocalTheme.current.amber, fontSize = 12.sp)
    }
}

@Composable
private fun UnknownCard(type: String) {
    Box(
        modifier =
        Modifier
            .fillMaxWidth()
            .background(LocalTheme.current.cardSurface)
            .padding(14.dp)
    ) {
        Text(text = "Unknown card type: \"$type\"", color = LocalTheme.current.danger, fontSize = 13.sp)
    }
}
