package com.custom.astrion.harmony

import android.util.Log
import com.custom.astrion.config.HarmonyHubConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Owns one [HarmonyHubClient] per configured Harmony hub and connects/
 * disconnects them together. Replaces a single `lateinit var harmonyClient`
 * in MainActivity now that a user can pair more than one hub (e.g. one per
 * room).
 *
 * Card/hotkey code that used to call `harmonyClient.sendCommand(...)`
 * directly should instead resolve a client via [client] using the `hub`
 * field from dashboard.json (falling back to the first configured hub when
 * that field is absent, so existing single-hub configs keep working
 * unchanged).
 */
class HarmonyHubRegistry(
    val hubs: List<HarmonyHubConfig>,
    private val onError: (hubName: String, message: String) -> Unit = { _, _ -> },
    /** Called once per hub right after its hubId was auto-discovered (blank ->
     * resolved), with the full up-to-date hub list — wire this to
     * RemoteSettings.saveHarmonyHubs(context, it) so the ID sticks and the
     * web config page shows it filled in, instead of re-discovering on every
     * app launch. */
    private val onHubIdDiscovered: (List<HarmonyHubConfig>) -> Unit = {}
) {
    private companion object {
        const val TAG = "HarmonyHubRegistry"
    }

    /** localId -> live client, in the same order as [hubs]. */
    private val clients: Map<String, HarmonyHubClient> =
        hubs.associate { hub ->
            hub.localId to
                HarmonyHubClient(
                    hubIp = hub.ip,
                    hubId = hub.hubId,
                    onError = { msg -> onError(hub.name, msg) }
                )
        }

    /** Same order as the configured hubs — first() is the implicit default hub. */
    val configs: List<HarmonyHubConfig> = hubs

    /** localId -> live client — exposed so callers can wire per-hub live
     * state (e.g. ActivityRuntime.bind()) without needing a `hub` field to
     * resolve just one, unlike [client]. */
    val clientsByLocalId: Map<String, HarmonyHubClient> get() = clients

    @Suppress("Unused")
    val isEmpty: Boolean get() = clients.isEmpty()

    /**
     * Connects all configured hubs. If a hub was set up via the UI page using its IP
     * alone (leaving [HarmonyHubConfig.hubId] empty), this method will automatically
     * discover its network `hubId` asynchronously before establishing the WebSocket connection.
     */
    suspend fun connectAll() = withContext(Dispatchers.IO) {
        if (clients.isEmpty()) {
            Log.i(TAG, "No Harmony hubs configured — nothing to connect")
            return@withContext
        }

        configs.forEach { hub ->
            val client = clients[hub.localId] ?: return@forEach

            // Resolve the missing hubId dynamically if it's blank from the UI page entry
            if (hub.hubId.isBlank()) {
                Log.d(TAG, "hubId is blank for IP ${hub.ip}. Attempting auto-discovery...")
                val discoveredId = HarmonyHubDiscovery.discoverHubId(hub.ip)

                if (!discoveredId.isNullOrBlank()) {
                    hub.hubId = discoveredId
                    // Inject the newly discovered ID directly into the client instance
                    client.updateHubId(discoveredId)
                    Log.d(TAG, "Successfully discovered hubId ($discoveredId) for hub: ${hub.name}")
                    onHubIdDiscovered(configs) // persist, so this hub isn't re-discovered next launch
                } else {
                    Log.e(TAG, "Failed to resolve hubId for ${hub.name} at ${hub.ip}")
                    onError(hub.name, "Could not discover hub unique ID from the provided IP address.")
                    return@forEach // Skip connecting this specific hub
                }
            }

            // Safe to connect now, hubId is fully resolved
            client.connect()
        }
    }

    fun disconnectAll() {
        clients.values.forEach { it.disconnect() }
    }

    /**
     * Resolves which client to use for a dashboard.json `hub` reference.
     * Null/blank/unknown [localId] falls back to the first configured hub —
     * this is what makes the `hub` field optional and keeps single-hub
     * dashboard.json files working with zero changes after upgrading.
     */
    fun client(localId: String? = null): HarmonyHubClient? {
        if (clients.isEmpty()) return null
        return localId?.let { clients[it] } ?: clients.values.first()
    }
}
