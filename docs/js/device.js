// ---- Load / Save directly to this device ------------------------------------
//
// When this builder is served by the app itself (http://<device-ip>:8080/builder/),
// these read/write dashboard.json straight from/to the device instead of the
// paste/download flow. Fails silently when opened elsewhere (GitHub Pages, a
// plain static file server) — paste + download keeps working as before there.

let deviceModeAvailable = false; // true once we've confirmed we're being served by the app

async function loadDashboardFromDevice() {
  try {
    const res = await fetch('/dashboard.json');
    deviceModeAvailable = true; // reaching this line at all means the app answered — even a 404 (no dashboard.json saved yet) still confirms device mode
    if (res.ok) {
      const parsed = await res.json();
      applyParsedDashboard(parsed);
      initEditor();
      console.log('Loaded dashboard.json from this device.');
    }
  } catch (e) {
    deviceModeAvailable = false;
    console.log('Not served by the app (or offline) — using the paste/download flow instead.', e);
  }
  updateDeviceModeUi();
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
    alert('Invalid JSON: ' + e.message);
    return;
  }
  const btn = document.getElementById('saveToDeviceBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Saving…';
  btn.disabled = true;
  try {
    const form = new FormData();
    form.append('file', new Blob([jsonText], { type: 'application/json' }), 'dashboard.json');
    const res = await fetch('/dashboard.json', { method: 'POST', body: form });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    alert('Saved to this device — the dashboard reloads automatically.');
  } catch (e) {
    alert('Save failed: ' + e);
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
      ? '✓ Connected to this device — dashboard.json was loaded automatically, and "Save to device" applies changes live.'
      : 'Not connected to a device — use "Load" (paste) and "Download" below, or open this page from your device\'s own /builder/ URL.';
  }
  if (saveBtn) saveBtn.style.display = deviceModeAvailable ? 'inline-block' : 'none';
}

loadDashboardFromDevice();
