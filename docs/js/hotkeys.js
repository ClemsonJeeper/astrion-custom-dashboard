// ---- Hotkeys --------------------------------------------------------------

// Built-in command suggestions for the HA `androidtv_remote` integration
// (https://www.home-assistant.io/integrations/androidtv_remote/#remote).
// Used as a <datalist> when the selected remote entity has no
// `commands_list` attribute (most Android TV Remote entities don't expose
// one). Integrations that DO populate `commands_list` (e.g. Apple TV)
// override this list with their own values at runtime via
// `remoteCommandSuggestions()`.
//
// Order mirrors the HA docs' grouping (Navigation → Volume → Media → TV →
// Other) so the most-used keys surface first in the dropdown. The older
// `androidtv` (ADB) integration uses a slightly different keymap (bare
// `UP`/`DOWN`/`MUTE`/`PLAY`, `HDMI1`-`HDMI4`, `SLEEP`/`WAKEUP`, etc.); those
// aliases are appended at the end so they still autocomplete for ADB-backed
// remotes, but the androidtv_remote names take precedence.
const ANDROID_TV_COMMANDS = [
  // --- Navigation ---
  'DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT', 'DPAD_CENTER',
  'BUTTON_A', 'BUTTON_B', 'BUTTON_X', 'BUTTON_Y',
  'BACK', 'HOME', 'MENU', 'ENTER', 'INFO', 'GUIDE',
  // --- Volume control ---
  'VOLUME_UP', 'VOLUME_DOWN', 'VOLUME_MUTE', 'MUTE',
  // --- Media control ---
  'MEDIA_PLAY_PAUSE', 'MEDIA_PLAY', 'MEDIA_PAUSE',
  'MEDIA_NEXT', 'MEDIA_PREVIOUS', 'MEDIA_STOP', 'MEDIA_RECORD',
  'MEDIA_REWIND', 'MEDIA_FAST_FORWARD',
  // --- TV control ---
  'CHANNEL_UP', 'CHANNEL_DOWN',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'DEL',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'TV', 'TV_TELETEXT', 'CAPTIONS', 'DVR',
  'PROG_RED', 'PROG_GREEN', 'PROG_YELLOW', 'PROG_BLUE',
  // --- Other ---
  'BUTTON_MODE', 'EXPLORER', 'SETTINGS', 'SEARCH', 'ASSIST', 'POWER',
  'MEDIA_AUDIO_TRACK',
  // --- Legacy `androidtv` (ADB) aliases (not in androidtv_remote docs) ---
  'UP', 'DOWN', 'LEFT', 'RIGHT', 'CENTER',
  'ESCAPE', 'END', 'TOP', 'MOVE_HOME', 'PAIRING', 'TEXT',
  'SLEEP', 'WAKEUP', 'RESUME', 'SUSPEND',
  'PLAY', 'PAUSE', 'REWIND', 'FAST_FORWARD',
  'RED', 'GREEN', 'YELLOW', 'BLUE',
  'INPUT', 'HDMI1', 'HDMI2', 'HDMI3', 'HDMI4',
  'COMPONENT1', 'COMPONENT2', 'COMPOSITE1', 'COMPOSITE2', 'SAT', 'VGA',
  'SYSDOWN', 'SYSUP', 'SYSLEFT', 'SYSRIGHT',
];

// Returns the command list to suggest for a given remote entity, or null
// when no live HA state is available (GitHub Pages / HA offline). Prefers
// the entity's own `commands_list` attribute when present; otherwise falls
// back to the built-in Android TV keymap.
function remoteCommandSuggestions(entityId) {
  if (haStates && entityId) {
    const ent = haStates[entityId];
    const list = ent && ent.attributes && ent.attributes.commands_list;
    if (Array.isArray(list) && list.length) return list;
  }
  return ANDROID_TV_COMMANDS;
}

// Build (or rebuild) the <datalist> of command suggestions for #hkCommand
// based on the currently-entered entity ID. Called on entity input.
function refreshRemoteCommandDatalist() {
  const dl = document.getElementById('hkCommandList');
  if (!dl) return;
  const entityId = document.getElementById('hkEntityId') ? document.getElementById('hkEntityId').value.trim() : '';
  const suggestions = remoteCommandSuggestions(entityId) || [];
  dl.innerHTML = suggestions.map((c) => `<option value="${c}">`).join('');
}

function updateHotkeyActionInputs() {
  const action = document.getElementById('hkAction').value;
  const container = document.getElementById('dynamicHotkeyInputs');
  if (action === 'page') {
    container.innerHTML = `<label>${I18N.t('web_hotkey_target_page_label')}</label><input type="text" id="hkPage" placeholder="${I18N.t('web_hotkey_target_page_ph')}">`;
  } else if (action === 'openOverlay') {
    container.innerHTML = `
      <label>${I18N.t('web_hotkey_overlay_label')}</label>
      <select id="hkOverlay">
        <option value="settings">${I18N.t('web_hotkey_overlay_settings')}</option>
        <option value="activities">${I18N.t('web_hotkey_overlay_activities')}</option>
      </select>
    `;
  } else if (action === 'openCurrentActivity') {
    container.innerHTML = `
      <label>${I18N.t('web_hotkey_room_label')}</label><input type="text" id="hkActivityRoom" placeholder="${I18N.t('web_hotkey_room_ph')}">
      <div class="hint" style="margin-top:4px">${I18N.t('web_hotkey_room_hint')}</div>
    `;
  } else if (action === 'service') {
    container.innerHTML = `
      <label>${I18N.t('web_hotkey_service_label')}</label><input type="text" id="hkService" placeholder="${I18N.t('web_hotkey_service_ph')}">
      <label>${I18N.t('web_hotkey_entity_label')}</label><input type="text" id="hkEntityId" placeholder="${I18N.t('web_hotkey_entity_ph')}">
      <label>${I18N.t('web_hotkey_data_label')}</label><input type="text" id="hkData" placeholder='{"brightness": 255}'>
    `;
  } else if (action === 'remoteCommand') {
    container.innerHTML = `
      <label>${I18N.t('web_hotkey_remote_entity_label')}</label><input type="text" id="hkEntityId" placeholder="${I18N.t('web_hotkey_remote_entity_ph')}" oninput="refreshRemoteCommandDatalist()">
      <label>${I18N.t('web_hotkey_command_label')}</label>
      <input type="text" id="hkCommand" placeholder="${I18N.t('web_hotkey_command_ph')}" list="hkCommandList">
      <datalist id="hkCommandList"></datalist>
      <div class="hint">${I18N.t('web_hotkey_remote_hint')}</div>
    `;
    attachEntityAutocomplete(document.getElementById('hkEntityId'), 'remote');
    refreshRemoteCommandDatalist();
  } else if (action === 'harmonyCommand') {
    if (harmonyAvailable) {
      renderHarmonyHubSelect(container, 'command', 'hk');
    } else {
      container.innerHTML = `
        <label>${I18N.t('web_hotkey_harmony_device_label')}</label><input type="text" id="hkDevice" placeholder="${I18N.t('web_hotkey_harmony_device_ph')}">
        <label>${I18N.t('web_hotkey_harmony_command_label')}</label><input type="text" id="hkCommand" placeholder="${I18N.t('web_hotkey_harmony_command_ph')}">
      `;
    }
  } else if (action === 'harmonyActivity') {
    if (harmonyAvailable) {
      renderHarmonyHubSelect(container, 'activity', 'hk');
    } else {
      container.innerHTML = `<label>${I18N.t('web_hotkey_harmony_activity_label')}</label><input type="text" id="hkActivityId" placeholder="${I18N.t('web_hotkey_harmony_activity_ph')}">`;
    }
  }
}

function describeHotkey(h) {
  if (h.page) return I18N.t('web_hotkey_desc_page', h.page);
  if (h.openOverlay) return h.openOverlay === 'activities' ? I18N.t('web_hotkey_desc_overlay_activities') : I18N.t('web_hotkey_desc_overlay_settings');
  if (h.openCurrentActivityRoom) return I18N.t('web_hotkey_desc_current_activity', h.openCurrentActivityRoom);
  if (h.service === 'remote.send_command') {
    const cmd = h.data && h.data.command ? h.data.command : '?';
    return I18N.t('web_hotkey_desc_remote', h.entityId || '?', cmd);
  }
  if (h.service) return h.entityId ? I18N.t('web_hotkey_desc_service', h.service, h.entityId) : I18N.t('web_hotkey_desc_service_plain', h.service);
  if (h.harmonyCommand) return I18N.t('web_hotkey_desc_harmony', h.harmonyDevice || '?', h.harmonyCommand);
  if (h.harmonyActivity) return I18N.t('web_hotkey_desc_harmony_activity', h.harmonyActivity);
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

  addRows(dashboardData.hotkeys, 'global', 'hotkeys', I18N.t('web_hotkey_scope_global'));
  addRows(dashboardData.longHotkeys, 'global', 'longHotkeys', I18N.t('web_hotkey_scope_global_long'));
  addRows(page.hotkeys, 'page', 'hotkeys', I18N.t('web_hotkey_scope_page'));
  addRows(page.longHotkeys, 'page', 'longHotkeys', I18N.t('web_hotkey_scope_page_long'));

  if (!container.innerHTML.trim()) container.innerHTML = `<div class="hint">${I18N.t('web_hotkey_none')}</div>`;

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
  const action = h.page ? 'page' : h.openOverlay ? 'openOverlay' : h.openCurrentActivityRoom ? 'openCurrentActivity' : h.service === 'remote.send_command' ? 'remoteCommand' : h.service ? 'service' : h.harmonyCommand ? 'harmonyCommand' : 'harmonyActivity';
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
  } else if (action === 'remoteCommand') {
    document.getElementById('hkEntityId').value = h.entityId || '';
    document.getElementById('hkCommand').value = (h.data && h.data.command) || '';
    refreshRemoteCommandDatalist();
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

  document.getElementById('addHotkeyBtn').innerText = I18N.t('web_save_changes');
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
  document.getElementById('addHotkeyBtn').innerText = I18N.t('web_hotkey_add');
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
    if (!room) { alert(I18N.t('web_hotkey_err_room')); return; }
    hkObj.openCurrentActivityRoom = room;
  } else if (action === 'service') {
    hkObj.service = document.getElementById('hkService').value.trim();
    const entityId = document.getElementById('hkEntityId').value.trim();
    if (entityId) hkObj.entityId = entityId;
    const rawData = document.getElementById('hkData').value.trim();
    if (rawData) {
      try { hkObj.data = JSON.parse(rawData); } catch (e) { alert(I18N.t('web_hotkey_err_json')); return; }
    }
  } else if (action === 'remoteCommand') {
    const entityId = document.getElementById('hkEntityId').value.trim();
    const command = document.getElementById('hkCommand').value.trim();
    if (!entityId || !command) { alert(I18N.t('web_hotkey_err_remote')); return; }
    hkObj.service = 'remote.send_command';
    hkObj.entityId = entityId;
    hkObj.data = { command };
  } else if (action === 'harmonyCommand') {
    if (harmonyAvailable) {
      const hub = document.getElementById('hkHub').value.trim();
      const device = document.getElementById('hkDeviceSelect').value.trim();
      const command = document.getElementById('hkCommandSelect').value.trim();
      if (!hub || !device || !command) { alert(I18N.t('web_hotkey_err_harmony_command')); return; }
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
      if (!hub || !activityId) { alert(I18N.t('web_hotkey_err_harmony_activity')); return; }
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

// ---- Release badges (official + beta) ---------------------------------------
//
// All release-badge and hardware-key strings live in the shared i18n JSON
// (keys web_release_* / web_hwkey_* — see js/i18n.js); they're looked up
// through I18N.t() after I18N.ready resolves. applyUiI18n() also lives in
// js/i18n.js now.

async function fetchReleaseBadge(url, icon) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const asset = (data.assets || []).find(a => a.name.endsWith('.apk'));
    return `${icon} ${data.name || data.tag_name}` +
      (asset ? ` — <a href="${asset.browser_download_url}">${I18N.t('web_release_download_apk')}</a>` : '');
  } catch (e) {
    console.log('Release fetch failed', e);
    return null;
  }
}

async function loadStableBadge() {
  await I18N.ready;
  const badge = document.getElementById('stableBadge');
  if (!badge) return;
  badge.textContent = I18N.t('web_release_loading');
  const html = await fetchReleaseBadge(
    'https://api.github.com/repos/dckiller51/astrion-custom-dashboard/releases/latest', '✅'
  );
  badge.innerHTML = html || I18N.t('web_release_stable_unavailable');
}

async function toggleBetaBadge() {
  await I18N.ready;
  const on = document.getElementById('betaToggle').checked;
  const badge = document.getElementById('betaBadge');
  if (!on) { badge.style.display = 'none'; return; }
  badge.textContent = I18N.t('web_release_loading');
  badge.style.display = 'inline-block';
  const html = await fetchReleaseBadge(
    'https://api.github.com/repos/dckiller51/astrion-custom-dashboard/releases/tags/dev-latest', '🧪'
  );
  if (!html) {
    badge.innerHTML = I18N.t('web_release_beta_unavailable');
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
    badge.innerHTML = `${label} — <button type="button" onclick="installBetaUpdate(this)" style="padding:4px 10px;font-size:0.8rem">${I18N.t('web_release_install_to_device')}</button>`;
  } else {
    badge.innerHTML = html;
  }
}

async function installBetaUpdate(btn) {
  await I18N.ready;
  const original = btn.textContent;
  btn.textContent = I18N.t('web_release_installing');
  btn.disabled = true;
  try {
    const res = await fetch('/install-beta-update', { method: 'POST' });
    const text = await res.text();
    if (!res.ok) throw new Error(text || ('HTTP ' + res.status));
    showToast(I18N.t('web_release_install_started'));
  } catch (e) {
    showToast(I18N.t('web_release_install_failed') + e.message, 'error');
    btn.textContent = original;
    btn.disabled = false;
  }
}
