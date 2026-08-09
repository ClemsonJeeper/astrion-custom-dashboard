package com.custom.astrion

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
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
import androidx.lifecycle.lifecycleScope
import com.custom.astrion.config.DashboardConfig
import com.custom.astrion.config.DashboardLoader
import com.custom.astrion.config.HotkeyConfig
import com.custom.astrion.config.JsonPlain
import com.custom.astrion.config.RemoteSettings
import com.custom.astrion.ha.HaClient
import com.custom.astrion.ha.ServiceCall
import com.custom.astrion.harmony.HarmonyHubClient
import com.custom.astrion.harmony.HarmonyHubRegistry
import com.custom.astrion.input.HardwareKey
import com.custom.astrion.input.HardwareKeyRouter
import com.custom.astrion.ui.Dashboard
import com.custom.astrion.web.ConfigServer
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.sqrt

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
        const val DEBUG_KEYS = true
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
    private val motionListener = object : SensorEventListener {
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

    private lateinit var client: HaClient

    /** Owns one HarmonyHubClient per configured Harmony hub. */
    private lateinit var harmonyRegistry: HarmonyHubRegistry

    private lateinit var configServer: ConfigServer
    private val keyRouter = HardwareKeyRouter()
    private var dashboard by mutableStateOf(DashboardLoader.Result(DashboardConfig.default, null))
    private var navTarget by mutableStateOf<Int?>(null)

    /** Which page is currently visible — used to know which page-scoped
     * hotkeys should currently be layered on top of the global ones. */
    private var currentPageIndex = 0

    private val prefs by lazy { getSharedPreferences("astrion_settings", MODE_PRIVATE) }

    /** Backing state for the settings page's "Wake on movement" switch —
     * persisted, and toggled live via setWakeOnMotion() without a restart. */
    private var wakeOnMotionEnabled by mutableStateOf(true)

    private val storagePermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { reloadDashboard() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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
                    Manifest.permission.WRITE_EXTERNAL_STORAGE,
                )
            )
        }

        wakeOnMotionEnabled = prefs.getBoolean("wake_on_motion_enabled", true)
        setupMotionWake()

        client = HaClient(baseUrl = RemoteSettings.haUrl(this), token = RemoteSettings.haToken(this))
        harmonyRegistry = HarmonyHubRegistry(
            hubs = RemoteSettings.harmonyHubs(this),
            onError = { hubName, msg -> Log.e("HarmonyHubClient", "[$hubName] $msg") },
            onHubIdDiscovered = { updatedHubs -> RemoteSettings.saveHarmonyHubs(this, updatedHubs) },
        )
        configServer = ConfigServer(
            context = this,
            harmonyRegistry = harmonyRegistry,
            onConnectionSaved = { runOnUiThread { recreate() } },
            onDashboardUpdated = { runOnUiThread { reloadDashboard() } },
        )
        runCatching { configServer.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false) }
            .onFailure { Log.e("ConfigServer", "failed to start on :8080", it) }
        lifecycleScope.launch { harmonyRegistry.connectAll() }

        currentPageIndex = dashboard.config.startPage
        rebindHotkeysForCurrentPage()
        client.connect()

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
                onPageChanged = { pageIndex ->
                    currentPageIndex = pageIndex
                    rebindHotkeysForCurrentPage()
                },
                wakeOnMotionEnabled = wakeOnMotionEnabled,
                setWakeOnMotionEnabled = { enabled -> setWakeOnMotion(enabled) },
            )
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
     * their global behavior (e.g. volume always targets the soundbar). */
    private fun rebindHotkeysForCurrentPage() {
        val page = dashboard.config.pages.getOrNull(currentPageIndex)
        val mergedShort = mergeHotkeys(dashboard.config.hotkeys, page?.hotkeys.orEmpty())
        val mergedLong = mergeHotkeys(dashboard.config.longHotkeys, page?.longHotkeys.orEmpty())
        bindHotkeys(mergedShort, mergedLong)
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
            val key = runCatching { HardwareKey.valueOf(hk.key.uppercase()) }.getOrNull()
                ?: return@forEach
            keyRouter.on(key) { runHotkey(hk) }
        }
        long.forEach { hk ->
            val key = runCatching { HardwareKey.valueOf(hk.key.uppercase()) }.getOrNull()
                ?: return@forEach
            keyRouter.onLong(key) { runHotkey(hk) }
        }
    }

    /**
     * Execute one hotkey, in priority order:
     *  1. Page navigation
     *  2. Harmony Activity by id
     *  3. Direct Harmony hub command (harmonyDevice + harmonyCommand) — no HA involved
     *  4. Home Assistant service call
     */
    private fun runHotkey(hk: HotkeyConfig): Boolean {
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
                        val r = Runnable {
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

        motionSensor = sm.getSensorList(Sensor.TYPE_ACCELEROMETER)
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
        prefs.edit().putBoolean("wake_on_motion_enabled", enabled).apply()
        if (enabled) {
            registerMotionListener()
        } else {
            sensorManager?.unregisterListener(motionListener)
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
        val flags = PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE

        val wl = pm.newWakeLock(flags, "astrion:motionwake")
        wl.acquire(4000)
        keyHandler.postDelayed({ if (wl.isHeld) wl.release() }, 3500)
    }

    override fun onDestroy() {
        sensorManager?.unregisterListener(motionListener)
        client.disconnect()
        harmonyRegistry.disconnectAll()
        configServer.stop()
        super.onDestroy()
    }
}