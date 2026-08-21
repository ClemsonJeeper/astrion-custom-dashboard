package com.custom.astrion.update

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.custom.astrion.BuildConfig
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException

/**
 * Checks this project's GitHub Releases for a build newer than the one
 * currently installed, and can download + launch the system installer for
 * it. There is no silent auto-apply: Android always requires the user to
 * approve the installation through the system package installer UI (and, once,
 * to allow "install unknown apps" for this app) — this only automates
 * finding and downloading the right APK.
 */
object UpdateChecker {
    // Public repo hosting signed release APKs — not a secret, just where
    // prebuilt community releases get published. MUST be your own
    // "owner/repo" — the placeholder below will always report "no update".
    private const val REPO = "dckiller51/astrion-custom-dashboard"
    private const val API_URL = "https://api.github.com/repos/$REPO/releases/latest"

    data class UpdateInfo(val version: String, val notes: String, val apkUrl: String)

    /**
     * Distinguishes "genuinely up to date" from "the check itself failed" —
     * collapsing both into a nullable result made real failures (wrong repo
     * name, draft/pre-release, no network...) silently look like "up to
     * date", which is exactly the bug this type exists to prevent.
     */
    sealed class CheckResult {
        data class Available(val info: UpdateInfo) : CheckResult()

        data object UpToDate : CheckResult()

        data class Failed(val reason: String) : CheckResult()
    }

    private val http = OkHttpClient()

    /** Blocking network call — invoke off the main thread. */
    fun checkForUpdate(): CheckResult {
        val request = Request.Builder().url(API_URL).header("Accept", "application/vnd.github+json").build()

        val response =
            try {
                http.newCall(request).execute()
            } catch (e: IOException) {
                return CheckResult.Failed("Network error: ${e.message}")
            }

        response.use { resp ->
            if (!resp.isSuccessful) {
                return CheckResult.Failed(
                    "GitHub API returned HTTP ${resp.code} for $REPO — check the REPO constant " +
                        "in UpdateChecker.kt, and that the release isn't a draft or pre-release " +
                        "(the /latest endpoint ignores both).",
                )
            }
            val bodyText = resp.body?.string() ?: return CheckResult.Failed("Empty response from GitHub")

            val root =
                runCatching { Json.parseToJsonElement(bodyText).jsonObject }
                    .getOrElse { return CheckResult.Failed("Could not parse GitHub response: ${it.message}") }

            val tag =
                root["tag_name"]?.jsonPrimitive?.content?.removePrefix("v")
                    ?: return CheckResult.Failed("Latest release has no tag_name")

            if (!isNewer(tag)) return CheckResult.UpToDate

            val apkUrl =
                root["assets"]?.jsonArray
                    ?.map { it.jsonObject }
                    ?.firstOrNull { it["name"]?.jsonPrimitive?.content?.endsWith(".apk") == true }
                    ?.get("browser_download_url")?.jsonPrimitive?.content
                    ?: return CheckResult.Failed("Release $tag has no .apk file attached as an asset")

            val notes = root["body"]?.jsonPrimitive?.content.orEmpty()
            return CheckResult.Available(UpdateInfo(version = tag, notes = notes, apkUrl = apkUrl))
        }
    }

    /** Minimal x.y.z comparison against current BuildConfig.VERSION_NAME — good enough for plain semver-ish tags like "1.4.0". */
    private fun isNewer(remote: String): Boolean {
        val r = remote.split(".").mapNotNull { it.toIntOrNull() }
        val l = BuildConfig.VERSION_NAME.split(".").mapNotNull { it.toIntOrNull() }
        for (i in 0 until maxOf(r.size, l.size)) {
            val rv = r.getOrElse(i) { 0 }
            val lv = l.getOrElse(i) { 0 }
            if (rv != lv) return rv > lv
        }
        return false
    }

    /** Downloads the APK into the app cache dir. Blocking — invoke off the main thread. */
    fun download(
        context: Context,
        apkUrl: String,
    ): File? {
        val request = Request.Builder().url(apkUrl).build()
        val bytes =
            http.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) return null
                resp.body?.bytes() ?: return null
            }
        val file = File(context.cacheDir, "astrion-update.apk")
        file.writeBytes(bytes)
        return file
    }

    /**
     * Launches the system installer UI for the given APK file.
     *
     * Deliberately synchronous, on the calling thread — so that if the OS
     * refuses (e.g. "install unknown apps" not granted for this app), the
     * resulting exception propagates straight back to the caller instead of
     * surfacing later, uncaught, on the main thread (which would crash the
     * whole app — and with it, the local web server used to trigger this).
     */
    fun promptInstall(
        context: Context,
        apkFile: File,
    ) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apkFile)
        val intent =
            Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        context.startActivity(intent)
    }
}
