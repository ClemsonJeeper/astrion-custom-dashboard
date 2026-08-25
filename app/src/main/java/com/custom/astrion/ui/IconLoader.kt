package com.custom.astrion.ui

import android.graphics.BitmapFactory
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import java.io.File

/**
 * Decode a PNG icon from [path], downsampling oversized source images so a
 * 2000+px-wide PNG displayed at ~28dp doesn't eat several MB of bitmap
 * memory plus a matching GPU texture — the cause of the scrolling lag
 * reported in upstream issue #36 on the HA100 hardware.
 *
 * Two-pass decode: first inspect the source dimensions with
 * [BitmapFactory.Options.inJustDecodeBounds] (allocates nothing — only
 * reads the header), compute an [BitmapFactory.Options.inSampleSize] that
 * brings the longer edge down to around [targetPx], then decode for real.
 * The result is an [ImageBitmap] close to the rendered size — at most ~2×
 * the target on each axis, the floor `inSampleSize` (power-of-two-only)
 * allows.
 *
 * Returns null on any I/O/decode failure or missing file, matching the
 * prior `BitmapFactory.decodeFile()?.asImageBitmap()` convention so call
 * sites keep their existing fallback (placeholder / blank spacer).
 */
fun decodeIconSampled(path: String, targetPx: Int): ImageBitmap? {
    val f = File(path)
    if (!f.exists()) return null
    return runCatching {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(f.absolutePath, bounds)
        val sample = inSampleSizeFor(bounds.outWidth, bounds.outHeight, targetPx)
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        BitmapFactory.decodeFile(f.absolutePath, opts)?.asImageBitmap()
    }.getOrNull()
}

/**
 * [BitmapFactory.Options.inSampleSize] for a decode whose longer edge
 * should land at or above [targetPx]. `inSampleSize` is an int >= 1 that
 * the decoder rounds down to the nearest power of two, so we step it up
 * (halving the long edge each time) until the sampled long edge would be
 * <= target — yielding at most ~2× target on each axis, the smallest
 * sample that still satisfies the contract. Falls back to 1 (no sampling)
 * when the source is already smaller than the target or its dimensions
 * couldn't be read.
 */
private fun inSampleSizeFor(width: Int, height: Int, targetPx: Int): Int {
    if (targetPx <= 0 || width <= 0 || height <= 0) return 1
    var sample = 1
    var longest = maxOf(width, height)
    while (longest / 2 >= targetPx) {
        longest /= 2
        sample *= 2
    }
    return sample
}
