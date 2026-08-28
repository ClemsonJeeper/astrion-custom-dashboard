package com.custom.astrion.voice

import android.util.Log
import com.custom.astrion.config.VoiceConfig
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.Call
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import okio.BufferedSink

/** Which endpoint a press streams the microphone to. */
enum class VoiceRoute { ASSIST, SIRI }

/** What the on-screen indicator shows. */
sealed class VoiceState {
    data object Idle : VoiceState()
    data object Listening : VoiceState()
    data object Thinking : VoiceState()
    data class Done(val route: String?, val transcript: String?, val response: String?) : VoiceState()
    data class Error(val message: String) : VoiceState()
}

/**
 * The VOICE key: press, talk, and it ends itself on silence.
 *
 * Two routes, both a chunked PCM16 upload from the same [MicCapture] — only the
 * destination path differs:
 *  - [VoiceRoute.ASSIST] (`voice.path`) — a custom HA component that runs the
 *    audio through the local Assist pipeline (STT + intent) and replies with a
 *    transcript.
 *  - [VoiceRoute.SIRI] (`voice.siriPath`) — a bridge that forwards straight to
 *    Siri on the target Apple TV, holding its SIRI button down for exactly as
 *    long as this request body stays open.
 *
 * The upload is chunked and the request body IS the live microphone: audio
 * leaves the remote while the user is still speaking rather than after they
 * finish.
 *
 * VOICE's short binding (tap -> Assist) and long binding (hold -> Siri) both
 * capture from the same physical key, so which one an in-progress press turns
 * out to be isn't known until either the long-press threshold fires (a hold)
 * or the key comes up first (a tap) — see MainActivity.bindHotkeys' `onLong` /
 * `onPressStart` / `onLongRelease` registrations. To make a hold start
 * streaming to Siri the instant the key goes down rather than after that
 * threshold, [startOrRedirect] is called eagerly on press (assuming SIRI,
 * since that's the long binding) and MainActivity resolves the ambiguity
 * afterward: unchanged if the guess was right, or [startOrRedirect] again with
 * ASSIST if it turned out to be a tap, which discards the false start and
 * begins fresh rather than trying to redirect an already-open HTTP request.
 */
class VoiceSession(private val baseUrl: String, private val token: String) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val json = Json { ignoreUnknownKeys = true }

    // No timeouts on write/read: the call lasts as long as the person talks.
    private val http = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .writeTimeout(0, TimeUnit.MILLISECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .callTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private val _state = MutableStateFlow<VoiceState>(VoiceState.Idle)
    val state: StateFlow<VoiceState> = _state.asStateFlow()

    private var capture: MicCapture? = null
    private var call: Call? = null
    private var job: Job? = null
    private var activeRoute: VoiceRoute? = null

    /** Bumped on every [start]; a completing/cancelled/erroring request from a
     * superseded generation must not touch [_state] — [cancelInFlight] aborts
     * the underlying call, but that abort is asynchronous (the exception lands
     * whenever OkHttp notices, not synchronously), so without this a stale
     * request's catch block could stomp the new one's Listening/Done/Error
     * state after the fact. */
    private var generation = 0

    /**
     * Start capturing for [route], or reconcile with a capture already running.
     *
     * - Not currently listening: starts fresh.
     * - Already listening for this same [route]: no-op — this is the
     *   long-press threshold's redundant confirmation of a hold [startOrRedirect]
     *   already started eagerly on press, not a new gesture.
     * - Already listening for a DIFFERENT route: the eager press-time guess
     *   was wrong (a hold assumed -> turned out to be a tap). Discards that
     *   false start via [cancelInFlight] — nothing it captured is sent
     *   anywhere — and starts over for the real destination.
     *
     * `cfg` is passed per press rather than held, so a layout re-sync takes
     * effect on the next press with no re-wiring.
     *
     * `page` is the name of the dashboard page currently on screen (or null),
     * sent to the server as an `X-Astrion-Page` header so HA can route the
     * utterance context-sensitively (e.g. a "Search:" phrase on a TV page
     * types into the TV's search field instead of going to Assist).
     */
    fun startOrRedirect(cfg: VoiceConfig?, page: String? = null, route: VoiceRoute = VoiceRoute.ASSIST) {
        if (_state.value is VoiceState.Listening) {
            if (route == activeRoute) {
                Log.i(TAG, "already listening on $route, no-op")
                return
            }
            Log.i(TAG, "redirecting from $activeRoute to $route (resolved as a different gesture)")
            cancelInFlight()
        }
        start(cfg ?: VoiceConfig(), page, route)
    }

    /**
     * Release-to-stop for a hold gesture (VOICE key's long-press -> Siri):
     * lets whatever was already recorded flush out as a normal completed
     * utterance, rather than aborting the request the way [cancelInFlight]
     * does. MicCapture's own silence/max-length timeouts remain as a fallback
     * if this is never called (e.g. a route with no release handler bound).
     * No-op outside [VoiceState.Listening] (already stopped, or never started).
     */
    fun stopIfListening() {
        if (_state.value !is VoiceState.Listening) return
        Log.i(TAG, "key released, stopping capture")
        capture?.stop()
    }

    /** Aborts an in-flight request outright — nothing it captured is sent.
     * Used only by [startOrRedirect] to discard a wrong eager-route guess;
     * release-to-stop ([stopIfListening]) is a normal end of a correct one. */
    private fun cancelInFlight() {
        capture?.stop()
        call?.cancel()
        job?.cancel()
    }

    private fun start(cfg: VoiceConfig, page: String?, route: VoiceRoute) {
        if (baseUrl.isBlank() || token.isBlank()) {
            _state.value = VoiceState.Error("No Home Assistant connection")
            autoDismiss()
            return
        }
        generation++
        val myGeneration = generation
        // SIRI is a hold: the key's own up event (stopIfListening) ends the
        // capture, same as a real Siri remote, so the silence/no-speech guesses
        // below would only ever cut it short while the person is still holding
        // and thinking. maxMs stays on as a safety net in case a release is
        // ever missed (a stuck key report, an app in a bad state) — just a
        // much longer one than the tap-to-Assist default, since a deliberate
        // hold has no reason to be bounded that tightly.
        val mic = MicCapture(
            maxMs = if (route == VoiceRoute.SIRI) SIRI_HOLD_MAX_MS else cfg.maxMs,
            endOnSilence = route != VoiceRoute.SIRI,
            endSilenceMs = cfg.silenceMs,
            noSpeechMs = cfg.noSpeechMs
        )
        capture = mic
        activeRoute = route
        _state.value = VoiceState.Listening

        job = scope.launch {
            val body = object : RequestBody() {
                override fun contentType() = "application/octet-stream".toMediaType()

                // Unknown length -> OkHttp uses chunked encoding, which is what
                // lets the body stay open for the length of the utterance.
                override fun contentLength() = -1L

                override fun writeTo(sink: BufferedSink) {
                    val (total, peak) = mic.captureInto { buf, n ->
                        sink.write(buf, 0, n)
                        sink.flush() // push each ~100 ms chunk out immediately
                    }
                    Log.i(TAG, "streamed $total bytes (peak rms=$peak)")
                    // Capture has stopped; the indicator can move on while the
                    // server is still processing. A superseded generation (this
                    // was cancelled by a redirect) has already handed the
                    // indicator to the new capture — leave it alone.
                    if (myGeneration == generation) _state.value = VoiceState.Thinking
                }
            }

            val path = when (route) {
                VoiceRoute.ASSIST -> cfg.path
                VoiceRoute.SIRI -> cfg.siriPath.replace("{target}", cfg.siriTarget.orEmpty())
            }
            val req = Request.Builder()
                .url("${baseUrl.trimEnd('/')}$path")
                .addHeader("Authorization", "Bearer $token")
                .apply { if (!page.isNullOrBlank()) addHeader("X-Astrion-Page", page) }
                .post(body)
                .build()

            try {
                val thisCall = http.newCall(req)
                call = thisCall
                thisCall.execute().use { resp -> handleResponse(resp, myGeneration) }
            } catch (e: Exception) {
                if (myGeneration == generation) {
                    Log.w(TAG, "voice request failed: ${e.message}")
                    _state.value = VoiceState.Error(e.message ?: "Request failed")
                } else {
                    Log.d(TAG, "discarding a cancelled/superseded request's exception: ${e.message}")
                }
            }
            if (myGeneration == generation) autoDismiss()
        }
    }

    /** The HTTP side of a finished request — split out of [start] purely to
     * keep that function's cyclomatic complexity down, behavior unchanged. */
    private fun handleResponse(resp: Response, myGeneration: Int) {
        if (myGeneration != generation) return // superseded; discard the result
        val text = resp.body?.string().orEmpty()
        if (!resp.isSuccessful) {
            Log.w(TAG, "HTTP ${resp.code}: $text")
            _state.value = VoiceState.Error("HA returned ${resp.code}")
            return
        }
        val o = runCatching { json.parseToJsonElement(text) as JsonObject }.getOrNull()
        fun str(k: String) = o?.get(k)?.jsonPrimitive?.contentOrNull()
        // The Siri bridge reports failure (e.g. an utterance already in flight
        // on another Apple TV) as HTTP 200 with ok=false rather than a non-2xx
        // status.
        val ok = o?.get("ok")?.jsonPrimitive?.contentOrNull()
        if (ok == "false") {
            Log.w(TAG, "siri bridge reported failure: $text")
            _state.value = VoiceState.Error("Apple TV busy")
        } else {
            _state.value = VoiceState.Done(
                route = str("route"),
                transcript = str("transcript"),
                response = str("response")
            )
            Log.i(TAG, "route=${str("route")} transcript=${str("transcript")}")
        }
    }

    fun dismiss() {
        _state.value = VoiceState.Idle
    }

    private fun autoDismiss() {
        scope.launch {
            delay(DISMISS_MS)
            if (_state.value !is VoiceState.Listening) _state.value = VoiceState.Idle
        }
    }

    companion object {
        private const val TAG = "AstrionVoice"
        private const val DISMISS_MS = 4_000L

        /** Safety-net cap for a held SIRI capture — see [start]'s comment. */
        private const val SIRI_HOLD_MAX_MS = 30_000
    }
}

/** kotlinx-serialization returns "null" as a literal for JSON null. */
private fun kotlinx.serialization.json.JsonPrimitive.contentOrNull(): String? =
    if (isString || content != "null") content.takeIf { it != "null" } else null
