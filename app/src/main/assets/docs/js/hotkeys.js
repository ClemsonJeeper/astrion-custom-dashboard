// ---- Hotkeys --------------------------------------------------------------

function updateHotkeyActionInputs() {
  const action = document.getElementById('hkAction').value;
  const container = document.getElementById('dynamicHotkeyInputs');
  if (action === 'page') {
    container.innerHTML = `<label>Target page name</label><input type="text" id="hkPage" placeholder="e.g., Media">`;
  } else if (action === 'openOverlay') {
    container.innerHTML = `
      <label>Overlay</label>
      <select id="hkOverlay">
        <option value="settings">Settings (same as swipe down from the top bar)</option>
        <option value="activities">Active Activities (same as swipe up from the page dots)</option>
      </select>
    `;
  } else if (action === 'openCurrentActivity') {
    container.innerHTML = `
      <label>Room</label><input type="text" id="hkActivityRoom" placeholder="e.g., Living Room">
      <div class="hint" style="margin-top:4px">Jumps straight to the page of whichever Activity is currently active in this room — no picker. Does nothing if that room has nothing active right now. Must match a room name used by a tracked Activity (a composed Activity, or a scene_grid tile / hotkey with "track": true) exactly.</div>
    `;
  } else if (action === 'service') {
    container.innerHTML = `
      <label>Service (domain.service)</label><input type="text" id="hkService" placeholder="e.g., light.toggle">
      <label>Entity ID (optional)</label><input type="text" id="hkEntityId" placeholder="e.g., light.living_room">
      <label>Extra data (optional, JSON)</label><input type="text" id="hkData" placeholder='{"brightness": 255}'>
    `;
  } else if (action === 'harmonyCommand') {
    if (harmonyAvailable) {
      renderHarmonyHubSelect(container, 'command', 'hk');
    } else {
      container.innerHTML = `
        <label>Harmony device ID</label><input type="text" id="hkDevice" placeholder="e.g., 62845789">
        <label>Harmony command</label><input type="text" id="hkCommand" placeholder="e.g., VolumeUp">
      `;
    }
  } else if (action === 'harmonyActivity') {
    if (harmonyAvailable) {
      renderHarmonyHubSelect(container, 'activity', 'hk');
    } else {
      container.innerHTML = `<label>Harmony activity ID</label><input type="text" id="hkActivityId" placeholder="e.g., 12345678 (or -1 for Power Off)">`;
    }
  }
}

function describeHotkey(h) {
  if (h.page) return `→ page "${h.page}"`;
  if (h.openOverlay) return `→ open ${h.openOverlay === 'activities' ? 'Active Activities' : 'Settings'}`;
  if (h.openCurrentActivityRoom) return `→ current Activity in "${h.openCurrentActivityRoom}"`;
  if (h.service) return `→ ${h.service}${h.entityId ? ' (' + h.entityId + ')' : ''}`;
  if (h.harmonyCommand) return `→ Harmony ${h.harmonyDevice || '?'} / ${h.harmonyCommand}`;
  if (h.harmonyActivity) return `→ Harmony activity ${h.harmonyActivity}`;
  return '';
}

function renderHotkeysList() {
  const container = document.getElementById('hotkeysList');
  if (!container) return;
  container.innerHTML = '';
  const page = dashboardData.pages[currentActivePage];

  const addRows = (list, scope, listType, label) => {
    (list || []).forEach((h, i) => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `
        <span>[${label}] <b>${h.key}</b> ${describeHotkey(h)}</span>
        <span>
          <span class="remove" style="color:#00E5FF" onclick="editHotkey('${scope}','${listType}',${i})">✎</span>
          <span class="remove" onclick="removeHotkey('${scope}','${listType}',${i})">✕</span>
        </span>
      `;
      container.appendChild(row);
    });
  };

  addRows(dashboardData.hotkeys, 'global', 'hotkeys', 'Global');
  addRows(dashboardData.longHotkeys, 'global', 'longHotkeys', 'Global, long');
  addRows(page.hotkeys, 'page', 'hotkeys', 'Page');
  addRows(page.longHotkeys, 'page', 'longHotkeys', 'Page, long');

  if (!container.innerHTML.trim()) container.innerHTML = '<div class="hint">No hotkeys yet.</div>';

  updateHardwareKeyHighlights();
}

// Highlights the physical buttons on the remote-frame preview that already
// have a hotkey bound — either globally (works on every page) or for the
// currently active page/tab. Cyan glow = bound to a short press, amber glow
// = bound to a long press only; a button bound to both gets the cyan glow
// plus a small amber outline ring layered on top. Mirrors the real device's
// on-press glow (see .hw-btn:hover in styles.css) so it's obvious at a
// glance which buttons already do something, and updates automatically
// every time this runs (add/edit/remove hotkey, switch page, add/rename/
// remove a page — see the other renderHotkeysList() call sites).
function updateHardwareKeyHighlights() {
  const buttons = document.querySelectorAll('[data-hwkey]');
  if (!buttons.length) return;
  const page = dashboardData.pages[currentActivePage];
  const shortKeys = new Set(
    [...(dashboardData.hotkeys || []), ...((page && page.hotkeys) || [])].map((h) => h.key),
  );
  // The parent-navigation fallback also occupies a button on this page,
  // unless an explicit hotkey above already claims it (matches the app's
  // own MainActivity.rebindHotkeysForCurrentPage() precedence).
  if (page && page.parent) {
    const parentKey = (page.parentKey || 'BACK').toUpperCase();
    if (!shortKeys.has(parentKey)) shortKeys.add(parentKey);
  }
  const longKeys = new Set(
    [...(dashboardData.longHotkeys || []), ...((page && page.longHotkeys) || [])].map((h) => h.key),
  );

  buttons.forEach((el) => {
    const key = el.dataset.hwkey;
    el.classList.remove('hw-assigned', 'hw-assigned-long-only', 'hw-has-long');
    const hasShort = shortKeys.has(key);
    const hasLong = longKeys.has(key);
    if (hasShort && hasLong) el.classList.add('hw-assigned', 'hw-has-long');
    else if (hasShort) el.classList.add('hw-assigned');
    else if (hasLong) el.classList.add('hw-assigned-long-only');
  });
}

async function editHotkey(scope, listType, i) {
  const target = scope === 'global' ? dashboardData : dashboardData.pages[currentActivePage];
  const h = target[listType][i];
  editingHotkey = { scope, listType, i };

  document.getElementById('hkScope').value = scope;
  document.getElementById('hkType').value = listType;
  document.getElementById('hkKey').value = h.key;
  const action = h.page ? 'page' : h.openOverlay ? 'openOverlay' : h.openCurrentActivityRoom ? 'openCurrentActivity' : h.service ? 'service' : h.harmonyCommand ? 'harmonyCommand' : 'harmonyActivity';
  document.getElementById('hkAction').value = action;
  updateHotkeyActionInputs();

  if (action === 'page') {
    document.getElementById('hkPage').value = h.page || '';
  } else if (action === 'openOverlay') {
    document.getElementById('hkOverlay').value = h.openOverlay || 'settings';
  } else if (action === 'openCurrentActivity') {
    document.getElementById('hkActivityRoom').value = h.openCurrentActivityRoom || '';
  } else if (action === 'service') {
    document.getElementById('hkService').value = h.service || '';
    document.getElementById('hkEntityId').value = h.entityId || '';
    document.getElementById('hkData').value = h.data ? JSON.stringify(h.data) : '';
  } else if (action === 'harmonyCommand') {
    if (harmonyAvailable) {
      const hubId = h.hub || (harmonyHubsList[0] && harmonyHubsList[0].localId) || '';
      document.getElementById('hkHub').value = hubId;
      await onHarmonyHubChange('command', 'hk');
      document.getElementById('hkDeviceSelect').value = h.harmonyDevice || '';
      onHarmonyDeviceChange('hk');
      document.getElementById('hkCommandSelect').value = h.harmonyCommand || '';
    } else {
      document.getElementById('hkDevice').value = h.harmonyDevice || '';
      document.getElementById('hkCommand').value = h.harmonyCommand || '';
    }
  } else if (action === 'harmonyActivity') {
    if (harmonyAvailable) {
      const hubId = h.hub || (harmonyHubsList[0] && harmonyHubsList[0].localId) || '';
      document.getElementById('hkHub').value = hubId;
      await onHarmonyHubChange('activity', 'hk');
      document.getElementById('hkActivitySelect').value = h.harmonyActivity || '';
    } else {
      document.getElementById('hkActivityId').value = h.harmonyActivity || '';
    }
  }

  document.getElementById('addHotkeyBtn').innerText = 'Save changes';
  document.getElementById('cancelHotkeyEditBtn').style.display = 'inline-block';
}

function removeHotkey(scope, listType, i) {
  const target = scope === 'global' ? dashboardData : dashboardData.pages[currentActivePage];
  target[listType].splice(i, 1);
  if (editingHotkey && editingHotkey.scope === scope && editingHotkey.listType === listType && editingHotkey.i === i) {
    cancelHotkeyEdit();
  }
  renderHotkeysList(); renderPreview(); updateJsonOutput();
}

function cancelHotkeyEdit() {
  editingHotkey = null;
  document.getElementById('addHotkeyBtn').innerText = 'Add hotkey';
  document.getElementById('cancelHotkeyEditBtn').style.display = 'none';
}

function addHotkey() {
  const scope = document.getElementById('hkScope').value;
  const hkType = document.getElementById('hkType').value;
  const key = document.getElementById('hkKey').value;
  const action = document.getElementById('hkAction').value;

  let hkObj = { key };
  if (action === 'page') {
    hkObj.page = document.getElementById('hkPage').value.trim();
  } else if (action === 'openOverlay') {
    hkObj.openOverlay = document.getElementById('hkOverlay').value;
  } else if (action === 'openCurrentActivity') {
    const room = document.getElementById('hkActivityRoom').value.trim();
    if (!room) { alert('Enter a room name.'); return; }
    hkObj.openCurrentActivityRoom = room;
  } else if (action === 'service') {
    hkObj.service = document.getElementById('hkService').value.trim();
    const entityId = document.getElementById('hkEntityId').value.trim();
    if (entityId) hkObj.entityId = entityId;
    const rawData = document.getElementById('hkData').value.trim();
    if (rawData) {
      try { hkObj.data = JSON.parse(rawData); } catch (e) { alert('Extra data must be valid JSON'); return; }
    }
  } else if (action === 'harmonyCommand') {
    if (harmonyAvailable) {
      const hub = document.getElementById('hkHub').value.trim();
      const device = document.getElementById('hkDeviceSelect').value.trim();
      const command = document.getElementById('hkCommandSelect').value.trim();
      if (!hub || !device || !command) { alert('Pick a hub, a device, and a command.'); return; }
      hkObj.hub = hub;
      hkObj.harmonyDevice = device;
      hkObj.harmonyCommand = command;
    } else {
      hkObj.harmonyDevice = document.getElementById('hkDevice').value.trim();
      hkObj.harmonyCommand = document.getElementById('hkCommand').value.trim();
    }
  } else if (action === 'harmonyActivity') {
    if (harmonyAvailable) {
      const hub = document.getElementById('hkHub').value.trim();
      const activityId = document.getElementById('hkActivitySelect').value.trim();
      if (!hub || !activityId) { alert('Pick a hub and an activity.'); return; }
      hkObj.hub = hub;
      hkObj.harmonyActivity = activityId;
    } else {
      hkObj.harmonyActivity = document.getElementById('hkActivityId').value.trim();
    }
  }

  if (editingHotkey) {
    const oldTarget = editingHotkey.scope === 'global' ? dashboardData : dashboardData.pages[currentActivePage];
    oldTarget[editingHotkey.listType].splice(editingHotkey.i, 1);
    cancelHotkeyEdit();
  }

  const target = scope === 'global' ? dashboardData : dashboardData.pages[currentActivePage];
  if (!target[hkType]) target[hkType] = [];
  target[hkType].push(hkObj);

  renderHotkeysList(); renderPreview(); updateJsonOutput();
}

// ---- Release badges (official + beta) --------------------------------------

async function fetchReleaseBadge(url, icon) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const asset = (data.assets || []).find(a => a.name.endsWith('.apk'));
    return `${icon} ${data.name || data.tag_name}` +
      (asset ? ` — <a href="${asset.browser_download_url}">télécharger l'APK</a>` : '');
  } catch (e) {
    console.log('Release fetch failed', e);
    return null;
  }
}

async function loadStableBadge() {
  const badge = document.getElementById('stableBadge');
  if (!badge) return;
  badge.textContent = 'Chargement…';
  const html = await fetchReleaseBadge(
    'https://api.github.com/repos/dckiller51/astrion-custom-dashboard/releases/latest', '✅'
  );
  badge.innerHTML = html || 'Version officielle indisponible';
}

async function toggleBetaBadge() {
  const on = document.getElementById('betaToggle').checked;
  const badge = document.getElementById('betaBadge');
  if (!on) { badge.style.display = 'none'; return; }
  badge.textContent = 'Chargement…';
  badge.style.display = 'inline-block';
  const html = await fetchReleaseBadge(
    'https://api.github.com/repos/dckiller51/astrion-custom-dashboard/releases/tags/dev-latest', '🧪'
  );
  if (!html) {
    badge.innerHTML = 'Bêta indisponible';
    return;
  }
  // In device mode (opened from the remote's own :8080), a real one-click
  // install button posts to /install-beta-update — same-origin, so it runs
  // server-side on the remote regardless of which browser/device clicked
  // it, exactly like the existing official-update button. Outside device
  // mode (e.g. GitHub Pages) there's no known device IP to target, so the
  // plain download link from fetchReleaseBadge stays as the fallback.
  if (typeof deviceModeAvailable !== 'undefined' && deviceModeAvailable) {
    const label = html.replace(/ — <a[^>]*>.*?<\/a>/, '');
    badge.innerHTML = `${label} — <button type="button" onclick="installBetaUpdate(this)" style="padding:4px 10px;font-size:0.8rem">Installer sur cet appareil</button>`;
  } else {
    badge.innerHTML = html;
  }
}

async function installBetaUpdate(btn) {
  const original = btn.textContent;
  btn.textContent = 'Installation…';
  btn.disabled = true;
  try {
    const res = await fetch('/install-beta-update', { method: 'POST' });
    const text = await res.text();
    if (!res.ok) throw new Error(text || ('HTTP ' + res.status));
    showToast('Installation lancée sur la télécommande.');
  } catch (e) {
    showToast('Échec de l\'installation : ' + e.message, 'error');
    btn.textContent = original;
    btn.disabled = false;
  }
}
