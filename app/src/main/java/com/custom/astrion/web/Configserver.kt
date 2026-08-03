package com.custom.astrion.web

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.Settings
import android.util.Log
import com.custom.astrion.BuildConfig
import com.custom.astrion.R
import com.custom.astrion.config.DashboardLoader
import com.custom.astrion.config.RemoteSettings
import com.custom.astrion.update.UpdateChecker
import fi.iki.elonen.NanoHTTPD
import java.io.File

/**
 * Tiny local web server (http://<remote-ip>:8080) that lets anyone on the
 * same network configure this device without adb — the same pattern the
 * official panel firmware uses for its own local config page. Serves:
 *
 *  GET  /                connection form, dashboard.json / icon upload, updates
 *  POST /save-connection save HA_URL / HA_TOKEN / HARMONY_HUB_IP / HARMONY_HUB_ID,
 *                        then restarts the activity to reconnect with them
 *  GET  /dashboard.json  download the current dashboard.json (backup)
 *  POST /dashboard.json  replace dashboard.json, then live-reload the dashboard
 *  POST /icons           upload a PNG into /sdcard/astrion/icons/
 *  GET  /check-update     check this project's GitHub Releases for a newer build
 *  POST /install-update   download the newer APK and open the system installer
 *
 * Deliberately has no auth — this device is assumed to live on a trusted
 * home LAN, the same assumption Home Assistant itself makes for local
 * network access.
 */
class ConfigServer(
    private val context: Context,
    private val onConnectionSaved: () -> Unit,
    private val onDashboardUpdated: () -> Unit,
) : NanoHTTPD(8080) {

    @Volatile private var lastResult: UpdateChecker.CheckResult? = null

    private val iconsDir: File
        get() = File(Environment.getExternalStorageDirectory(), "astrion/icons").apply { mkdirs() }

    override fun serve(session: IHTTPSession): Response {
        return try {
            when {
                session.method == Method.GET && session.uri == "/" -> serveForm()
                session.method == Method.GET && session.uri == "/dashboard.json" -> serveDashboardJson()
                session.method == Method.POST && session.uri == "/save-connection" -> handleSaveConnection(session)
                session.method == Method.POST && session.uri == "/dashboard.json" -> handleDashboardUpload(session)
                session.method == Method.POST && session.uri == "/icons" -> handleIconUpload(session)
                session.method == Method.GET && session.uri == "/check-update" -> handleCheckUpdate()
                session.method == Method.POST && session.uri == "/install-update" -> handleInstallUpdate()
                else -> newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found")
            }
        } catch (e: Exception) {
            Log.e("ConfigServer", "request failed", e)
            newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error: ${e.message}")
        }
    }

    // ---- pages --------------------------------------------------------------

    private fun serveForm(): Response {
        val haUrl = RemoteSettings.haUrl(context)
        val haToken = RemoteSettings.haToken(context)
        val harmonyIp = RemoteSettings.harmonyIp(context)
        val harmonyId = RemoteSettings.harmonyId(context)
        val update = (lastResult as? UpdateChecker.CheckResult.Available)?.info

        val updateSectionHtml = if (update != null) {
            """
            <p class="note">${context.getString(R.string.web_config_update_found, update.version)}</p>
            <form method="post" action="/install-update">
              <button type="submit">${context.getString(R.string.web_config_install_update_button)}</button>
            </form>
            """.trimIndent()
        } else ""

        val html = """
            <!doctype html><html><head><meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${context.getString(R.string.web_config_title)}</title>
            <style>
              body{font-family:sans-serif;background:#0e2229;color:#e6e6e6;max-width:520px;margin:24px auto;padding:0 16px}
              h1{font-size:18px} h2{font-size:15px;color:#93afb6;margin-top:32px}
              label{display:block;margin-top:12px;font-size:13px;color:#9a9a9a}
              input[type=text],input[type=password]{width:100%;box-sizing:border-box;padding:8px;margin-top:4px;
                background:#161616;border:1px solid #333;color:#e6e6e6;border-radius:6px}
              button{margin-top:16px;padding:10px 16px;background:#6ea8fe;border:none;border-radius:6px;
                color:#0e2229;font-weight:600}
              .note{font-size:12px;color:#9a9a9a;margin-top:6px}
              a{color:#6ea8fe}
            </style></head><body>
            <h1>${context.getString(R.string.web_config_title)}</h1>

            <h2>${context.getString(R.string.web_config_updates_heading)}</h2>
            <p class="note">${context.getString(R.string.web_config_current_version)}: ${BuildConfig.VERSION_NAME}</p>
            $updateSectionHtml
            <p><a href="/check-update">${context.getString(R.string.web_config_check_update_link)}</a></p>

            <h2>${context.getString(R.string.web_config_ha_harmony_heading)}</h2>
            <form method="post" action="/save-connection">
              <label>${context.getString(R.string.web_config_ha_url_label)}</label>
              <input type="text" name="ha_url" value="${escape(haUrl)}" placeholder="http://192.168.1.50:8123">
              <label>${context.getString(R.string.web_config_ha_token_label)}</label>
              <input type="password" name="ha_token" value="${escape(haToken)}">
              <label>${context.getString(R.string.web_config_harmony_ip_label)}</label>
              <input type="text" name="harmony_ip" value="${escape(harmonyIp)}">
              <label>${context.getString(R.string.web_config_harmony_id_label)}</label>
              <input type="text" name="harmony_id" value="${escape(harmonyId)}">
              <button type="submit">${context.getString(R.string.web_config_save_button)}</button>
              <div class="note">${context.getString(R.string.web_config_save_note)}</div>
            </form>

            <h2>${context.getString(R.string.web_config_dashboard_heading)}</h2>
            <p class="note"><a href="/dashboard.json">${context.getString(R.string.web_config_dashboard_download)}</a></p>
            <form method="post" action="/dashboard.json" enctype="multipart/form-data">
              <input type="file" name="file" accept=".json">
              <button type="submit">${context.getString(R.string.web_config_dashboard_upload_button)}</button>
            </form>

            <h2>${context.getString(R.string.web_config_icons_heading)}</h2>
            <form method="post" action="/icons" enctype="multipart/form-data">
              <input type="file" name="file" accept="image/png">
              <button type="submit">${context.getString(R.string.web_config_icons_upload_button)}</button>
            </form>
            <p class="note">${context.getString(R.string.web_config_icons_note)}</p>
            </body></html>
        """.trimIndent()
        return newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", html)
    }

    private fun serveDashboardJson(): Response {
        val file = DashboardLoader.configFile
        if (!file.exists()) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "No dashboard.json yet")
        }
        return newFixedLengthResponse(Response.Status.OK, "application/json", file.readText())
    }

    // ---- actions --------------------------------------------------------------

    private fun handleSaveConnection(session: IHTTPSession): Response {
        val fields = parseFormFields(session)
        RemoteSettings.save(
            context = context,
            haUrl = fields["ha_url"].orEmpty().trim(),
            haToken = fields["ha_token"].orEmpty().trim(),
            harmonyIp = fields["harmony_ip"].orEmpty().trim(),
            harmonyId = fields["harmony_id"].orEmpty().trim(),
        )
        onConnectionSaved()
        return redirectHome(context.getString(R.string.web_config_saved_reconnecting))
    }

    private fun handleDashboardUpload(session: IHTTPSession): Response {
        val files = HashMap<String, String>()
        session.parseBody(files) // NanoHTTPD writes uploaded parts to temp files, keyed by form field name
        val tmpPath = files["file"]
            ?: return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing file")
        File(tmpPath).copyTo(DashboardLoader.configFile, overwrite = true)
        onDashboardUpdated()
        return redirectHome(context.getString(R.string.web_config_dashboard_updated))
    }

    private fun handleIconUpload(session: IHTTPSession): Response {
        val files = HashMap<String, String>()
        session.parseBody(files)
        val tmpPath = files["file"]
            ?: return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing file")
        // For multipart file fields, NanoHTTPD puts the temp path in `files` and
        // the original filename as the parameter value for that same field name.
        val originalName = session.parameters["file"]?.firstOrNull() ?: "icon_${System.currentTimeMillis()}.png"
        File(tmpPath).copyTo(File(iconsDir, sanitize(originalName)), overwrite = true)
        return redirectHome(context.getString(R.string.web_config_icon_uploaded))
    }

    private fun handleCheckUpdate(): Response {
        val result = UpdateChecker.checkForUpdate()
        lastResult = result
        val message = when (result) {
            is UpdateChecker.CheckResult.Available ->
                context.getString(R.string.web_config_update_found, result.info.version)
            is UpdateChecker.CheckResult.UpToDate ->
                context.getString(R.string.web_config_update_none)
            is UpdateChecker.CheckResult.Failed ->
                context.getString(R.string.web_config_update_failed, result.reason)
        }
        return redirectHome(message)
    }

    private fun handleInstallUpdate(): Response {
        val result = lastResult ?: UpdateChecker.checkForUpdate()
        val info = (result as? UpdateChecker.CheckResult.Available)?.info
            ?: return redirectHome(
                when (result) {
                    is UpdateChecker.CheckResult.Failed -> context.getString(R.string.web_config_update_failed, result.reason)
                    else -> context.getString(R.string.web_config_update_none)
                }
            )

        // Ask first instead of letting the install intent fail: on Android 8+
        // this permission is granted per-app in Settings, not at install time.
        if (!context.packageManager.canRequestPackageInstalls()) {
            val settingsIntent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}"),
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            runCatching { context.startActivity(settingsIntent) }
            return redirectHome(context.getString(R.string.web_config_update_needs_permission))
        }

        val file = UpdateChecker.download(context, info.apkUrl)
            ?: return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Download failed")

        return try {
            UpdateChecker.promptInstall(context, file)
            redirectHome(context.getString(R.string.web_config_update_installing))
        } catch (e: Exception) {
            Log.e("ConfigServer", "install prompt failed", e)
            newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Could not open installer: ${e.message}")
        }
    }

    // ---- helpers --------------------------------------------------------------

    private fun parseFormFields(session: IHTTPSession): Map<String, String> {
        val files = HashMap<String, String>()
        session.parseBody(files) // also populates session.parameters for a urlencoded POST body
        return session.parameters.mapValues { it.value.firstOrNull().orEmpty() }
    }

    private fun redirectHome(message: String): Response {
        val html = """<!doctype html><meta http-equiv="refresh" content="2;url=/">
            <body style="font-family:sans-serif;background:#0e2229;color:#e6e6e6;padding:24px">$message…</body>"""
        return newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", html)
    }

    private fun sanitize(name: String) =
        name.substringAfterLast('/').replace(Regex("[^A-Za-z0-9._-]"), "_")

    private fun escape(s: String) =
        s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;")
}