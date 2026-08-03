package com.custom.astrion.harmony

import android.os.Handler
import android.os.Looper
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

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
    private val hubId: String,
    private val onConnected: () -> Unit = {},
    private val onError: (String) -> Unit = {},
) {
    private companion object {
        const val TAG = "HarmonyHubClient"
        const val RECONNECT_DELAY_MS = 2000L
        const val PRESS_HOLD_DELAY_MS = 120L
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

    private fun scheduleReconnect() {
        if (intentionalDisconnect) return
        Log.d(TAG, "Reconnecting in ${RECONNECT_DELAY_MS}ms...")
        mainHandler.postDelayed({ connect() }, RECONNECT_DELAY_MS)
    }

    fun disconnect() {
        intentionalDisconnect = true
        _connected.value = false
        webSocket?.close(1000, "Normal closure")
        webSocket = null
    }

    /**
     * Starts a Harmony Activity (e.g. "Watch Apple TV"), NOT a simple IR command.
     * Uses a different mechanism on the hub side (runactivity vs holdAction).
     * `activityId` comes from harmony_config.json (data[0].activity[].id).
     * PowerOff uses a special ID: "-1".
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
}