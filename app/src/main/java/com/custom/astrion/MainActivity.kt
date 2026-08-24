package com.custom.astrion

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.ConsumerIrManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit
import androidx.lifecycle.lifecycleScope
import com.custom.astrion.config.ActivityRuntime
import com.custom.astrion.config.DashboardConfig
import com.custom.astrion.config.DashboardLoader
import com.custom.astrion.config.HotkeyConfig
import com.custom.astrion.config.JsonPlain
import com.custom.astrion.config.RemoteSettings
import com.custom.astrion.ha.HaClient
import com.custom.astrion.ha.ServiceCall
import com.custom.astrion.harmony.HarmonyHubRegistry
import com.custom.astrion.input.HardwareKey
import com.custom.astrion.input.HardwareKeyRouter
import com.custom.astrion.ui.Dashboard
import com.custom.astrion.web.ConfigServer
import fi.iki.elonen.NanoHTTPD
import kotlin.math.abs
import kotlin.math.sqrt
import kotlinx.coroutines.launch

/**
 * Single-activity host. Owns the HA client, the direct Harmony hub client,
 * wires physical buttons to the config's hotkeys, and renders the swipeable
 * dashboard.
 *
 * IMPORTANT — configure your connection in `secrets.properties` (see
 * secrets.properties.example) before building — HA_URL / HA_TOKEN /
 * HARMONY_HUB_IP / HARMONY_HUB_ID are injected as BuildConfig fields so
 * nothing sensitive lands in source.
 */
@Suppress("SpellCheckingInspection")
class MainActivity : ComponentActivity() {
    private companion object {
        const val DEBUG_KEYS = false
        const val KEY_TAG = "AstrionKeys"
        const val LONG_PRESS_MS = 1500L
        const val MOTION_THRESHOLD = 0.9f
        const val WAKE_COOLDOWN_MS = 2000L
    }

    private val keyHandler = Handler(Looper.getMainLooper())
    private var pendingLong: Runnable? = null
    private var activeLongKey = -1
    private var longFired = false

    private var sensorManager: SensorManager? = null
    private var motionSensor: Sensor? = null
    private var lastMagnitude = 0f
    private var lastWakeMs = 0L
    private val motionListener =
        object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val (x, y, z) = event.values
                val mag = sqrt(x * x + y * y + z * z)
                if (lastMagnitude != 0f && abs(mag - lastMagnitude) > MOTION_THRESHOLD) {
                    wakeScreen()
                }
                lastMagnitude = mag
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }

    /** Live screen-on/off state, fed to Compose (see [composeContent]) so
     * cards that do continuous background work while composed — e.g.
     * CameraCard's live MJPEG stream / snapshot polling — can pause it while
     * the screen is off instead of quietly burning CPU + radio all night on
     * whatever page was showing when the screen last timed out. This is a
     * HOME launcher activity, so the Activity itself is never stopped just
     * because the screen turns off (that's the whole point of motion-wake),
     * meaning Compose keeps recomposing/running LaunchedEffects unless
     * something explicit like this tells cards to stand down. */
    private var screenOn by mutableStateOf(true)
    private val screenStateReceiver =
        object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    Intent.ACTION_SCREEN_OFF -> screenOn = false
                    Intent.ACTION_SCREEN_ON -> screenOn = true
                }
            }
        }

    private lateinit var client: HaClient

    /** Owns one HarmonyHubClient per configured Harmony hub. */
    private lateinit var harmonyRegistry: HarmonyHubRegistry

    /** Local IR blaster — used by hotkeys with irDevice+irCommand (see
     * runHotkey()) and shared with the composed-Activity switch executor in
     * Dashboard.kt's own Compose-scoped instance; this one is MainActivity's
     * own since hotkey dispatch happens outside Compose. Null on hardware
     * with no IR blaster. */
    private val irManager: ConsumerIrManager? by lazy {
        getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager
    }

    private lateinit var configServer: ConfigServer

    /** Latest [ActivityRuntime] handed up from Dashboard.kt's own
     * `remember(config) { ActivityRuntime(config) }` (see its
     * onActivityRuntimeReady doc) — ConfigServer reads this lazily via a
     * lambda so it always sees the current instance, including across a
     * dashboard.json reload. Null only for the brief window before the
     * first composition runs. */
    private var activityRuntime: ActivityRuntime? = null

    /** Live start/stop-activity functions handed up from Dashboard.kt the
     * same way — they close over Compose-scoped state (activitiesById,
     * harmonyRegistry, client) that MainActivity itself doesn't have direct
     * access to. */
    private var startActivityFn: ((String) -> Unit)? = null
    private var stopActivityFn: ((String) -> Unit)? = null
    private val keyRouter = HardwareKeyRouter()
    private var dashboard by mutableStateOf(DashboardLoader.Result(DashboardConfig.default, null))
    private var navTarget by mutableStateOf<Int?>(null)
    private var overlayTarget by mutableStateOf<String?>(null)

    /** Which page is currently visible — used to know which page-scoped
     * hotkeys should currently be layered on top of the global ones. */
    private var currentPageIndex = 0

    private val prefs by lazy { getSharedPreferences("astrion_settings", MODE_PRIVATE) }

    /** Backing state for the settings page's "Wake on movement" switch —
     * persisted, and toggled live via setWakeOnMotion() without a restart. */
    private var wakeOnMotionEnabled by mutableStateOf(true)

    /** Backing state for the settings page's "Local config server" switch —
     * persisted, and toggled live via setConfigServerEnabled() without a
     * restart. Defaults to true so a fresh install can still be configured;
     * meant to be turned off once setup is done, closing the unauthenticated
     * :8080 admin surface. */
    private var configServerEnabled by mutableStateOf(true)

    private val storagePermission =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { reloadDashboard() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i("MainActivity", "onCreate — activity instance ${this.hashCode()}")

        // Enable full-screen immersive sticky mode for dedicated wall/remote tablet mode
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )

        if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            storagePermission.launch(
                arrayOf(
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                )
            )
        }

        wakeOnMotionEnabled = prefs.getBoolean("wake_on_motion_enabled", true)
        setupMotionWake()
        registerReceiver(
            screenStateReceiver,
            IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_SCREEN_ON)
            }
        )

        initClientsAndServer()
        configServerEnabled = prefs.getBoolean("config_server_enabled", true)
        if (configServerEnabled) startConfigServer()
        lifecycleScope.launch { harmonyRegistry.connectAll() }

        currentPageIndex = dashboard.config.startPage
        rebindHotkeysForCurrentPage()
        client.connect()

        composeContent()
    }

    /** Creates (or re-creates) the HA client, Harmony registry, and ConfigServer
     *  from current RemoteSettings. Called once from onCreate and again whenever
     *  connection settings are saved — avoids Activity.recreate(), which is
     *  unreliable on Android 8.1 HOME launcher activities. */
    private fun initClientsAndServer() {
        client = HaClient(baseUrl = RemoteSettings.haUrl(this), token = RemoteSettings.haToken(this))
        harmonyRegistry =
            HarmonyHubRegistry(
                hubs = RemoteSettings.harmonyHubs(this),
                onError = { hubName, msg -> Log.e("HarmonyHubClient", "[$hubName] $msg") },
                onHubIdDiscovered = { updatedHubs -> RemoteSettings.saveHarmonyHubs(this, updatedHubs) }
            )
        configServer =
            ConfigServer(
                context = this,
                harmonyRegistry = harmonyRegistry,
                haClient = client,
                onConnectionSaved = { runOnUiThread { reconnectWithNewSettings() } },
                onDashboardUpdated = { runOnUiThread { reloadDashboard() } },
                getPageNames = { dashboard.config.pages.map { it.name } },
                getCurrentPageIndex = { currentPageIndex },
                // Reuses the exact mechanism hardware shortcut buttons already use
                // (see runHotkey's `hk.page` branch): set navTarget, Dashboard's
                // LaunchedEffect(navTarget) does the scrollToPage + clears it.
                onSetPage = { index -> runOnUiThread { navTarget = index } },
                getActivityRuntime = { activityRuntime },
                onStartActivity = { id -> runOnUiThread { startActivityFn?.invoke(id) } },
                onStopActivity = { room -> runOnUiThread { stopActivityFn?.invoke(room) } }
            )
    }

    /** Called when the user saves new HA/Harmony connection settings via the
     *  web configurator. Disconnects the old clients, re-creates them with the
     *  updated settings, restarts the ConfigServer, and re-composes the UI —
     *  all within the same Activity instance, no recreate() needed. */
    private fun reconnectWithNewSettings() {
        Log.i("MainActivity", "reconnectWithNewSettings")
        client.disconnect()
        harmonyRegistry.disconnectAll()
        runCatching { configServer.stop() }

        initClientsAndServer()
        if (configServerEnabled) startConfigServer()
        client.connect()
        lifecycleScope.launch { harmonyRegistry.connectAll() }

        composeContent()
    }

    private fun composeContent() {
        setContent {
            val entities = client.entities.collectAsState()
            val connection = client.connection.collectAsState()
            Dashboard(
                client = client,
                harmonyRegistry = harmonyRegistry,
                entitiesState = entities,
                connectionState = connection,
                config = dashboard.config,
                configNotice = dashboard.notice,
                navTarget = navTarget,
                onNavHandled = { navTarget = null },
                overlayTarget = overlayTarget,
                onOverlayHandled = { overlayTarget = null },
                onPageChanged = { pageIndex ->
                    currentPageIndex = pageIndex
                    rebindHotkeysForCurrentPage()
                },
                wakeOnMotionEnabled = wakeOnMotionEnabled,
                setWakeOnMotionEnabled = { enabled -> setWakeOnMotion(enabled) },
                configServerEnabled = configServerEnabled,
                setConfigServerEnabled = { enabled -> updateConfigServerEnabled(enabled) },
                screenOn = screenOn,
                onActivityRuntimeReady = { activityRuntime = it },
                onStartActivityReady = { fn -> startActivityFn = fn },
                onStopActivityReady = { fn -> stopActivityFn = fn }
            )
        }
    }

    /**
     * Jump to the current page's [PageConfig.parent], if any — the same
     * navTarget mechanism `runHotkey`'s own page-navigation branch uses.
     * Returns false (no-op) on a root page, or if the parent name doesn't
     * resolve to an actual page.
     */
    private fun goToParent(): Boolean {
        val parentName =
            dashboard.config.pages
                .getOrNull(currentPageIndex)
                ?.parent ?: return false
        val idx = dashboard.config.pages.indexOfFirst { it.name.equals(parentName, ignoreCase = true) }
        if (idx < 0) return false
        navTarget = idx
        return true
    }

    /**
     * Safety net for the default case only. The configurable parent-jump
     * itself is bound as a regular fallback handler in `keyRouter` by
     * `rebindHotkeysForCurrentPage()`, for whichever key [PageConfig.parentKey]
     * names — that's what fires for a custom (non-BACK) key, via
     * `dispatchKeyEvent`. This override exists only to preserve the exact
     * original behavior when `parentKey` is left at its default ("BACK"):
     * if it were set to something else, the hardware BACK button goes back
     * to doing nothing here, same as a page with no parent at all — it's
     * simply no longer this page's configured "leave" button. Either way,
     * BACK is never allowed to dismiss the launcher itself (kiosk mode).
     */
    @Suppress("DEPRECATION")
    @SuppressLint("MissingSuperCall") // intentional: BACK is fully intercepted on root pages
    // to keep this a kiosk-mode launcher — see class doc above.
    override fun onBackPressed() {
        val page = dashboard.config.pages.getOrNull(currentPageIndex) ?: return
        if (page.parent != null && page.parentKey.equals("BACK", ignoreCase = true)) {
            goToParent()
        }
    }

    override fun onResume() {
        super.onResume()
        reloadDashboard()
    }

    private fun reloadDashboard() {
        val result = DashboardLoader.load()
        dashboard = result
        currentPageIndex = currentPageIndex.coerceIn(0, result.config.pages.size - 1)
        rebindHotkeysForCurrentPage()
    }

    /** Merge the global hotkeys with the current page's own hotkeys — a
     * page-scoped binding for a given key wins over the global one for that
     * same key while that page is visible; keys the page doesn't touch keep
     * their global behavior (e.g. volume always targets the soundbar). Then,
     * if the page has a [PageConfig.parent], layer in the parent-navigation
     * fallback on [PageConfig.parentKey] — but only if that key isn't
     * already claimed by one of the hotkeys just bound above, so an AV page
     * that binds its own hotkey on the same key (e.g. a custom HOME action)
     * is never overridden by the fallback. */
    private fun rebindHotkeysForCurrentPage() {
        val page = dashboard.config.pages.getOrNull(currentPageIndex)
        val mergedShort = mergeHotkeys(dashboard.config.hotkeys, page?.hotkeys.orEmpty())
        val mergedLong = mergeHotkeys(dashboard.config.longHotkeys, page?.longHotkeys.orEmpty())
        bindHotkeys(mergedShort, mergedLong)

        if (page?.parent != null) {
            val key = runCatching { HardwareKey.valueOf(page.parentKey.uppercase()) }.getOrNull()
            if (key != null && !keyRouter.isShortBound(key)) {
                keyRouter.on(key) { goToParent() }
            }
        }
    }

    private fun mergeHotkeys(global: List<HotkeyConfig>, pageSpecific: List<HotkeyConfig>): List<HotkeyConfig> {
        val byKey = LinkedHashMap<String, HotkeyConfig>()
        global.forEach { byKey[it.key.uppercase()] = it }
        pageSpecific.forEach { byKey[it.key.uppercase()] = it } // Page overrides global for the same key
        return byKey.values.toList()
    }

    // ---- Hotkeys ------------------------------------------------------------

    private fun bindHotkeys(short: List<HotkeyConfig>, long: List<HotkeyConfig>) {
        keyRouter.clear()
        short.forEach { hk ->
            val key =
                runCatching { HardwareKey.valueOf(hk.key.uppercase()) }.getOrNull()
                    ?: return@forEach
            keyRouter.on(key) { runHotkey(hk) }
        }
        long.forEach { hk ->
            val key =
                runCatching { HardwareKey.valueOf(hk.key.uppercase()) }.getOrNull()
                    ?: return@forEach
            keyRouter.onLong(key) { runHotkey(hk) }
        }
    }

    /** `hk.openOverlay`'s handling, split out of [runHotkey] purely to keep
     * that function's cyclomatic complexity down — behavior unchanged. */
    private fun openOverlayHotkey(target: String): Boolean {
        if (!target.equals("settings", ignoreCase = true) && !target.equals("activities", ignoreCase = true)) return false
        overlayTarget = target.lowercase()
        return true
    }

    /** `hk.openCurrentActivityRoom`'s handling, split out of [runHotkey]
     * purely to keep that function's cyclomatic complexity down — behavior
     * unchanged. Deliberately does NOT fall through to the rest of a
     * binding's action chain when the room has nothing active: a hotkey
     * configured for this is meant to be a dedicated "back to what's
     * playing" button, not a page-nav/service call in disguise for the
     * idle case. */
    private fun openCurrentActivityHotkey(room: String): Boolean {
        val pageName = activityRuntime?.activeActivity(room)?.page ?: return false
        val idx = dashboard.config.pages.indexOfFirst { it.name.equals(pageName, ignoreCase = true) }
        if (idx < 0) return false
        navTarget = idx
        return true
    }

    /**
     * Execute one hotkey, in priority order:
     *  1. Open overlay (settings / active activities)
     *  2. Open current Activity's page for a room
     *  3. Page navigation
     *  4. Harmony Activity by id
     *  5. Direct Harmony hub command (harmonyDevice + harmonyCommand) — no HA involved
     *  6. Local IR command (irDevice + irCommand) — no hub, no HA, fully offline
     *  7. Home Assistant service call
     */
    private fun runHotkey(hk: HotkeyConfig): Boolean {
        if (hk.openOverlay != null) return openOverlayHotkey(hk.openOverlay)
        if (hk.openCurrentActivityRoom != null) return openCurrentActivityHotkey(hk.openCurrentActivityRoom)

        hk.page?.let { pageName ->
            val idx = dashboard.config.pages.indexOfFirst { it.name.equals(pageName, ignoreCase = true) }
            if (idx < 0) return false
            navTarget = idx
            return true
        }

        hk.harmonyActivity?.let { activityId ->
            harmonyRegistry.client(hk.hub)?.startActivity(activityId)
                ?: Log.w("MainActivity", "hotkey harmonyActivity=$activityId (hub=${hk.hub}) but that hub isn't configured")
            return true
        }

        val device = hk.harmonyDevice
        val command = hk.harmonyCommand
        if (device != null && command != null) {
            harmonyRegistry.client(hk.hub)?.sendCommand(device, command)
                ?: Log.w("MainActivity", "hotkey harmonyCommand (hub=${hk.hub}) but that hub isn't configured")
            return true
        }

        val irDevice = hk.irDevice
        val irCommand = hk.irCommand
        if (irDevice != null && irCommand != null) {
            val irStep =
                dashboard.config.irDevices
                    .firstOrNull { it.id == irDevice }
                    ?.commands
                    ?.get(irCommand)
            if (irStep != null) {
                runCatching { irManager?.transmit(irStep.freq, irStep.pattern.toIntArray()) }
                    .onFailure { Log.e("MainActivity", "hotkey IR send failed: $irDevice/$irCommand", it) }
            } else {
                Log.w("MainActivity", "hotkey irDevice=$irDevice irCommand=$irCommand not found in AppConfig.irDevices")
            }
            return true
        }

        val service = hk.service ?: return false
        val domain = service.substringBefore('.')
        val svc = service.substringAfter('.')
        val data = hk.data.mapValues { JsonPlain.toJson(it.value) }
        client.callService(ServiceCall(domain, svc, hk.entityId, data))
        return true
    }

    @SuppressLint("RestrictedApi")
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val code = event.keyCode
        val shortH = keyRouter.shortHandler(code)
        val longH = keyRouter.longHandler(code)

        if (shortH == null && longH == null) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                Log.i(KEY_TAG, "keyCode=$code (${KeyEvent.keyCodeToString(code)})")
                if (DEBUG_KEYS) Toast.makeText(this, "Unmapped key: $code", Toast.LENGTH_SHORT).show()
            }
            return super.dispatchKeyEvent(event)
        }

        when (event.action) {
            KeyEvent.ACTION_DOWN -> {
                if (longH != null) {
                    if (event.repeatCount == 0) {
                        cancelPendingLong()
                        longFired = false
                        activeLongKey = code
                        val r =
                            Runnable {
                                longFired = true
                                longH.invoke()
                            }
                        pendingLong = r
                        keyHandler.postDelayed(r, LONG_PRESS_MS)
                    }
                } else {
                    shortH?.invoke()
                }
                return true
            }
            KeyEvent.ACTION_UP -> {
                if (longH != null && code == activeLongKey) {
                    cancelPendingLong()
                    activeLongKey = -1
                    if (!longFired) shortH?.invoke()
                }
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun cancelPendingLong() {
        pendingLong?.let { keyHandler.removeCallbacks(it) }
        pendingLong = null
    }

    // ---- Motion Wake --------------------------------------------------------

    private fun setupMotionWake() {
        val sm = getSystemService(SENSOR_SERVICE) as? SensorManager ?: return
        sensorManager = sm

        motionSensor = sm
            .getSensorList(Sensor.TYPE_ACCELEROMETER)
            .firstOrNull { it.isWakeUpSensor }
            ?: sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        if (wakeOnMotionEnabled) registerMotionListener()
    }

    private fun registerMotionListener() {
        val sm = sensorManager ?: return
        motionSensor?.let { sensor ->
            sm.registerListener(motionListener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    /** Called from the settings page switch — persists the choice and
     * registers/unregisters the sensor listener immediately, no restart needed. */
    private fun setWakeOnMotion(enabled: Boolean) {
        wakeOnMotionEnabled = enabled
        prefs.edit { putBoolean("wake_on_motion_enabled", enabled) }
        if (enabled) {
            registerMotionListener()
        } else {
            sensorManager?.unregisterListener(motionListener)
        }
    }

    private fun startConfigServer() {
        runCatching { configServer.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false) }
            .onSuccess { Log.i("ConfigServer", "started on :8080") }
            .onFailure {
                Log.e("ConfigServer", "failed to start on :8080", it)
                keyHandler.postDelayed({
                    if (!isDestroyed) {
                        runCatching { configServer.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false) }
                            .onSuccess { Log.i("ConfigServer", "retry: started on :8080") }
                            .onFailure { e -> Log.e("ConfigServer", "retry failed on :8080", e) }
                    }
                }, 500L)
            }
    }

    /** Called from the settings page switch — persists the choice and
     * starts/stops the :8080 server immediately, no restart needed. Turning
     * it off also closes /builder/, icon uploads, and dashboard.json
     * upload/download until it's switched back on from here. */
    private fun updateConfigServerEnabled(enabled: Boolean) {
        configServerEnabled = enabled
        prefs.edit { putBoolean("config_server_enabled", enabled) }
        if (enabled) {
            startConfigServer()
        } else {
            runCatching { configServer.stop() }
        }
    }

    @Suppress("DEPRECATION")
    private fun wakeScreen() {
        val pm = getSystemService(POWER_SERVICE) as? PowerManager ?: return
        if (pm.isInteractive) return
        val now = System.currentTimeMillis()
        if (now - lastWakeMs < WAKE_COOLDOWN_MS) return
        lastWakeMs = now

        // Suppressed deprecation for older Android 8.1 (HA100 remote) compatibility
        val flags =
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE

        val wl = pm.newWakeLock(flags, "astrion:motionwake")
        wl.acquire(4000)
        keyHandler.postDelayed({ if (wl.isHeld) wl.release() }, 3500)
    }

    override fun onDestroy() {
        Log.i("MainActivity", "onDestroy — activity instance ${this.hashCode()}")
        sensorManager?.unregisterListener(motionListener)
        runCatching { unregisterReceiver(screenStateReceiver) }
        client.disconnect()
        harmonyRegistry.disconnectAll()
        runCatching { configServer.stop() }
        super.onDestroy()
    }
}
