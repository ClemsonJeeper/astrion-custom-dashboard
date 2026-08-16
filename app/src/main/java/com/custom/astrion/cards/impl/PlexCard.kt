package com.custom.astrion.cards.impl

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.cards.CardConfig
import com.custom.astrion.cards.CardContext
import com.custom.astrion.cards.CardRenderer
import com.custom.astrion.ha.ServiceCall
import com.custom.astrion.ui.ThemeColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * Native Plex browser — the lightweight answer to the plex-meets-homeassistant
 * web card. Talks straight to the Plex server's HTTP API (no HA round-trip):
 * shows On Deck and Recently Added as swipeable poster rows; tapping an item
 * deep-links the Plex app on the Android TV via the standard HA
 * `remote.turn_on` activity call:
 *   plex://preplay/?metadataKey=<key>&server=<machineIdentifier>
 *
 * Kept deliberately light for the MT6580: posters are requested pre-scaled by
 * the server's photo transcoder (~140x210), rows are LazyRow (only visible
 * posters decode), and a tiny in-memory cache stops re-fetching while swiping.
 *
 * Config shape:
 *   { "type": "plex", "options": {
 *       "host": "http://plex-server:32400",
 *       "token": "<X-Plex-Token>",
 *       "remote_entity": "remote.tv"
 *   } }
 */
class PlexCard : CardRenderer {
    override val type = "plex"

    private data class PlexItem(val key: String, val title: String, val subtitle: String, val thumb: String?)

    private data class PlexRow(val title: String, val items: List<PlexItem>)

    private companion object {
        val http: OkHttpClient = OkHttpClient.Builder().callTimeout(12, TimeUnit.SECONDS).build()
        val json = Json { ignoreUnknownKeys = true }

        // Tiny LRU poster cache (~40 posters ≈ a few MB) so swiping doesn't refetch.
        val posterCache =
            object : LinkedHashMap<String, ImageBitmap>(0, 0.75f, true) {
                override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, ImageBitmap>?) = size > 40
            }

        @Synchronized fun cacheGet(k: String): ImageBitmap? = posterCache[k]

        @Synchronized fun cachePut(
            k: String,
            v: ImageBitmap,
        ) {
            posterCache[k] = v
        }
    }

    @Composable
    override fun Render(
        config: CardConfig,
        ctx: CardContext,
    ) {
        val host = config.string("host")?.trimEnd('/') ?: return
        val token = config.string("token") ?: return
        // Android-TV media_player entity. Tapping launches Plex on it via
        // select_source — deep-link item playback isn't reliable on Plex for
        // Android TV (opens the app but won't navigate to the item).
        val mediaEntity = config.string("media_entity") ?: return
        val source = config.string("source") ?: "Plex"
        // Optional: a real Plex-client entity (HA Plex integration, requires the
        // TV's Plex app registered as a companion client) → true item playback.
        val playEntity = config.string("play_entity")

        var rows by remember { mutableStateOf<List<PlexRow>?>(null) }
        var machineId by remember { mutableStateOf<String?>(null) }
        var error by remember { mutableStateOf<String?>(null) }

        LaunchedEffect(host, token) {
            try {
                machineId =
                    get(url(host, token, "/identity"))
                        ?.mc()?.strOf("machineIdentifier")
                val out = mutableListOf<PlexRow>()
                fetchItems(host, token, "/library/onDeck")?.takeIf { it.isNotEmpty() }
                    ?.let { out += PlexRow("On Deck", it) }
                fetchItems(host, token, "/library/recentlyAdded")?.takeIf { it.isNotEmpty() }
                    ?.let { out += PlexRow("Recently Added", it) }
                rows = out
                if (out.isEmpty()) error = "No items returned from Plex"
            } catch (ex: Exception) {
                error = ex.message ?: "Plex error"
                rows = emptyList()
            }
        }

        fun play(item: PlexItem) {
            if (playEntity != null) {
                // Real playback via the HA Plex integration's client entity.
                val id = machineId ?: return
                ctx.client.callService(
                    ServiceCall.of(
                        "media_player",
                        "play_media",
                        playEntity,
                        "media_content_type" to "video",
                        "media_content_id" to "plex://preplay/?metadataKey=${item.key}&server=$id",
                    ),
                )
            } else {
                // Reliable fallback: open Plex on the TV so you can pick it.
                ctx.client.callService(
                    ServiceCall.of("media_player", "select_source", mediaEntity, "source" to source),
                )
            }
        }

        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(ctx.theme.cardSurface)
                    .padding(vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                "Plex",
                color = ctx.theme.primaryText,
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 14.dp),
            )
            when {
                rows == null ->
                    Text(
                        "Loading…",
                        color = ctx.theme.mutedText,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(horizontal = 14.dp),
                    )
                error != null ->
                    Text(
                        error!!,
                        color = ctx.theme.danger,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(horizontal = 14.dp),
                    )
                else ->
                    rows!!.forEach { row ->
                        Text(
                            row.title,
                            color = ctx.theme.mutedText,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 14.dp),
                        )
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp),
                        ) {
                            items(row.items) { item ->
                                PosterTile(host, token, item, ctx.theme) { play(item) }
                            }
                        }
                    }
            }
        }
    }

    @Composable
    private fun PosterTile(
        host: String,
        token: String,
        item: PlexItem,
        theme: ThemeColors,
        onClick: () -> Unit,
    ) {
        Column(
            modifier =
                Modifier
                    .width(104.dp)
                    .clickable(onClick = onClick),
        ) {
            val posterUrl =
                item.thumb?.let {
                    "$host/photo/:/transcode?width=140&height=210&minSize=1&upscale=1" +
                        "&url=${URLEncoder.encode(it, "UTF-8")}&X-Plex-Token=$token"
                }
            var bmp by remember(posterUrl) { mutableStateOf(posterUrl?.let { cacheGet(it) }) }
            LaunchedEffect(posterUrl) {
                if (bmp == null && posterUrl != null) {
                    val loaded =
                        withContext(Dispatchers.IO) {
                            runCatching {
                                http.newCall(Request.Builder().url(posterUrl).build()).execute().use { r ->
                                    r.body?.bytes()?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
                                }
                            }.getOrNull()?.asImageBitmap()
                        }
                    if (loaded != null) {
                        cachePut(posterUrl, loaded)
                        bmp = loaded
                    }
                }
            }
            val posterMod =
                Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .clip(RoundedCornerShape(10.dp))
            if (bmp != null) {
                Image(bmp!!, contentDescription = item.title, modifier = posterMod, contentScale = ContentScale.Crop)
            } else {
                Box(posterMod.background(theme.insetSurface))
            }
            Spacer(Modifier.height(4.dp))
            Text(
                item.title,
                color = theme.primaryText,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                item.subtitle,
                color = theme.mutedText,
                fontSize = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }

    // ---- Plex HTTP helpers ----------------------------------------------------

    private fun url(
        host: String,
        token: String,
        path: String,
    ): String = host + path + (if ('?' in path) "&" else "?") + "X-Plex-Token=$token"

    private suspend fun get(u: String): JsonObject? =
        withContext(Dispatchers.IO) {
            runCatching {
                http.newCall(
                    Request.Builder().url(u).header("Accept", "application/json").build(),
                ).execute().use { r ->
                    if (!r.isSuccessful) {
                        null
                    } else {
                        json.parseToJsonElement(r.body?.string() ?: return@use null) as? JsonObject
                    }
                }
            }.getOrNull()
        }

    private suspend fun fetchItems(
        host: String,
        token: String,
        path: String,
    ): List<PlexItem>? {
        val container = get(url(host, token, path) + "&X-Plex-Container-Size=12")?.mc() ?: return null
        val meta = container["Metadata"] as? JsonArray ?: return emptyList()
        return meta.mapNotNull { el ->
            val o = el as? JsonObject ?: return@mapNotNull null
            val key = o.strOf("key") ?: return@mapNotNull null
            val type = o.strOf("type")
            if (type == "episode") {
                val show = o.strOf("grandparentTitle") ?: o.strOf("title") ?: "?"
                val s = o.intOf("parentIndex")
                val ep = o.intOf("index")
                PlexItem(
                    key = key,
                    title = show,
                    subtitle = "S${s ?: "?"}E${ep ?: "?"} · ${o.strOf("title") ?: ""}",
                    thumb = o.strOf("grandparentThumb") ?: o.strOf("thumb"),
                )
            } else {
                PlexItem(
                    key = key,
                    title = o.strOf("title") ?: "?",
                    subtitle = o.intOf("year")?.toString() ?: type.orEmpty(),
                    thumb = o.strOf("thumb"),
                )
            }
        }
    }

    private fun JsonObject.mc(): JsonObject? = this["MediaContainer"] as? JsonObject

    private fun JsonObject.strOf(k: String): String? = (this[k] as? JsonPrimitive)?.content

    private fun JsonObject.intOf(k: String): Int? = (this[k] as? JsonPrimitive)?.content?.toIntOrNull()
}
