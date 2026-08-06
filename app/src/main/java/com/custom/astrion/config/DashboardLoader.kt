package com.custom.astrion.config

import android.os.Environment
import android.util.Log
import com.custom.astrion.cards.CardConfig
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.io.File

/**
 * Loads the whole app layout (swipeable pages + hardware-button bindings) from
 * a JSON file on shared storage. If the file is missing or malformed, it falls
 * back to DashboardConfig.default. The app never crashes over a bad config; it
 * simply displays an onscreen notice.
 *
 * Path: [Environment.getExternalStorageDirectory]/astrion/dashboard.json. Shared
 * storage keeps the file editable over `adb push` or any file manager; MainActivity
 * requests the storage permission at runtime (Android 8.1 on the HA100).
 *
 * JSON shape:
 * {
 *   "startPage": 1,
 *   "pages": [
 *     { "name": "Lights", "cards": [ { "type": "...", "options": { ... } } ] },
 *     { "name": "Main",   "cards": [ ... ] },
 *     { "name": "TV",     "cards": [ ... ] }
 *   ],
 *   "hotkeys": [
 *     { "key": "UP", "service": "remote.send_command",
 *       "entityId": "remote.the_club_tvv", "data": { "command": "DPAD_UP" } },
 *     { "key": "LIGHT", "page": "Lights" },
 *     { "key": "VOLUME_UP", "harmonyDevice": "62845789", "harmonyCommand": "VolumeUp" }
 *   ]
 * }
 *
 * A bare top-level array is also accepted for convenience — it becomes a single
 * page named "Main" with no hotkeys.
 */
object DashboardLoader {
    private const val TAG = "DashboardLoader"

    val configFile: File
        get() = File(Environment.getExternalStorageDirectory(), "astrion/dashboard.json")

    private val json = Json { prettyPrint = true; ignoreUnknownKeys = true }

    data class Result(val config: AppConfig, val notice: String?)

    fun load(): Result {
        val file = configFile
        if (!file.exists()) {
            return if (writeDefaults()) {
                Result(DashboardConfig.default, "Wrote defaults to ${file.path} — edit it, then reopen the app")
            } else {
                Result(DashboardConfig.default, "Can't access ${file.path} (storage permission?) — using built-in defaults")
            }
        }
        return try {
            Result(parse(file.readText()), null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load ${file.path}", e)
            Result(DashboardConfig.default, "dashboard.json invalid (${e.message?.take(80)}) — using built-in defaults")
        }
    }

    // ---- parse --------------------------------------------------------------

    private fun parse(text: String): AppConfig {
        return when (val root = json.parseToJsonElement(text)) {
            is JsonArray -> AppConfig(
                pages = listOf(PageConfig("Main", root.map { parseCard(it.jsonObject) })),
            )
            is JsonObject -> {
                val pagesArr = root["pages"]?.jsonArray ?: error("missing \"pages\" array")
                val pages = pagesArr.map { p ->
                    val obj = p.jsonObject
                    val name = obj["name"]?.jsonPrimitive?.content ?: "Page"
                    val cards = obj["cards"]?.jsonArray?.map { parseCard(it.jsonObject) } ?: emptyList()
                    val pageHotkeys = obj["hotkeys"]?.jsonArray?.map { parseHotkey(it.jsonObject) } ?: emptyList()
                    val pageLongHotkeys = obj["longHotkeys"]?.jsonArray?.map { parseHotkey(it.jsonObject) } ?: emptyList()
                    PageConfig(name, cards, pageHotkeys, pageLongHotkeys)
                }
                if (pages.isEmpty()) error("\"pages\" is empty")
                val start = root["startPage"]?.jsonPrimitive?.intOrNull ?: 0
                val hotkeys = root["hotkeys"]?.jsonArray?.map { parseHotkey(it.jsonObject) } ?: emptyList()
                val longHotkeys = root["longHotkeys"]?.jsonArray?.map { parseHotkey(it.jsonObject) } ?: emptyList()
                val irActivities = root["irActivities"]?.jsonArray?.map { parseIrActivity(it.jsonObject) } ?: emptyList()
                AppConfig(pages, start.coerceIn(0, pages.size - 1), hotkeys, longHotkeys, irActivities)
            }
            else -> error("top level must be an object or array")
        }
    }

    private fun parseCard(obj: JsonObject): CardConfig {
        val type = obj["type"]?.jsonPrimitive?.takeIf { it.isString }?.content
            ?: error("card missing \"type\" string")
        val options = obj["options"]?.jsonObject
            ?.entries?.associate { (k, v) -> k to JsonPlain.toPlain(v) }
            ?: emptyMap()
        return CardConfig(type, options)
    }

    private fun parseHotkey(obj: JsonObject): HotkeyConfig {
        val key = obj["key"]?.jsonPrimitive?.content ?: error("hotkey missing \"key\"")
        val page = obj["page"]?.jsonPrimitive?.content
        val service = obj["service"]?.jsonPrimitive?.content
        val entityId = obj["entityId"]?.jsonPrimitive?.content
        val data = obj["data"]?.jsonObject
            ?.entries?.associate { (k, v) -> k to JsonPlain.toPlain(v) }
            ?: emptyMap()
        val harmonyDevice = obj["harmonyDevice"]?.jsonPrimitive?.content
        val harmonyCommand = obj["harmonyCommand"]?.jsonPrimitive?.content
        val harmonyActivity = obj["harmonyActivity"]?.jsonPrimitive?.content
        return HotkeyConfig(key, page, service, entityId, data, harmonyDevice, harmonyCommand, harmonyActivity)
    }

    private fun parseIrActivity(obj: JsonObject): IrActivityConfig {
        val id = obj["id"]?.jsonPrimitive?.content ?: error("irActivity missing \"id\"")
        val name = obj["name"]?.jsonPrimitive?.content ?: id
        val steps = obj["steps"]?.jsonArray?.map { parseIrStep(it.jsonObject) }
            ?: error("irActivity \"$id\" missing \"steps\"")
        if (steps.isEmpty()) error("irActivity \"$id\" has an empty \"steps\" list")
        return IrActivityConfig(id, name, steps)
    }

    private fun parseIrStep(obj: JsonObject): IrStepConfig {
        val freq = obj["freq"]?.jsonPrimitive?.intOrNull ?: error("IR step missing \"freq\"")
        val pattern = obj["pattern"]?.jsonArray?.map { it.jsonPrimitive.int }
            ?: error("IR step missing \"pattern\"")
        if (pattern.isEmpty()) error("IR step has an empty \"pattern\"")
        val delayAfterMs = obj["delayAfterMs"]?.jsonPrimitive?.intOrNull ?: 0
        return IrStepConfig(freq, pattern, delayAfterMs)
    }

    // ---- serialize defaults -------------------------------------------------

    private fun writeDefaults(): Boolean = try {
        val file = configFile
        file.parentFile?.mkdirs()
        file.writeText(json.encodeToString(JsonObject.serializer(), encode(DashboardConfig.default)))
        true
    } catch (e: Exception) {
        Log.w(TAG, "Couldn't write default config", e)
        false
    }

    private fun encode(cfg: AppConfig): JsonObject = buildJsonObject {
        put("startPage", cfg.startPage)
        put("pages", buildJsonArray {
            cfg.pages.forEach { page ->
                add(buildJsonObject {
                    put("name", page.name)
                    put("cards", buildJsonArray {
                        page.cards.forEach { card ->
                            add(buildJsonObject {
                                put("type", card.type)
                                put("options", JsonPlain.toJson(card.options))
                            })
                        }
                    })
                    if (page.hotkeys.isNotEmpty()) put("hotkeys", encodeHotkeys(page.hotkeys))
                    if (page.longHotkeys.isNotEmpty()) put("longHotkeys", encodeHotkeys(page.longHotkeys))
                })
            }
        })
        put("hotkeys", encodeHotkeys(cfg.hotkeys))
        put("longHotkeys", encodeHotkeys(cfg.longHotkeys))
        if (cfg.irActivities.isNotEmpty()) {
            put("irActivities", buildJsonArray {
                cfg.irActivities.forEach { activity ->
                    add(buildJsonObject {
                        put("id", activity.id)
                        put("name", activity.name)
                        put("steps", buildJsonArray {
                            activity.steps.forEach { step ->
                                add(buildJsonObject {
                                    put("freq", step.freq)
                                    put("pattern", buildJsonArray { step.pattern.forEach { add(JsonPrimitive(it)) } })
                                    if (step.delayAfterMs != 0) put("delayAfterMs", step.delayAfterMs)
                                })
                            }
                        })
                    })
                }
            })
        }
    }

    private fun encodeHotkeys(hotkeys: List<HotkeyConfig>) = buildJsonArray {
        hotkeys.forEach { hk ->
            add(buildJsonObject {
                put("key", hk.key)
                hk.page?.let { put("page", it) }
                hk.service?.let { put("service", it) }
                hk.entityId?.let { put("entityId", it) }
                if (hk.data.isNotEmpty()) put("data", JsonPlain.toJson(hk.data))
                hk.harmonyDevice?.let { put("harmonyDevice", it) }
                hk.harmonyCommand?.let { put("harmonyCommand", it) }
                hk.harmonyActivity?.let { put("harmonyActivity", it) }
            })
        }
    }
}