// ---- Activities (composed) -----------------------------------------------
//
// Builds entries for dashboardData.activities: a composed AV Activity that
// orchestrates more than one device — the multi-device case a Harmony hub
// handles internally, reimplemented here so it also works for IR-only and
// mixed-source setups (see ActivityConfig's doc comment on the Kotlin side).
// A device in the list is sourced from EITHER a local IrDeviceConfig, a
// Harmony hub+device, or a bare Home Assistant entity id — mixable freely
// within one Activity.
//
// This is only for *composed* Activities. A single-device/single-action
// Activity doesn't need an entry here at all — just "track": true + "room"
// on a scene_grid item, same as an existing Harmony Activity picked via its
// activityId. See cards.js's scene_grid form for both paths.

let pendingActivityDevices = [];   // devices being assembled for the Activity currently being built/edited
let editingActivity = null;        // id of the Activity being edited, or null when creating a new one
let editingActivityDeviceIndex = null; // index within pendingActivityDevices being edited, or null when adding a new one

function irDevicesById() {
  return Object.fromEntries((dashboardData.irDevices || []).map(d => [d.id, d]));
}

// ---- the "add one device" sub-form ----------------------------------------

function onActDevSourceChange() {
  const source = document.getElementById('actDevSource').value;
  document.getElementById('actDevIrFields').style.display = source === 'ir' ? '' : 'none';
  document.getElementById('actDevHarmonyFields').style.display = source === 'harmony' ? '' : 'none';
  document.getElementById('actDevHaFields').style.display = source === 'ha' ? '' : 'none';
  document.getElementById('actDevPowerCommandFields').style.display = source === 'ha' ? 'none' : '';
}

function renderActDevIrDeviceOptions() {
  const sel = document.getElementById('actDevIrDevice');
  if (!sel) return;
  sel.innerHTML = '<option value="">— select a device —</option>' +
    (dashboardData.irDevices || []).map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

function fillCommandOptions(selectId, commandEntries) {
  // commandEntries: [[id, label], ...]
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— none —</option>' +
    commandEntries.map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
}

function onActDevIrDeviceChange() {
  const deviceId = document.getElementById('actDevIrDevice').value;
  const dev = irDevicesById()[deviceId];
  const entries = dev ? Object.entries(dev.commands).map(([id, c]) => [id, `${id} — ${c.label || id}`]) : [];
  ['actDevPowerOn', 'actDevPowerOff', 'actDevInput'].forEach(id => fillCommandOptions(id, entries));
}

async function onActDevHarmonyHubChange() {
  const hub = document.getElementById('actDevHarmonyHub').value;
  const deviceSel = document.getElementById('actDevHarmonyDevice');
  resetHarmonySelect(deviceSel, '— loading —');
  ['actDevPowerOn', 'actDevPowerOff', 'actDevInput'].forEach(id => fillCommandOptions(id, []));
  if (!hub) { resetHarmonySelect(deviceSel, '— select a hub first —'); return; }
  try {
    const data = await loadHarmonyConfig(hub);
    deviceSel.innerHTML = '<option value="">— select a device —</option>' +
      (data.devices || []).map(d => `<option value="${d.id}">${d.label}</option>`).join('');
    deviceSel.disabled = false;
  } catch (e) {
    deviceSel.innerHTML = '<option value="">(failed to load)</option>';
    console.error('Failed to load Harmony config for device picker', e);
  }
}

function onActDevHarmonyDeviceChange() {
  const hub = document.getElementById('actDevHarmonyHub').value;
  const deviceId = document.getElementById('actDevHarmonyDevice').value;
  const data = harmonyConfigCache[hub];
  const device = data && (data.devices || []).find(d => d.id === deviceId);
  const entries = device ? device.commands.map(c => [c.name, c.label || c.name]) : [];
  ['actDevPowerOn', 'actDevPowerOff', 'actDevInput'].forEach(id => fillCommandOptions(id, entries));
}

function renderActDevSubForm() {
  const container = document.getElementById('actDevFields');
  if (!container) return;
  container.innerHTML = `
    <label>Source</label>
    <select id="actDevSource" onchange="onActDevSourceChange()">
      <option value="ir">Local IR device</option>
      <option value="harmony">Harmony device</option>
      <option value="ha">Home Assistant entity</option>
    </select>

    <div id="actDevIrFields">
      <label>IR device</label>
      <select id="actDevIrDevice" onchange="onActDevIrDeviceChange()"></select>
      ${(dashboardData.irDevices || []).length === 0 ? '<div class="hint">No IR devices yet — create one in the "IR Devices" section, then come back here.</div>' : ''}
    </div>
    <div id="actDevHarmonyFields" style="display:none"></div>
    <div id="actDevHaFields" style="display:none">
      <label>Entity id</label>
      <input type="text" id="actDevEntityId" placeholder="media_player.salon_ampli">
      <label>Source (optional, passed to media_player.select_source)</label>
      <input type="text" id="actDevInputSource" placeholder="e.g. Apple TV">
    </div>

    <div id="actDevPowerCommandFields">
      <label>Power-on command (optional)</label>
      <select id="actDevPowerOn"><option value="">— none —</option></select>
      <label>Power-off command (optional)</label>
      <select id="actDevPowerOff"><option value="">— none —</option></select>
      <label>Input/source command (optional — sent after power-on, or on its own if the device is shared with the outgoing Activity)</label>
      <select id="actDevInput"><option value="">— none —</option></select>
    </div>

    <label><input type="checkbox" id="actDevPowerOnFirst" checked> Power on when this Activity starts (uncheck for an always-on device, e.g. a receiver you never turn off)</label>
    <label><input type="checkbox" id="actDevPowerOffOnExit" checked> Power off when this Activity ends and another one takes the room</label>
    <label>Delay before the next device (ms)</label>
    <input type="number" id="actDevDelay" value="0" min="0">

    <div style="margin-top:8px">
      <button type="button" id="actDevAddBtn" class="secondary" onclick="addActivityDevice()">${editingActivityDeviceIndex !== null ? 'Update device' : '+ Add device to this Activity'}</button>
      <button type="button" id="actDevCancelBtn" class="secondary" style="display:${editingActivityDeviceIndex !== null ? '' : 'none'}" onclick="cancelActivityDeviceEdit()">Cancel</button>
    </div>
  `;
  if (harmonyAvailable) {
    renderHarmonyHubSelect(document.getElementById('actDevHarmonyFields'), 'device', 'actDev');
    // renderHarmonyHubSelect wires up its own #actDevHub/#actDevDeviceSelect
    // ids (the 'device' mode from harmony.js) — rename handlers so this
    // file's onActDev* functions above (which use actDevHarmonyHub/
    // actDevHarmonyDevice ids) actually get called instead of harmony.js's
    // own onHarmonyHubChange/onHarmonyDeviceChange.
    const hubSel = document.getElementById('actDevHub');
    const devSel = document.getElementById('actDevDeviceSelect');
    if (hubSel) { hubSel.id = 'actDevHarmonyHub'; hubSel.onchange = onActDevHarmonyHubChange; }
    if (devSel) { devSel.id = 'actDevHarmonyDevice'; devSel.onchange = onActDevHarmonyDeviceChange; }
  } else {
    document.getElementById('actDevHarmonyFields').innerHTML =
      '<div class="hint">No Harmony hub reachable from this builder session — configure one in the app first, or use a local IR device / HA entity instead.</div>';
  }
  renderActDevIrDeviceOptions();
  onActDevSourceChange();
}

function deviceLabel(d) {
  if (d.source === 'ir') return `${irDevicesById()[d.deviceId]?.name || d.deviceId} (IR)`;
  if (d.source === 'harmony') return `${d.deviceId} (Harmony)`;
  return `${d.deviceId} (HA)`;
}

async function editActivityDevice(i) {
  const d = pendingActivityDevices[i];
  if (!d) return;
  editingActivityDeviceIndex = i;
  renderActDevSubForm(); // rebuilds blank fields with the "Update device"/Cancel buttons now shown

  document.getElementById('actDevSource').value = d.source;
  onActDevSourceChange();

  if (d.source === 'ir') {
    document.getElementById('actDevIrDevice').value = d.deviceId;
    onActDevIrDeviceChange();
  } else if (d.source === 'harmony') {
    const hubSel = document.getElementById('actDevHarmonyHub');
    if (hubSel) {
      hubSel.value = d.hub || '';
      await onActDevHarmonyHubChange();
      const devSel = document.getElementById('actDevHarmonyDevice');
      if (devSel) { devSel.value = d.deviceId; onActDevHarmonyDeviceChange(); }
    }
  } else {
    document.getElementById('actDevEntityId').value = d.deviceId;
    document.getElementById('actDevInputSource').value = d.inputCommand || '';
  }

  if (d.source !== 'ha') {
    document.getElementById('actDevPowerOn').value = d.powerOnCommand || '';
    document.getElementById('actDevPowerOff').value = d.powerOffCommand || '';
    document.getElementById('actDevInput').value = d.inputCommand || '';
  }
  document.getElementById('actDevPowerOnFirst').checked = d.powerOnFirst !== false;
  document.getElementById('actDevPowerOffOnExit').checked = d.powerOffOnExit !== false;
  document.getElementById('actDevDelay').value = d.delayAfterMs || 0;
}

function cancelActivityDeviceEdit() {
  editingActivityDeviceIndex = null;
  renderActDevSubForm();
}

function addActivityDevice() {
  const source = document.getElementById('actDevSource').value;
  let deviceId, hub = null;
  if (source === 'ir') {
    deviceId = document.getElementById('actDevIrDevice').value;
    if (!deviceId) { alert('Pick an IR device.'); return; }
  } else if (source === 'harmony') {
    hub = document.getElementById('actDevHarmonyHub')?.value;
    deviceId = document.getElementById('actDevHarmonyDevice')?.value;
    if (!hub || !deviceId) { alert('Pick a Harmony hub and device.'); return; }
  } else {
    deviceId = document.getElementById('actDevEntityId').value.trim();
    if (!deviceId) { alert('Enter an entity id.'); return; }
  }

  const powerOnCommand = source !== 'ha' ? (document.getElementById('actDevPowerOn').value || null) : null;
  const powerOffCommand = source !== 'ha' ? (document.getElementById('actDevPowerOff').value || null) : null;
  const inputCommand = source === 'ha'
    ? (document.getElementById('actDevInputSource')?.value.trim() || null)
    : (document.getElementById('actDevInput').value || null);
  const powerOnFirst = document.getElementById('actDevPowerOnFirst').checked;
  const powerOffOnExit = document.getElementById('actDevPowerOffOnExit').checked;
  const delayAfterMs = parseInt(document.getElementById('actDevDelay').value, 10) || 0;

  if (source !== 'ha' && !powerOnCommand && !powerOffCommand && !inputCommand) {
    if (!confirm('This device has no power-on, power-off, or input command set — it won\'t do anything when the Activity runs. Add it anyway?')) return;
  }

  const device = {
    deviceId, source,
    ...(hub ? { hub } : {}),
    ...(powerOnCommand ? { powerOnCommand } : {}),
    ...(powerOffCommand ? { powerOffCommand } : {}),
    ...(inputCommand ? { inputCommand } : {}),
    ...(powerOnFirst ? {} : { powerOnFirst: false }),
    ...(powerOffOnExit ? {} : { powerOffOnExit: false }),
    ...(delayAfterMs ? { delayAfterMs } : {}),
  };

  if (editingActivityDeviceIndex !== null) {
    pendingActivityDevices[editingActivityDeviceIndex] = device;
    editingActivityDeviceIndex = null;
  } else {
    pendingActivityDevices.push(device);
  }
  renderActDevSubForm();
  renderActivityDevicesList();
  refreshActVolumeDeviceOptions();
}

function removeActivityDevice(i) {
  pendingActivityDevices.splice(i, 1);
  if (editingActivityDeviceIndex === i) {
    editingActivityDeviceIndex = null;
    renderActDevSubForm();
  } else if (editingActivityDeviceIndex !== null && i < editingActivityDeviceIndex) {
    editingActivityDeviceIndex--;
  }
  renderActivityDevicesList();
  refreshActVolumeDeviceOptions();
}

function renderActivityDevicesList() {
  const list = document.getElementById('actDevicesList');
  if (!list) return;
  if (!pendingActivityDevices.length) {
    list.innerHTML = '<div class="hint">No devices yet — add one above.</div>';
    return;
  }
  list.innerHTML = '';
  pendingActivityDevices.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    const warn = (d.source !== 'ha' && !d.powerOnCommand && !d.powerOffCommand && !d.inputCommand)
      ? ' <span style="color:#e5984a">(no commands set!)</span>' : '';
    el.innerHTML = `<span>${deviceLabel(d)}${d.inputCommand ? ' → ' + d.inputCommand : ''}${warn}</span><span><span class="remove" style="color:#00E5FF" onclick="editActivityDevice(${i})">✎</span> <span class="remove" onclick="removeActivityDevice(${i})">✕</span></span>`;
    list.appendChild(el);
  });
}

function refreshActVolumeDeviceOptions() {
  const sel = document.getElementById('actVolumeDeviceId');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— none —</option>' +
    pendingActivityDevices.map(d => `<option value="${d.deviceId}">${deviceLabel(d)}</option>`).join('');
  sel.value = pendingActivityDevices.some(d => d.deviceId === current) ? current : '';
}

// ---- saving / editing / removing Activities --------------------------------

function renderActivitiesList() {
  const list = document.getElementById('activitiesList');
  if (!list) return;
  list.innerHTML = '';
  const byRoom = {};
  (dashboardData.activities || []).forEach(act => { (byRoom[act.room] = byRoom[act.room] || []).push(act); });
  Object.keys(byRoom).sort().forEach(room => {
    const heading = document.createElement('div');
    heading.className = 'list-group-heading';
    heading.textContent = room;
    list.appendChild(heading);
    byRoom[room].forEach(act => {
      const el = document.createElement('div');
      el.className = 'list-item';
      el.innerHTML = `<span>${act.name} <span style="color:#888">(${act.devices.length} device${act.devices.length === 1 ? '' : 's'})</span></span><span><span class="remove" style="color:#00E5FF" onclick="editActivity('${act.id}')">✎</span> <span class="remove" onclick="removeActivity('${act.id}')">✕</span></span>`;
      list.appendChild(el);
    });
  });
}

function saveActivity() {
  const name = document.getElementById('actName').value.trim();
  const room = document.getElementById('actRoom').value.trim();
  const icon = document.getElementById('actIcon').value.trim();
  const page = document.getElementById('actPage').value.trim();
  const volumeDeviceId = document.getElementById('actVolumeDeviceId').value || null;

  if (!name) { alert('Give this Activity a name.'); return; }
  if (!room) { alert('An Activity needs a room — that\'s what makes it exclusive at runtime.'); return; }
  if (!pendingActivityDevices.length) { alert('Add at least one device.'); return; }

  dashboardData.activities = dashboardData.activities || [];
  const payload = {
    name, room,
    ...(icon ? { icon } : {}),
    ...(page ? { page } : {}),
    devices: pendingActivityDevices,
    ...(volumeDeviceId ? { volumeDeviceId } : {}),
  };

  if (editingActivity !== null) {
    const idx = dashboardData.activities.findIndex(a => a.id === editingActivity);
    if (idx >= 0) dashboardData.activities[idx] = { ...dashboardData.activities[idx], ...payload };
  } else {
    const id = slugify(name, 'activity');
    let uniqueId = id;
    let n = 2;
    while (dashboardData.activities.some(a => a.id === uniqueId)) uniqueId = `${id}_${n++}`;
    dashboardData.activities.push({ id: uniqueId, ...payload });
  }
  cancelActivityEdit();
  renderActivitiesList();
  updateCardFormInputs(); // refreshes the composed-Activity picker inside the scene_grid form, if open
  updateJsonOutput();
}

function editActivity(id) {
  const act = (dashboardData.activities || []).find(a => a.id === id);
  if (!act) return;
  editingActivity = id;
  editingActivityDeviceIndex = null;
  document.getElementById('actName').value = act.name;
  document.getElementById('actRoom').value = act.room;
  document.getElementById('actIcon').value = act.icon || '';
  updateIconThumb('actIcon');
  document.getElementById('actPage').value = act.page || '';
  pendingActivityDevices = JSON.parse(JSON.stringify(act.devices));
  renderActDevSubForm();
  renderActivityDevicesList();
  refreshActVolumeDeviceOptions();
  document.getElementById('actVolumeDeviceId').value = act.volumeDeviceId || '';
  document.getElementById('saveActivityBtn').textContent = 'Save Activity';
  document.getElementById('cancelActivityEditBtn').style.display = '';
}

function cancelActivityEdit() {
  editingActivity = null;
  editingActivityDeviceIndex = null;
  pendingActivityDevices = [];
  ['actName', 'actRoom', 'actIcon', 'actPage'].forEach(id => { document.getElementById(id).value = ''; });
  updateIconThumb('actIcon');
  renderActDevSubForm();
  renderActivityDevicesList();
  refreshActVolumeDeviceOptions();
  document.getElementById('saveActivityBtn').textContent = 'Save Activity';
  document.getElementById('cancelActivityEditBtn').style.display = 'none';
}

function removeActivity(id) {
  dashboardData.activities = (dashboardData.activities || []).filter(a => a.id !== id);
  if (editingActivity === id) cancelActivityEdit();
  renderActivitiesList();
  updateCardFormInputs();
  updateJsonOutput();
}


document.getElementById('actIconField').innerHTML = iconFieldHtml('actIcon');
renderActivityDevicesList();
renderActivitiesList();
// Renders once immediately (harmonyAvailable is false pre-fetch, so this
// paints the IR/HA fields right away), then again once the hub list has
// actually loaded, so the Harmony device picker doesn't stay stuck on "no
// hub reachable" if a hub answers just a beat after page load.
renderActDevSubForm();
harmonyHubsReady.then(renderActDevSubForm);
