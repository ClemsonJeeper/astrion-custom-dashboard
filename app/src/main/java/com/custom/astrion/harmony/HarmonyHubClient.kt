package com.custom.astrion.harmony

import android.os.Handler
import android.os.Looper
import android.util.Log
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/** One remote-control command exposed by a [HarmonyDevice] (e.g. "VolumeUp"). */
data class HarmonyCommand(val name: String, val label: String)

/** One device known to the hub (TV, receiver, etc.), with its available commands. */
data class HarmonyDevice(val id: String, val label: String, val commands: List<HarmonyCommand>)

/** One Activity known to the hub (e.g. "Watch Apple TV"). id "-1" is always PowerOff. */
data class HarmonyActivity(val id: String, val label: String)

/** Full hub config as returned by [HarmonyHubClient.getConfig] — devices + activities. */
data class HarmonyConfig(val devices: List<HarmonyDevice>, val activities: List<HarmonyActivity>)

/**
 * Direct WebSocket client for a Logitech Harmony Hub, bypassing Home Assistant.
 * Replicates the behavior of the original Harmony Elite remote control.
 *
 * Protocol details (community reverse-engineered, non-official):
 *   ws://<HUB_IP>:8088/?domain=svcs.myharmony.com&hubId=<HUB_ID>
 *   Required Header: Origin: http://sl.dhg.myharmony.com
 *
 * NOTE: This local WebSocket API is not officially documented by Logitech.
 */
@Suppress("SpellCheckingInspection")
class HarmonyHubClient(
    private val hubIp: String,
    private var hubId: String,
    private val onConnected: () -> Unit = {},
    private val onError: (String) -> Unit = {},
) {
    private companion object {
        const val TAG = "HarmonyHubClient"
        const val RECONNECT_DELAY_MS = 2000L
        const val PRESS_HOLD_DELAY_MS = 120L
        const val CONFIG_TIMEOUT_MS = 8000L
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .callTimeout(10, TimeUnit.SECONDS)
        // Sends a WS ping every 20s — most embedded WS servers (this hub
        // included) drop idle connections around 60s otherwise.
        .pingInterval(20, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private var nextMsgId = 1

    /** Set by disconnect() so onFailure/onClosed know not to auto-reconnect. */
    private var intentionalDisconnect = false
    private val mainHandler = Handler(Looper.getMainLooper())

    private val _connected = MutableStateFlow(false)

    /** Live connection state, for a status indicator on the settings page. */
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    /** Outstanding request/response commands (currently just getConfig), keyed by the hbus msg id. */
    private val pending = ConcurrentHashMap<String, CompletableDeferred<JSONObject>>()

    /** Updates the hubId dynamically if it was initially resolved from a blank value during discovery. */
    fun updateHubId(newHubId: String) {
        this.hubId = newHubId
    }

    fun connect() {
        if (hubIp.isBlank()) {
            Log.w(TAG, "connect() called with no hub IP — Harmony not configured, skipping")
            return
        }
        intentionalDisconnect = false
        val url = "ws://$hubIp:8088/?domain=svcs.myharmony.com&hubId=$hubId"
        Log.d(TAG, "connect() -> $url")
        val request = Request.Builder()
            .url(url)
            .addHeader("Origin", "http://sl.dhg.myharmony.com")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "onOpen: handshake HTTP ${response.code}")
                _connected.value = true
                onConnected()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "onMessage: $text")
                routeMessage(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.w(TAG, "onClosing: code=$code reason=$reason")
                _connected.value = false
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.w(TAG, "onClosed: code=$code reason=$reason")
                _connected.value = false
                scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                val detail = buildString {
                    append(t.javaClass.simpleName)
                    append(": ")
                    append(t.message ?: "(no message)")
                    if (response != null) {
                        append(" | HTTP ${response.code} ${response.message}")
                        runCatching { response.body?.string() }.getOrNull()?.let { body ->
                            if (body.isNotBlank()) append(" | body: ${body.take(200)}")
                        }
                    }
                }
                Log.e(TAG, "onFailure: $detail", t)
                _connected.value = false
                onError(detail)
                scheduleReconnect()
            }
        })
    }

    /**
     * Routes an incoming frame to a waiting [getConfig] caller if its "id"
     * matches an outstanding request; unsolicited frames (activity change
     * notifications, etc.) are just logged for now.
     */
    private fun routeMessage(text: String) {
        val obj = runCatching { JSONObject(text) }.getOrNull() ?: return
        val id = obj.optString("id", null) ?: return
        pending.remove(id)?.complete(obj)
    }

    private fun scheduleReconnect() {
        if (intentionalDisconnect) return
        Log.d(TAG, "Reconnecting in ${RECONNECT_DELAY_MS}ms...")
        mainHandler.postDelayed({ connect() }, RECONNECT_DELAY_MS)
    }

    fun disconnect() {
        intentionalDisconnect = true
        _connected.value = false
        // Cancels any already-scheduled reconnect (mainHandler.postDelayed in
        // scheduleReconnect()) — without this, a reconnect queued just before
        // disconnect() is called still fires: it runs on the process-wide main
        // looper, not tied to this client instance's lifecycle, so it survives
        // even after the hub was removed from settings and MainActivity recreated.
        mainHandler.removeCallbacksAndMessages(null)
        pending.values.forEach { it.cancel() }
        pending.clear()
        webSocket?.close(1000, "Normal closure")
        webSocket = null
    }

    /**
     * Starts a Harmony Activity (e.g. "Watch Apple TV"), NOT a simple IR command.
     * Uses a different mechanism on the hub side (runactivity vs holdAction).
     * `activityId` comes from harmony_config.json (data[0].activity[].id), or
     * from [getConfig] directly. PowerOff uses a special ID: "-1".
     *
     * JSON payload format confirmed by community implementations
     * (NovaGL/diy-harmonyhub, DavidPhillipOster/DIYHarmonyApp):
     *   {"cmd": "harmony.activityengine?runactivity", "params": {"activityId": "-1"}}
     */
    fun startActivity(activityId: String) {
        val params = JSONObject().apply {
            put("activityId", activityId)
        }

        val hbus = JSONObject().apply {
            put("cmd", "harmony.activityengine?runactivity")
            put("id", (nextMsgId++).toString())
            put("params", params)
        }

        val envelope = JSONObject().apply {
            put("hubId", hubId)
            put("timeout", 30)
            put("hbus", hbus)
        }

        val payload = envelope.toString()
        Log.d(TAG, "startActivity($activityId): $payload")
        val sent = webSocket?.send(payload)
        Log.d(TAG, "send() returned: $sent")
    }

    fun sendCommand(deviceId: String, command: String) {
        val timestamp = System.currentTimeMillis()
        val action = JSONObject().apply {
            put("type", "IRCommand")
            put("deviceId", deviceId)
            put("command", command)
        }

        sendHoldAction(status = "press", action = action, timestamp = timestamp)

        if (webSocket != null) {
            mainHandler.postDelayed({
                sendHoldAction(status = "release", action = action, timestamp = timestamp)
            }, PRESS_HOLD_DELAY_MS)
        }
    }

    private fun sendHoldAction(status: String, action: JSONObject, timestamp: Long) {
        val params = JSONObject().apply {
            put("status", status)
            put("timestamp", timestamp.toString())
            put("verb", "render")
            put("action", action.toString())
        }

        val hbus = JSONObject().apply {
            put("cmd", "vnd.logitech.harmony/vnd.logitech.harmony.engine?holdAction")
            put("id", (nextMsgId++).toString())
            put("params", params)
        }

        val envelope = JSONObject().apply {
            put("hubId", hubId)
            put("timeout", 30)
            put("hbus", hbus)
        }

        val payload = envelope.toString()
        Log.d(TAG, "send: $payload")
        val sent = webSocket?.send(payload)
        Log.d(TAG, "send() returned: $sent (false = socket not open/queue full)")
    }

    /**
     * Fetches the hub's full config — every paired device with its available
     * IR commands, plus every Activity — the same data Home Assistant's
     * Harmony integration keeps in `harmony_<hubId>.conf`. Lets users manage
     * a Harmony hub from this app without ever needing Home Assistant.
     *
     * Returns null on timeout, if not connected, or on a malformed response.
     * Safe to call repeatedly (e.g. to refresh after re-pairing a device).
     */
    suspend fun getConfig(): HarmonyConfig? {
        val socket = webSocket ?: run {
            Log.w(TAG, "getConfig() called while not connected")
            return null
        }
        val id = (nextMsgId++).toString()
        val deferred = CompletableDeferred<JSONObject>()
        pending[id] = deferred

        val params = JSONObject().apply {
            put("verb", "get")
            put("format", "json")
        }
        val hbus = JSONObject().apply {
            put("cmd", "vnd.logitech.harmony/vnd.logitech.harmony.engine?config")
            put("id", id)
            put("params", params)
        }
        val envelope = JSONObject().apply {
            put("hubId", hubId)
            put("timeout", 30)
            put("hbus", hbus)
        }

        Log.d(TAG, "getConfig(): ${envelope}")
        socket.send(envelope.toString())

        val reply = withTimeoutOrNull(CONFIG_TIMEOUT_MS) { deferred.await() }
        pending.remove(id)
        if (reply == null) {
            Log.w(TAG, "getConfig() timed out")
            return null
        }
        return runCatching { parseConfig(reply) }
            .onFailure { Log.e(TAG, "getConfig(): malformed response", it) }
            .getOrNull()
    }

    /**
     * The hub's "config" response nests its payload in a `data` field that,
     * depending on hub firmware, is either a JSON object directly or a JSON
     * *string* that itself needs parsing — handle both (same quirk other
     * community Harmony clients, e.g. harmonyhubjs-client, work around).
     */
    private fun parseConfig(reply: JSONObject): HarmonyConfig {
        val rawData = reply.opt("data")
        val data: JSONObject = when (rawData) {
            is JSONObject -> rawData
            is String -> JSONObject(rawData)
            else -> error("no \"data\" field in config response")
        }

        val devices = (data.optJSONArray("device") ?: JSONArray()).let { arr ->
            (0 until arr.length()).map { i ->
                val d = arr.getJSONObject(i)
                val commands = mutableListOf<HarmonyCommand>()
                val groups = d.optJSONArray("controlGroup") ?: JSONArray()
                for (g in 0 until groups.length()) {
                    val functions = groups.getJSONObject(g).optJSONArray("function") ?: JSONArray()
                    for (f in 0 until functions.length()) {
                        val fn = functions.getJSONObject(f)
                        val name = fn.optString("name")
                        if (name.isNotBlank()) {
                            commands += HarmonyCommand(name = name, label = fn.optString("label", name))
                        }
                    }
                }
                HarmonyDevice(
                    id = d.optString("id"),
                    label = d.optString("label", d.optString("name", d.optString("id"))),
                    commands = commands,
                )
            }
        }

        val activities = (data.optJSONArray("activity") ?: JSONArray()).let { arr ->
            (0 until arr.length()).map { i ->
                val a = arr.getJSONObject(i)
                HarmonyActivity(
                    id = a.optString("id"),
                    label = a.optString("label", a.optString("name", a.optString("id"))),
                )
            }
        }

        return HarmonyConfig(devices = devices, activities = activities)
    }
}