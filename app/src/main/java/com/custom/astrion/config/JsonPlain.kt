package com.custom.astrion.config

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.longOrNull

/**
 * Converts between `kotlinx.serialization` [JsonElement] trees and plain Kotlin
 * values (String, Number, Boolean, List, Map). This preserves compatibility with
 * card option casts like `as? String` or `as? Number`.
 */
object JsonPlain {
    fun toPlain(el: JsonElement): Any? = when (el) {
        is JsonNull -> null
        is JsonPrimitive ->
            when {
                el.isString -> el.content
                else ->
                    el.booleanOrNull
                        ?: el.longOrNull?.let { if (it in Int.MIN_VALUE..Int.MAX_VALUE) it.toInt() else it }
                        ?: el.doubleOrNull
                        ?: el.contentOrNull
            }
        is JsonArray -> el.map { toPlain(it) }
        is JsonObject -> el.entries.associate { (k, v) -> k to toPlain(v) }
    }

    fun toJson(v: Any?): JsonElement = when (v) {
        null -> JsonNull
        is JsonElement -> v
        is Boolean -> JsonPrimitive(v)
        is Number -> JsonPrimitive(v)
        is String -> JsonPrimitive(v)
        is List<*> -> JsonArray(v.map { toJson(it) })
        is Map<*, *> -> JsonObject(v.entries.associate { (k, vv) -> k.toString() to toJson(vv) })
        else -> JsonPrimitive(v.toString())
    }
}
