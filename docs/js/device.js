// ---- Load / Save directly to this device ------------------------------------
//
// When this builder is served by the app itself (http://<device-ip>:8080/builder/),
// these read/write dashboard.json straight from/to the device instead of the
// paste/download flow. Fails silently when opened elsewhere (GitHub Pages, a
// plain static file server) — paste + download keeps working as before there.

let deviceModeAvailable = false; // true once we've confirmed we're being served by the app

// Slide-up toast notification. Replaces the blocking alert() that "Save to
// device" used to pop — non-modal, auto-dismisses (3s success / 5s error),
// falls back to alert() if the #toast element isn't present.
let _toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  void el.offsetWidth; // restart transition if a toast is already showing
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), type === 'error' ? 5000 : 3000);
}

async function loadDashboardFromDevice() {
  await I18N.ready; // the preview's mock/state labels render during init, so strings must be in first
  try {
    const res = await fetch('/dashboard.json');
    deviceModeAvailable = true; // reaching this line at all means the app answered — even a 404 (no dashboard.json saved yet) still confirms device mode
    await loadHaStates(); // best-effort: lets the preview render with live HA data instead of the static mocks
    if (res.ok) {
      const parsed = await res.json();
      applyParsedDashboard(parsed);
      initEditor();
      console.log('Loaded dashboard.json from this device.');
    } else {
      // No dashboard.json yet — the inline initEditor() already ran with the
      // default empty page; just refresh the preview now that haStates is loaded.
      renderPreview();
    }
  } catch (e) {
    deviceModeAvailable = false;
    console.log('Not served by the app (or offline) — using the paste/download flow instead.', e);
  }
  updateDeviceModeUi();
}

/**
 * Fetches a snapshot of every HA entity the device currently knows, exposed
 * by the app at /ha-states. Sets the global `haStates` (declared in preview.js)
 * so the card renderers can use live state/names/attributes instead of the
 * static *_MOCK examples. Failures are swallowed: on GitHub Pages or when HA
 * is unreachable, haStates stays null and the preview quietly falls back to
 * the mocks + prettyEntityName().
 */
async function loadHaStates() {
  try {
    const res = await fetch('/ha-states');
    if (!res.ok) return;
    const data = await res.json();
    haStates = (data && data.states) ? data.states : null;
    if (data && data.connected === false) {
      console.log('HA not connected — preview will use example data.');
    }
  } catch (e) {
    haStates = null; // not device mode, or older app build without the endpoint
  }
}

/** Normalizes a parsed dashboard.json into dashboardData — same shape importJson() builds,
 * factored out so both paths (paste and device auto-load) stay in sync. */
function applyParsedDashboard(parsed) {
  dashboardData = {
    startPage: parsed.startPage || 0,
    pages: (parsed.pages || []).map(p => ({
      name: p.name || 'Page',
      cards: p.cards || [],
      hotkeys: p.hotkeys || [],
      longHotkeys: p.longHotkeys || [],
    })),
    hotkeys: parsed.hotkeys || [],
    longHotkeys: parsed.longHotkeys || [],
    irDevices: parsed.irDevices || [],
    activities: parsed.activities || [],
    theme: parsed.theme || {},
  };
  if (dashboardData.pages.length === 0) {
    dashboardData.pages.push({ name: "Home", cards: [], hotkeys: [], longHotkeys: [] });
  }
  currentActivePage = 0;
}

async function saveDashboardToDevice() {
  const jsonText = document.getElementById('jsonOutput').value;
  try {
    JSON.parse(jsonText); // fail fast with a clear message rather than let the app reject a bad upload silently
  } catch (e) {
    showToast(I18N.t('web_page_invalid_json', e.message), 'error');
    return;
  }
  const btn = document.getElementById('saveToDeviceBtn');
  const originalText = btn.textContent;
  btn.textContent = I18N.t('web_device_saving');
  btn.disabled = true;
  try {
    const form = new FormData();
    form.append('file', new Blob([jsonText], { type: 'application/json' }), 'dashboard.json');
    const res = await fetch('/dashboard.json', { method: 'POST', body: form });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showToast(I18N.t('web_device_saved'));
  } catch (e) {
    showToast(I18N.t('web_device_save_failed', e), 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function updateDeviceModeUi() {
  const banner = document.getElementById('deviceModeBanner');
  const saveBtn = document.getElementById('saveToDeviceBtn');
  if (banner) {
    banner.style.display = 'block';
    banner.textContent = deviceModeAvailable
      ? I18N.t('web_device_connected_banner')
      : I18N.t('web_device_offline_banner');
  }
  if (saveBtn) saveBtn.style.display = deviceModeAvailable ? 'inline-block' : 'none';
}

loadDashboardFromDevice();
