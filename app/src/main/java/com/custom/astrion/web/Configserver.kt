package com.custom.astrion.web

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.Environment
import android.provider.Settings
import android.util.Log
import androidx.core.net.toUri
import com.custom.astrion.BuildConfig
import com.custom.astrion.R
import com.custom.astrion.config.DashboardLoader
import com.custom.astrion.config.HarmonyHubConfig
import com.custom.astrion.config.RemoteSettings
import com.custom.astrion.harmony.HarmonyHubDiscovery
import com.custom.astrion.harmony.HarmonyHubRegistry
import com.custom.astrion.update.UpdateChecker
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Tiny local web server (http://<remote-ip>:8080) that lets anyone on the
 * same network configure this device without adb — the same pattern the
 * official panel firmware uses for its own local config page. Serves:
 *
 *  GET  /                connection form, dashboard.json / icon upload, updates
 *  GET  /builder          redirects to /builder/
 *  GET  /builder/          the dashboard editor UI (bundled from assets/docs/),
 *                        same tool as the GitHub Pages one, served locally
 *  POST /save-connection save HA_URL / HA_TOKEN / Harmony hub list,
 *                        then restarts the activity to reconnect with them
 *  GET  /harmony-config  fetch a paired hub's devices/commands/activities as JSON
 *                        (?hub=<localId>, defaults to the first configured hub).
 *                        Cached to astrion/harmony_<hubId>.json next to
 *                        dashboard.json on every successful fetch, and served
 *                        from that cache if the hub is temporarily unreachable.
 *  GET  /harmony-hubs    list configured hubs (id + name), for the "Hub" dropdown
 *                        in the dashboard editor's hotkey form
 *  GET  /harmony-discover resolve a hub's numeric hubId from its IP alone
 *                        (?ip=<address>) — used by the "Auto-detect ID" button
 *  GET  /dashboard.json  download the current dashboard.json (backup)
 *  POST /dashboard.json  replace dashboard.json, then live-reload the dashboard
 *  POST /icons           upload a PNG into /sdcard/astrion/icons/
 *  GET  /icons-list       list every uploaded icon's filename, as JSON — feeds
 *                        the dashboard editor's icon picker
 *  GET  /icons/<file>     serve an uploaded icon back out — lets the dashboard
 *                        editor's picker/preview (docs/js/cards.js) show a
 *                        card's real configured icon when opened from this
 *                        device (/builder/)
 *  GET  /check-update     check this project's GitHub Releases for a newer build
 *  POST /install-update   download the newer APK and open the system installer
 *
 * Deliberately has no auth — this device is assumed to live on a trusted
 * home LAN, the same assumption Home Assistant itself makes for local
 * network access.
 */
class ConfigServer(
    private val context: Context,
    private val harmonyRegistry: HarmonyHubRegistry,
    private val onConnectionSaved: () -> Unit,
    private val onDashboardUpdated: () -> Unit,
) : NanoHTTPD(8080) {
    @Volatile private var lastResult: UpdateChecker.CheckResult? = null

    private val iconsDir: File
        get() = File(Environment.getExternalStorageDirectory(), "astrion/icons").apply { mkdirs() }

    override fun serve(session: IHTTPSession): Response {
        return try {
            val method = session.method
            when (val uri = session.uri) {
                "/" -> if (method == Method.GET) serveForm() else methodNotAllowed()
                "/dashboard.json" ->
                    when (method) {
                        Method.GET -> serveDashboardJson()
                        Method.POST -> handleDashboardUpload(session)
                        else -> methodNotAllowed()
                    }
                "/builder" -> if (method == Method.GET) redirectBuilder() else methodNotAllowed()
                "/harmony-config" -> if (method == Method.GET) serveHarmonyConfig(session) else methodNotAllowed()
                "/harmony-hubs" -> if (method == Method.GET) serveHarmonyHubs() else methodNotAllowed()
                "/harmony-discover" -> if (method == Method.GET) serveHarmonyDiscover(session) else methodNotAllowed()
                "/icons-list" -> if (method == Method.GET) serveIconsList() else methodNotAllowed()
                "/check-update" -> if (method == Method.GET) handleCheckUpdate() else methodNotAllowed()
                "/save-connection" -> if (method == Method.POST) handleSaveConnection(session) else methodNotAllowed()
                "/icons" -> if (method == Method.POST) handleIconUpload(session) else methodNotAllowed()
                "/install-update" -> if (method == Method.POST) handleInstallUpdate() else methodNotAllowed()
                else ->
                    when {
                        uri.startsWith("/builder/") -> if (method == Method.GET) serveBuilderAsset(uri) else methodNotAllowed()
                        uri.startsWith("/icons/") -> if (method == Method.GET) serveIcon(uri) else methodNotAllowed()
                        else -> newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found")
                    }
            }
        } catch (e: Exception) {
            Log.e("ConfigServer", "request failed", e)
            newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error: ${e.message}")
        }
    }

    private fun methodNotAllowed(): Response =
        newFixedLengthResponse(Response.Status.METHOD_NOT_ALLOWED, "text/plain", "Method not allowed")

    // ---- pages --------------------------------------------------------------

    private fun serveForm(): Response {
        val haUrl = RemoteSettings.haUrl(context)
        val haToken = RemoteSettings.haToken(context)
        val hubs = RemoteSettings.harmonyHubs(context)
        val haConfigured = haUrl.isNotBlank() && haToken.isNotBlank()
        val update = (lastResult as? UpdateChecker.CheckResult.Available)?.info

        val updateBadgeHtml =
            if (update != null) {
                """
                <form method="post" action="/install-update" class="status-right">
                  <button type="submit" class="badge badge-warn" title="${escape(context.getString(R.string.web_config_install_update_button))}">
                    <span class="dot dot-warn"></span>${context.getString(R.string.web_config_update_found, update.version)}
                  </button>
                </form>
                """.trimIndent()
            } else {
                """
                <a class="badge status-right" href="/check-update" title="${escape(context.getString(R.string.web_config_check_update_link))}">
                  <span class="dot dot-off"></span>v${BuildConfig.VERSION_NAME}
                </a>
                """.trimIndent()
            }

        val html =
            """
            <!doctype html><html><head><meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${context.getString(R.string.web_config_title)}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
            <style>
              :root{
                --bg:#0A1517; --surface:#101F24; --raised:#16282E; --line:#1F2E33;
                --text:#E7EEEF; --muted:#7E97A0;
                --cyan:#4FD1E0; --cyan-dim:#1B3438;
                --amber:#F0A959; --amber-dim:#3A2A18;
                --danger:#E5837E; --ok:#6EE7B7; --off:#445056;
              }
              *{box-sizing:border-box}
              body{
                font-family:'IBM Plex Mono',ui-monospace,monospace;
                background:var(--bg); color:var(--text);
                max-width:900px; margin:0 auto; padding:28px 18px 56px;
                -webkit-font-smoothing:antialiased;
              }
              .eyebrow{
                font-size:11px; letter-spacing:.14em; text-transform:uppercase;
                color:var(--cyan); font-weight:500;
              }
              h1{
                font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700;
                margin:4px 0 18px; letter-spacing:-.01em;
              }
              h2{
                font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:700;
                margin:0; display:flex; align-items:center; gap:8px;
              }
              .icon{width:18px;height:18px;flex:none}
              label{display:block;margin-top:14px;font-size:12px;color:var(--muted);letter-spacing:.02em}
              input[type=text],input[type=password]{
                width:100%; box-sizing:border-box; padding:9px 10px; margin-top:5px;
                background:var(--bg); border:1px solid var(--line); color:var(--text);
                border-radius:7px; font-family:inherit; font-size:13px;
              }
              input:focus{outline:2px solid var(--cyan); outline-offset:1px; border-color:transparent}
              .btn{
                margin-top:16px; padding:10px 16px; border:none; border-radius:7px;
                font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:13px;
                cursor:pointer;
              }
              .btn-cyan{background:var(--cyan); color:#04191c}
              .btn-amber{background:var(--amber); color:#241505}
              .btn-ghost{background:var(--raised); color:var(--text); border:1px solid var(--line)}
              .btn-block{width:100%; text-align:center; display:block; text-decoration:none}
              .note{font-size:11.5px; color:var(--muted); margin-top:6px; line-height:1.5}
              a{color:var(--cyan)}
              .panel{
                background:var(--surface); border:1px solid var(--line); border-radius:12px;
                padding:18px 18px 20px; margin-top:22px; border-left:3px solid var(--accent,var(--line));
              }
              .panel-connection{--accent:var(--cyan)}
              .panel-editor{--accent:var(--amber)}
              .panel h2{color:var(--accent,var(--text))}
              .panel-sub{font-size:12px;color:var(--muted);margin:4px 0 0}
              .status-strip{display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin:14px 0 4px}
              .status-left{display:flex; gap:8px; flex-wrap:wrap}
              .status-right{margin:0}
              .badge{
                display:inline-flex; align-items:center; gap:6px; font-size:11px;
                padding:6px 10px; border-radius:999px; background:var(--raised); border:1px solid var(--line);
                font-family:inherit; text-decoration:none; color:var(--text); cursor:default;
              }
              a.badge,button.badge{cursor:pointer}
              .badge-warn{background:var(--amber-dim); border-color:var(--amber); color:var(--amber)}
              .dot{width:7px;height:7px;border-radius:50%;flex:none}
              .dot-ok{background:var(--ok)} .dot-off{background:var(--off)} .dot-warn{background:var(--amber)}
              .panels-grid{display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start}
              @media (max-width:700px){ .panels-grid{grid-template-columns:1fr} }
              .panels-grid .panel{margin-top:0}
              .divider{height:1px; background:var(--line); margin:20px 0}
              .hub-row{border:1px solid var(--line);border-radius:9px;padding:12px;margin-top:12px;background:var(--raised)}
              .hub-row .hub-actions{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
              .hub-row .hub-actions a{font-size:11.5px}
              .hub-remove{background:none;border:none;color:var(--danger);font-size:11.5px;margin:0;padding:0;cursor:pointer;font-family:inherit}
              .hub-add{background:transparent;color:var(--cyan);border:1px dashed var(--cyan);width:100%}
              .hub-discover-btn{background:var(--surface);color:var(--cyan);border:1px solid var(--line)}
              .hub-config-result{white-space:pre-wrap;font-size:10.5px;background:var(--bg);border:1px solid var(--line);
                border-radius:6px;padding:8px;margin-top:6px;max-height:200px;overflow:auto;display:none}
            </style></head><body>

            <div class="eyebrow">ASTRION · LOCAL CONFIG</div>
            <h1>${context.getString(R.string.web_config_title)}</h1>
            <div class="status-strip">
              <div class="status-left">
                <span class="badge"><span class="dot ${if (haConfigured) "dot-ok" else "dot-off"}"></span>${context.getString(R.string.web_config_ha_heading)}${if (haConfigured) "" else " — " + context.getString(R.string.web_config_status_not_set)}</span>
                <span class="badge"><span class="dot ${if (hubs.isNotEmpty()) "dot-ok" else "dot-off"}"></span>${hubs.size} ${context.getString(if (hubs.size == 1) R.string.web_config_status_hub_singular else R.string.web_config_status_hub_plural)}</span>
              </div>
              $updateBadgeHtml
            </div>

            <div class="panels-grid">
            <div class="panel panel-connection">
              <h2>${svgWifi()}${context.getString(R.string.web_config_ha_heading)}</h2>
              <form method="post" action="/save-connection" id="connection-form">
                <label>${context.getString(R.string.web_config_ha_url_label)}</label>
                <input type="text" name="ha_url" value="${escape(haUrl)}" placeholder="http://192.168.1.50:8123">
                <label>${context.getString(R.string.web_config_ha_token_label)}</label>
                <input type="password" name="ha_token" value="${escape(haToken)}">

                <div class="divider"></div>

                <h2>${svgRemote()}${context.getString(R.string.web_config_harmony_heading)}</h2>
                <div id="harmony-hubs">
                  ${hubs.joinToString("") { hubRowHtml(it) }}
                </div>
                <button type="button" class="btn hub-add" onclick="addHubRow()">${context.getString(R.string.web_config_harmony_add_button)}</button>

                <button type="submit" class="btn btn-cyan">${context.getString(R.string.web_config_save_button)}</button>
                <div class="note">${context.getString(R.string.web_config_save_note)}</div>
              </form>
            </div>

            <div class="panel panel-editor">
              <h2>${svgWand()}${context.getString(R.string.web_config_dashboard_heading)}</h2>
              <p class="panel-sub">${context.getString(R.string.web_config_dashboard_sub)}</p>
              <a class="btn btn-amber btn-block" href="/builder/">${context.getString(R.string.web_config_dashboard_builder_link)}</a>

              <div class="divider"></div>

              <a class="btn btn-ghost" href="/dashboard.json">${svgDownload()} ${context.getString(R.string.web_config_dashboard_download)}</a>

              <label>${svgUpload()} ${context.getString(R.string.web_config_dashboard_upload_button)}</label>
              <form method="post" action="/dashboard.json" enctype="multipart/form-data">
                <input type="file" name="file" accept=".json">
                <button type="submit" class="btn btn-ghost">${context.getString(R.string.web_config_dashboard_upload_button)}</button>
              </form>

              <div class="divider"></div>

              <label>${svgImage()} ${context.getString(R.string.web_config_icons_heading)}</label>
              <form method="post" action="/icons" enctype="multipart/form-data">
                <input type="file" name="file" accept="image/png">
                <button type="submit" class="btn btn-ghost">${context.getString(R.string.web_config_icons_upload_button)}</button>
              </form>
              <p class="note">${context.getString(R.string.web_config_icons_note)}</p>
            </div>
            </div>

            <template id="hub-row-template">${hubRowHtml(HarmonyHubConfig("", "", "", ""))}</template>
            <script>
              function addHubRow() {
                const tpl = document.getElementById('hub-row-template').innerHTML;
                const div = document.createElement('div');
                div.innerHTML = tpl;
                document.getElementById('harmony-hubs').appendChild(div.firstElementChild);
              }
              function removeHubRow(btn) {
                btn.closest('.hub-row').remove();
              }
              function fetchHubConfig(btn, localId) {
                const out = btn.closest('.hub-row').querySelector('.hub-config-result');
                out.style.display = 'block';
                out.textContent = '${jsEscape(context.getString(R.string.web_config_harmony_fetching))}';
                fetch('/harmony-config?hub=' + encodeURIComponent(localId))
                  .then(r => r.json())
                  .then(data => { out.textContent = JSON.stringify(data, null, 2); })
                  .catch(e => { out.textContent = 'Error: ' + e; });
              }
              /** Shared discovery logic. `silent` suppresses the alert on failure —
                  used for the automatic on-blur trigger, which shouldn't nag the
                  user before they've even finished typing the IP. */
              function runDiscoverHubId(row, silent) {
                const ipInput = row.querySelector('input[name="hub_ip[]"]');
                const idInput = row.querySelector('input[name="hub_hubid[]"]');
                const btn = row.querySelector('.hub-discover-btn');
                const ip = ipInput.value.trim();
                if (!ip) {
                  if (!silent) alert('${jsEscape(context.getString(R.string.web_config_harmony_discover_need_ip))}');
                  return;
                }
                const originalText = btn.textContent;
                btn.textContent = '${jsEscape(context.getString(R.string.web_config_harmony_fetching))}';
                btn.disabled = true;
                fetch('/harmony-discover?ip=' + encodeURIComponent(ip))
                  .then(r => r.json())
                  .then(data => {
                    if (data.hubId) { idInput.value = data.hubId; }
                    else if (!silent) { alert(data.error || '${jsEscape(context.getString(R.string.web_config_harmony_discover_failed))}'); }
                  })
                  .catch(e => { if (!silent) alert('${jsEscape(context.getString(R.string.web_config_harmony_discover_failed))}: ' + e); })
                  .finally(() => { btn.textContent = originalText; btn.disabled = false; });
              }
              function discoverHubId(btn) {
                runDiscoverHubId(btn.closest('.hub-row'), false);
              }
              /** Auto-triggered when the IP field loses focus — only if the ID
                  field is still empty, so it never overwrites a value someone
                  entered or fetched manually. Silent: a failed guess here (e.g.
                  because the IP isn't reachable yet) shouldn't pop an alert while
                  the form is still being filled in — the "Auto-detect ID" button
                  stays available for a manual retry with a visible error. */
              function onHubIpBlur(ipInput) {
                const row = ipInput.closest('.hub-row');
                const idInput = row.querySelector('input[name="hub_hubid[]"]');
                if (idInput.value.trim()) return;
                runDiscoverHubId(row, true);
              }
            </script>

            </body></html>
            """.trimIndent()
        return newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", html)
    }

    // ---- inline icons (no external requests — this page must work with zero
    // internet access beyond the optional Google Fonts, which degrade gracefully) --

    private fun svgWifi() = """<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8.5a17 17 0 0 1 20 0"/><path d="M5.5 12.5a12 12 0 0 1 13 0"/><path d="M9 16.5a7 7 0 0 1 6 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>"""

    private fun svgRemote() = """<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1.4" fill="currentColor" stroke="none"/><path d="M9.5 12h5M9.5 15.5h5M9.5 19h2"/></svg>"""

    private fun svgWand() = """<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 16 8"/><path d="M14.5 9.5 18 6"/><path d="M19 4v2M22 5h-2M4 3v2M3 4h2M19.5 15v2M20.5 16h-2"/></svg>"""

    private fun svgDownload() = """<svg class="icon" style="width:13px;height:13px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>"""

    private fun svgUpload() = """<svg class="icon" style="width:13px;height:13px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8M7 13l5-5 5 5M4 4h16"/></svg>"""

    private fun svgImage() = """<svg class="icon" style="width:13px;height:13px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.4" fill="currentColor" stroke="none"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg>"""

    /** One repeatable hub row — also used (with blank values) as the JS `+` template. */
    private fun hubRowHtml(hub: HarmonyHubConfig): String {
        val fetchLink =
            if (hub.localId.isNotBlank()) {
                """<a href="#" onclick="fetchHubConfig(this, '${escape(hub.localId)}'); return false;">${context.getString(R.string.web_config_harmony_fetch_link)}</a>"""
            } else {
                "" // unsaved row — nothing to fetch yet, hub doesn't exist on the backend until Save is pressed
            }
        return """
            <div class="hub-row">
              <input type="hidden" name="hub_localid[]" value="${escape(hub.localId)}">
              <label>${context.getString(R.string.web_config_harmony_name_label)}</label>
              <input type="text" name="hub_name[]" value="${escape(hub.name)}" placeholder="Salon">
              <label>${context.getString(R.string.web_config_harmony_ip_label)}</label>
              <input type="text" name="hub_ip[]" value="${escape(hub.ip)}" placeholder="192.168.1.50" onblur="onHubIpBlur(this)">
              <label>${context.getString(R.string.web_config_harmony_id_label)}</label>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="text" name="hub_hubid[]" value="${escape(hub.hubId)}" style="flex:1">
                <button type="button" class="hub-discover-btn" style="margin-top:0;padding:8px 10px;white-space:nowrap;border-radius:7px;font-family:inherit;font-size:12px;cursor:pointer" onclick="discoverHubId(this)">${context.getString(R.string.web_config_harmony_discover_button)}</button>
              </div>
              <div class="hub-actions">
                $fetchLink
                <button type="button" class="hub-remove" onclick="removeHubRow(this)">${context.getString(R.string.web_config_harmony_remove_button)}</button>
              </div>
              <div class="hub-config-result"></div>
            </div>
            """.trimIndent()
    }

    private fun serveDashboardJson(): Response {
        val file = DashboardLoader.configFile
        if (!file.exists()) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "No dashboard.json yet")
        }
        return newFixedLengthResponse(Response.Status.OK, "application/json", file.readText())
    }

    /**
     * Serves the dashboard builder (the same tool published on GitHub Pages
     * as docs/index.html) straight from this device's own local web server,
     * bundled as assets/docs/ — so building a dashboard.json doesn't require
     * a separate computer or internet access, just this device's own IP.
     * `/builder` -> assets/docs/index.html, `/builder/js/x.js` -> assets/docs/js/x.js, etc.
     */
    private fun serveBuilderAsset(uri: String): Response {
        val relativePath = uri.removePrefix("/builder/").ifBlank { "index.html" }
        if (relativePath.contains("..")) {
            return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Forbidden")
        }
        val assetPath = "docs/$relativePath"
        val bytes =
            try {
                context.assets.open(assetPath).use { it.readBytes() }
            } catch (_: java.io.FileNotFoundException) {
                return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found: $assetPath")
            }
        val mime =
            when (relativePath.substringAfterLast('.', "")) {
                "html" -> "text/html; charset=utf-8"
                "js" -> "application/javascript; charset=utf-8"
                "css" -> "text/css; charset=utf-8"
                "json" -> "application/json; charset=utf-8"
                "svg" -> "image/svg+xml"
                "png" -> "image/png"
                "jpg", "jpeg" -> "image/jpeg"
                "ico" -> "image/x-icon"
                else -> "application/octet-stream"
            }
        return newFixedLengthResponse(Response.Status.OK, mime, bytes.inputStream(), bytes.size.toLong())
    }

    /** 302 redirect — used to send /builder to /builder/ so index.html's
     * relative asset paths (js/x.js, styles.css, remote.png) resolve
     * against the right base instead of the server root. */
    private fun redirectBuilder(): Response {
        val response = newFixedLengthResponse(Response.Status.REDIRECT, "text/plain", "")
        response.addHeader("Location", "/builder/")
        return response
    }

    /**
     * Lists the configured Harmony hubs (id + name only — no IP/hubId, the
     * builder doesn't need those) so the dashboard editor's hotkey form can
     * offer a "Hub" dropdown before drilling into its devices/activities via
     * /harmony-config?hub=<localId>.
     */
    private fun serveHarmonyHubs(): Response {
        val json =
            JSONArray().apply {
                harmonyRegistry.configs.forEach { hub ->
                    put(
                        JSONObject().apply {
                            put("localId", hub.localId)
                            put("name", hub.name)
                        },
                    )
                }
            }
        return newFixedLengthResponse(Response.Status.OK, "application/json", json.toString())
    }

    /**
     * Returns a hub's live config (devices + their commands, activities) as
     * JSON — the same data Home Assistant keeps in `harmony_<hubId>.conf`,
     * fetched straight from the hub. `?hub=<localId>` picks which configured
     * hub to query; omitted or unknown falls back to the first one. Meant to
     * be called from this page's "Fetch config" link, and later from an
     * in-app dashboard builder to autofill device/command pickers instead
     * of typing IDs by hand.
     */
    private fun serveHarmonyConfig(session: IHTTPSession): Response {
        val hubParam = session.parameters["hub"]?.firstOrNull()
        // Same fallback-to-first-hub resolution as HarmonyHubRegistry.client(),
        // but we need the HarmonyHubConfig itself (not just its client) to know
        // which cache file (by hubId) to read/write below.
        val hubConfig =
            harmonyRegistry.configs.firstOrNull { it.localId == hubParam }
                ?: harmonyRegistry.configs.firstOrNull()
                ?: return newFixedLengthResponse(Response.Status.NOT_FOUND, "application/json", """{"error":"no Harmony hub configured"}""")
        val client = harmonyRegistry.client(hubConfig.localId)

        val config = client?.let { runBlocking { it.getConfig() } }
        if (config == null) {
            val cached = readHarmonyConfigCache(hubConfig)
            return if (cached != null) {
                Log.w("ConfigServer", "Harmony hub '${hubConfig.name}' unreachable — serving last cached config")
                newFixedLengthResponse(Response.Status.OK, "application/json", cached.toString())
            } else {
                newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json", """{"error":"could not reach hub (not connected, or request timed out), and no cached config on disk yet"}""")
            }
        }

        val json =
            JSONObject().apply {
                put(
                    "devices",
                    JSONArray().apply {
                        config.devices.forEach { d ->
                            put(
                                JSONObject().apply {
                                    put("id", d.id)
                                    put("label", d.label)
                                    put(
                                        "commands",
                                        JSONArray().apply {
                                            d.commands.forEach { c ->
                                                put(
                                                    JSONObject().apply {
                                                        put("name", c.name)
                                                        put("label", c.label)
                                                    },
                                                )
                                            }
                                        },
                                    )
                                },
                            )
                        }
                    },
                )
                put(
                    "activities",
                    JSONArray().apply {
                        config.activities.forEach { a ->
                            put(
                                JSONObject().apply {
                                    put("id", a.id)
                                    put("label", a.label)
                                },
                            )
                        }
                    },
                )
            }
        writeHarmonyConfigCache(hubConfig, json)
        return newFixedLengthResponse(Response.Status.OK, "application/json", json.toString())
    }

    /** Cache file for a hub's config, next to dashboard.json — astrion/harmony_<hubId>.json
     * (or <localId> as a fallback if hubId is somehow blank). Named after the hub's own
     * numeric ID, same spirit as Home Assistant's harmony_<id>.conf. */
    private fun harmonyConfigCacheFile(hub: HarmonyHubConfig): File =
        File(DashboardLoader.configFile.parentFile, "harmony_${hub.hubId.ifBlank { hub.localId }}.json")

    private fun writeHarmonyConfigCache(
        hub: HarmonyHubConfig,
        config: JSONObject,
    ) {
        try {
            val file = harmonyConfigCacheFile(hub)
            file.parentFile?.mkdirs()
            file.writeText(config.toString(2))
        } catch (e: Exception) {
            Log.e("ConfigServer", "failed to cache Harmony config for '${hub.name}'", e)
        }
    }

    private fun readHarmonyConfigCache(hub: HarmonyHubConfig): JSONObject? {
        val file = harmonyConfigCacheFile(hub)
        if (!file.exists()) return null
        return runCatching { JSONObject(file.readText()) }
            .onFailure { Log.e("ConfigServer", "failed to read cached Harmony config for '${hub.name}'", it) }
            .getOrNull()
    }

    /**
     * Resolves a hub's hubId from its IP alone (`?ip=<address>`), so the
     * "Auto-detect ID" button next to a hub row doesn't require the user to
     * already know (or mistakenly copy from another hub) its numeric ID —
     * see HarmonyHubDiscovery for the underlying protocol.
     */
    private fun serveHarmonyDiscover(session: IHTTPSession): Response {
        val ip = session.parameters["ip"]?.firstOrNull()?.trim()
        if (ip.isNullOrBlank()) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json", """{"error":"missing ip"}""")
        }
        val hubId =
            runBlocking { HarmonyHubDiscovery.discoverHubId(ip) }
                ?: return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json", """{"error":"could not reach hub at $ip, or unexpected response"}""")
        return newFixedLengthResponse(Response.Status.OK, "application/json", """{"hubId":"$hubId"}""")
    }

    // ---- actions --------------------------------------------------------------

    private fun handleSaveConnection(session: IHTTPSession): Response {
        val files = HashMap<String, String>()
        session.parseBody(files) // reads the request body ONCE; also populates session.parameters for an urlencoded POST
        val params = session.parameters

        RemoteSettings.saveHaConnection(
            context = context,
            haUrl = params["ha_url"]?.firstOrNull().orEmpty().trim(),
            haToken = params["ha_token"]?.firstOrNull().orEmpty().trim(),
        )
        RemoteSettings.saveHarmonyHubs(context, parseHubRows(params))
        Handler(Looper.getMainLooper()).postDelayed({ onConnectionSaved() }, 500L)
        return redirectHome(context.getString(R.string.web_config_saved_reconnecting))
    }

    /** Reassembles the repeatable hub rows (hub_name[]/hub_ip[]/hub_hubid[]/hub_localid[]) posted by the form. */
    private fun parseHubRows(params: Map<String, List<String>>): List<HarmonyHubConfig> {
        val ids = params["hub_localid[]"].orEmpty()
        val names = params["hub_name[]"].orEmpty()
        val ips = params["hub_ip[]"].orEmpty()
        val hubIds = params["hub_hubid[]"].orEmpty()
        val rowCount = maxOf(ids.size, names.size, ips.size, hubIds.size)

        return (0 until rowCount).mapNotNull { i ->
            val name = names.getOrNull(i).orEmpty().trim()
            val ip = ips.getOrNull(i).orEmpty().trim()
            val hubId = hubIds.getOrNull(i).orEmpty().trim()
            if (name.isBlank() && ip.isBlank() && hubId.isBlank()) return@mapNotNull null // empty "+" row never filled in

            val existingLocalId = ids.getOrNull(i).orEmpty().trim()
            val localId = existingLocalId.ifBlank { UUID.randomUUID().toString() }
            HarmonyHubConfig(localId = localId, name = name.ifBlank { "Harmony Hub" }, ip = ip, hubId = hubId)
        }
    }

    private fun handleDashboardUpload(session: IHTTPSession): Response {
        val files = HashMap<String, String>()
        session.parseBody(files) // NanoHTTPD writes uploaded parts to temp files, keyed by form field name
        val tmpPath =
            files["file"]
                ?: return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing file")
        File(tmpPath).copyTo(DashboardLoader.configFile, overwrite = true)
        onDashboardUpdated()
        return redirectHome(context.getString(R.string.web_config_dashboard_updated))
    }

    private fun handleIconUpload(session: IHTTPSession): Response {
        val files = HashMap<String, String>()
        session.parseBody(files)
        val tmpPath =
            files["file"]
                ?: return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing file")
        // For multipart file fields, NanoHTTPD puts the temp path in `files` and
        // the original filename as the parameter value for that same field name.
        val originalName = session.parameters["file"]?.firstOrNull() ?: "icon_${System.currentTimeMillis()}.png"
        File(tmpPath).copyTo(File(iconsDir, sanitize(originalName)), overwrite = true)
        return redirectHome(context.getString(R.string.web_config_icon_uploaded))
    }

    /**
     * Lists every icon previously uploaded to [iconsDir], as a JSON array of
     * bare filenames — feeds the dashboard builder's icon picker (`docs/js/
     * cards.js`'s `openIconPicker()`), which shows them as clickable
     * thumbnails instead of making the person type a path by hand. Only
     * meaningful when the builder is opened from this device (`/builder/`);
     * the picker button hides itself if this call fails (e.g. GitHub Pages).
     */
    private fun serveIconsList(): Response {
        val names = iconsDir.listFiles()?.filter { it.isFile }?.map { it.name }?.sorted() ?: emptyList()
        val json = JSONArray(names).toString()
        return newFixedLengthResponse(Response.Status.OK, "application/json", json)
    }

    /**
     * Serves a previously-uploaded icon back out of [iconsDir] — the other
     * half of `handleIconUpload`'s `POST /icons`. Used by the dashboard
     * builder (`docs/js/cards.js`'s `iconUrl()`) when it's opened from this
     * device (`/builder/`), to preview a `scene_grid`/`button_grid` card's
     * real configured icon instead of just its name. `sanitize()` (same one
     * upload uses) collapses the requested path down to a bare filename, so
     * `/icons/../../whatever` can't escape [iconsDir].
     */
    private fun serveIcon(uri: String): Response {
        val name = sanitize(uri.removePrefix("/icons/"))
        val file = File(iconsDir, name)
        if (name.isBlank() || !file.isFile) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found: $name")
        }
        val mime =
            when (name.substringAfterLast('.', "").lowercase()) {
                "png" -> "image/png"
                "jpg", "jpeg" -> "image/jpeg"
                "svg" -> "image/svg+xml"
                "webp" -> "image/webp"
                else -> "application/octet-stream"
            }
        val bytes = file.readBytes()
        return newFixedLengthResponse(Response.Status.OK, mime, bytes.inputStream(), bytes.size.toLong())
    }

    private fun handleCheckUpdate(): Response {
        val result = UpdateChecker.checkForUpdate()
        lastResult = result
        val message =
            when (result) {
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
        val info =
            (result as? UpdateChecker.CheckResult.Available)?.info
                ?: return redirectHome(
                    when (result) {
                        is UpdateChecker.CheckResult.Failed -> context.getString(R.string.web_config_update_failed, result.reason)
                        else -> context.getString(R.string.web_config_update_none)
                    },
                )

        // Ask first instead of letting the installation intent fail: on Android 8+
        // this permission is granted per-app in Settings, not at install time.
        if (!context.packageManager.canRequestPackageInstalls()) {
            val settingsIntent =
                Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    "package:${context.packageName}".toUri(),
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            runCatching { context.startActivity(settingsIntent) }
            return redirectHome(context.getString(R.string.web_config_update_needs_permission))
        }

        val file =
            UpdateChecker.download(context, info.apkUrl)
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

    private fun redirectHome(message: String): Response {
        val html = """<!doctype html><meta http-equiv="refresh" content="2;url=/">
            <body style="font-family:sans-serif;background:#0e2229;color:#e6e6e6;padding:24px">$message…</body>"""
        return newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", html)
    }

    private fun sanitize(name: String) =
        name.substringAfterLast('/').replace(Regex("[^A-Za-z0-9._-]"), "_")

    private fun escape(s: String) =
        s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;")

    /** Escapes a string for safe embedding inside a single-quoted JS string literal
     * in the generated <script> block — needed for any translated string (which may
     * contain apostrophes, e.g. French "d'abord") interpolated into inline JS. */
    private fun jsEscape(s: String) =
        s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")
}
