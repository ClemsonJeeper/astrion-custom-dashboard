package com.custom.astrion.harmony

import android.util.Log
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Resolves a Harmony Hub's numeric `hubId` (aka remoteId) from its IP alone,
 * so setting up a hub in the app only requires knowing its address — the
 * `hubId` used by [HarmonyHubClient]'s WebSocket connection is otherwise
 * easy to get wrong (mixing up hubs, copying one from an unrelated Home
 * Assistant `harmony_<id>.conf`, etc.), which fails the WS handshake with
 * "401 Wrong hubId".
 *
 * Protocol (community reverse-engineered, e.g. chadcb/harmonyhub,
 * jlynch630/Harmony.NET): a plain HTTP POST to the hub's own port 8088
 * (same port the WebSocket API uses) with a `connect.discoveryinfo?get`
 * command; the JSON response's `data.remoteId` field is the hubId. Uses the
 * same `Origin` header as HarmonyHubClient's WebSocket handshake — some hub
 * firmwares validate Origin on this endpoint too (a mismatched Origin here
 * showed up as a bare "417" from the hub with no useful body).
 */
object HarmonyHubDiscovery {
    private const val TAG = "HarmonyHubDiscovery"

    private val client =
        OkHttpClient
            .Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(5, TimeUnit.SECONDS)
            .build()

    private val jsonMediaType = "application/json".toMediaType()

    /** Returns the hub's hubId, or null if unreachable or the response was unexpected.
     * Logs the raw HTTP status/body on any failure — check Logcat (tag "HarmonyHubDiscovery")
     * if this returns null, to see exactly what the hub sent back. */
    suspend fun discoverHubId(ip: String): String? = withContext(Dispatchers.IO) {
        runCatching {
            val body =
                JSONObject()
                    .apply {
                        put("id", 1)
                        put("cmd", "setup.account?getProvisionInfo")
                        put("params", JSONObject())
                    }.toString()
                    .toRequestBody(jsonMediaType)

            val request =
                Request
                    .Builder()
                    .url("http://$ip:8088/")
                    .post(body)
                    .addHeader("Origin", "http://sl.dhg.myharmony.com")
                    .addHeader("Accept", "text/plain")
                    .build()

            Log.d(TAG, "discoverHubId($ip): POST http://$ip:8088/")
            client.newCall(request).execute().use { response ->
                val text = response.body?.string()
                Log.d(TAG, "discoverHubId($ip): HTTP ${response.code} ${response.message} | body: ${text?.take(500)}")
                if (!response.isSuccessful || text.isNullOrBlank()) return@use null

                // Extraction of the new "activeRemoteId" JSON key.
                runCatching { JSONObject(text).getJSONObject("data").getString("activeRemoteId") }
                    .onFailure { Log.e(TAG, "discoverHubId($ip): unexpected JSON shape in body above", it) }
                    .getOrNull()
            }
        }.onFailure {
            Log.e(TAG, "discoverHubId($ip): request failed", it)
        }.getOrNull()
    }
}
