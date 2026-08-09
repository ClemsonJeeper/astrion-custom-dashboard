// ---- Hotkeys --------------------------------------------------------------

function updateHotkeyActionInputs() {
  const action = document.getElementById('hkAction').value;
  const container = document.getElementById('dynamicHotkeyInputs');
  if (action === 'page') {
    container.innerHTML = `<label>Target page name</label><input type="text" id="hkPage" placeholder="e.g., Media">`;
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
}

async function editHotkey(scope, listType, i) {
  const target = scope === 'global' ? dashboardData : dashboardData.pages[currentActivePage];
  const h = target[listType][i];
  editingHotkey = { scope, listType, i };

  document.getElementById('hkScope').value = scope;
  document.getElementById('hkType').value = listType;
  document.getElementById('hkKey').value = h.key;
  const action = h.page ? 'page' : h.service ? 'service' : h.harmonyCommand ? 'harmonyCommand' : 'harmonyActivity';
  document.getElementById('hkAction').value = action;
  updateHotkeyActionInputs();

  if (action === 'page') {
    document.getElementById('hkPage').value = h.page || '';
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
