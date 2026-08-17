// ---- Activities (composed) — step-by-step wizard --------------------------
//
// Builds entries for dashboardData.activities: a composed AV Activity that
// orchestrates more than one device — the multi-device case a Harmony hub
// handles internally, reimplemented here so it also works for IR-only and
// mixed-source setups (see ActivityConfig's doc comment on the Kotlin side).
// A device is sourced from EITHER a local IrDeviceConfig, a Harmony
// hub+device, or a bare Home Assistant entity id — mixable freely within one
// Activity.
//
// The wizard mirrors Logitech Harmony's own Activity setup flow (type ->
// name/icon -> pick devices -> which one controls volume -> pick an input
// per device), one screen at a time, rather than one long form.
//
// This is only for *composed* Activities. A single-device/single-action
// Activity doesn't need this at all — just "track": true + "room" on a
// scene_grid item, same as an existing Harmony Activity picked via its
// activityId. See cards.js's scene_grid form for both paths.

const ACTIVITY_TYPES = [
  { id: 'watch_tv', label: 'Watch TV' },
  { id: 'watch_movie', label: 'Watch a Movie' },
  { id: 'listen_music', label: 'Listen to Music' },
  { id: 'smart_tv', label: 'Smart TV' },
  { id: 'netflix', label: 'Netflix' },
  { id: 'custom', label: 'Custom' },
];

let wizard = null; // null when the wizard modal is closed; see startActivityWizard()

function irDevicesById() {
  return Object.fromEntries((dashboardData.irDevices || []).map(d => [d.id, d]));
}

function deviceRefLabel(ref) {
  if (ref.source === 'ir') return `${irDevicesById()[ref.deviceId]?.name || ref.deviceId} (IR)`;
  if (ref.source === 'harmony') return `${ref.deviceLabel || ref.deviceId} (Harmony)`;
  return `${ref.deviceId} (HA)`;
}

const WIZARD_STEP_LABELS = {
  type: 'What kind of Activity?',
  info: 'Name & room',
  devices: 'Devices',
  configure: 'Configure device',
  volume: 'Volume',
  volumeCommands: 'Volume commands',
  review: 'Review',
};

// ---- opening / closing / navigating the wizard -----------------------------

function startActivityWizard(editId) {
  const existing = editId ? (dashboardData.activities || []).find(a => a.id === editId) : null;
  wizard = {
    editingId: existing ? existing.id : null,
    phase: existing ? 'info' : 'type', // editing an existing Activity skips the "type" picker
    type: null,
    name: existing?.name || '',
    room: existing?.room || '',
    icon: existing?.icon || '',
    page: existing?.page || '',
    // deviceRefs: [{source, deviceId, hub?, deviceLabel?}] — selection only, no commands yet
    deviceRefs: existing ? existing.devices.map(d => ({ source: d.source, deviceId: d.deviceId, hub: d.hub })) : [],
    // deviceConfig[i] matches deviceRefs[i]: {powerOnCommand, powerOffCommand, inputCommand, powerOnFirst, powerOffOnExit, delayAfterMs}
    deviceConfig: existing ? existing.devices.map(d => ({
      powerOnCommand: d.powerOnCommand || null,
      powerOffCommand: d.powerOffCommand || null,
      inputCommand: d.inputCommand || null,
      powerOnFirst: d.powerOnFirst !== false,
      powerOffOnExit: d.powerOffOnExit !== false,
      delayAfterMs: d.delayAfterMs || 0,
    })) : [],
    configureIndex: 0,
    volumeDeviceId: existing?.volumeDeviceId || null,
    volumeUpCommand: existing?.volumeUpCommand || null,
    volumeDownCommand: existing?.volumeDownCommand || null,
    muteCommand: existing?.muteCommand || null,
  };
  document.getElementById('activityWizardModal').classList.add('open');
  renderWizard();
}

function closeActivityWizard() {
  wizard = null;
  document.getElementById('activityWizardModal').classList.remove('open');
}

function volumeDeviceRef() {
  return wizard.deviceRefs.find(r => r.deviceId === wizard.volumeDeviceId) || null;
}

// Volume commands only make sense for ir/harmony (named commands to pick
// from); an "ha" volume device always uses the fixed media_player.volume_up/
// volume_down/volume_mute services (see applyVolumeHotkeysToPage), so that
// phase is skipped entirely for it.
function needsVolumeCommandsPhase() {
  const ref = volumeDeviceRef();
  return !!ref && ref.source !== 'ha';
}

function wizardNext() {
  const phase = wizard.phase;
  if (phase === 'info') {
    wizard.name = document.getElementById('wizName').value.trim();
    wizard.room = document.getElementById('wizRoom').value.trim();
    wizard.icon = document.getElementById('wizIcon').value.trim();
    wizard.page = document.getElementById('wizPage').value.trim();
    if (!wizard.name) { alert('Give this Activity a name.'); return; }
    if (!wizard.room) { alert('An Activity needs a room — that\'s what makes it exclusive at runtime.'); return; }
    wizard.phase = 'devices';
  } else if (phase === 'devices') {
    if (!wizard.deviceRefs.length) { alert('Add at least one device.'); return; }
    wizard.configureIndex = 0;
    wizard.phase = 'configure';
  } else if (phase === 'configure') {
    saveCurrentDeviceConfig();
    if (wizard.configureIndex < wizard.deviceRefs.length - 1) {
      wizard.configureIndex++;
    } else {
      wizard.phase = 'volume';
    }
  } else if (phase === 'volume') {
    wizard.volumeDeviceId = document.getElementById('wizVolumeDevice').value || null;
    wizard.phase = needsVolumeCommandsPhase() ? 'volumeCommands' : 'review';
  } else if (phase === 'volumeCommands') {
    wizard.volumeUpCommand = document.getElementById('wizVolUp')?.value || null;
    wizard.volumeDownCommand = document.getElementById('wizVolDown')?.value || null;
    wizard.muteCommand = document.getElementById('wizMute')?.value || null;
    wizard.phase = 'review';
  }
  renderWizard();
}

function wizardBack() {
  const phase = wizard.phase;
  if (phase === 'configure' && wizard.configureIndex > 0) {
    saveCurrentDeviceConfig();
    wizard.configureIndex--;
  } else if (phase === 'configure') {
    wizard.phase = 'devices';
  } else if (phase === 'info' && wizard.editingId) {
    // Editing an existing Activity skipped 'type' — Back from 'info' just closes.
    closeActivityWizard();
    return;
  } else if (phase === 'info') {
    wizard.phase = 'type';
  } else if (phase === 'devices') {
    wizard.phase = 'info';
  } else if (phase === 'volume') {
    wizard.configureIndex = wizard.deviceRefs.length - 1;
    wizard.phase = 'configure';
  } else if (phase === 'volumeCommands') {
    wizard.phase = 'volume';
  } else if (phase === 'review') {
    wizard.phase = needsVolumeCommandsPhase() ? 'volumeCommands' : 'volume';
  }
  renderWizard();
}

function saveCurrentDeviceConfig() {
  const source = wizard.deviceRefs[wizard.configureIndex].source;
  wizard.deviceConfig[wizard.configureIndex] = {
    powerOnCommand: source !== 'ha' ? (document.getElementById('wizPowerOn')?.value || null) : null,
    powerOffCommand: source !== 'ha' ? (document.getElementById('wizPowerOff')?.value || null) : null,
    inputCommand: source === 'ha'
      ? (document.getElementById('wizInputText')?.value.trim() || null)
      : (document.getElementById('wizInput')?.value || null),
    powerOnFirst: document.getElementById('wizPowerOnFirst')?.checked !== false,
    powerOffOnExit: document.getElementById('wizPowerOffOnExit')?.checked !== false,
    delayAfterMs: parseInt(document.getElementById('wizDelay')?.value, 10) || 0,
  };
}

// ---- rendering each phase --------------------------------------------------

function renderWizard() {
  if (!wizard) return;
  const phase = wizard.phase;
  document.getElementById('wizStepLabel').textContent = WIZARD_STEP_LABELS[phase] || phase;
  document.getElementById('activityWizardTitle').textContent = wizard.editingId ? `Edit Activity: ${wizard.name}` : 'New Activity';

  const body = document.getElementById('wizBody');
  const renderers = {
    type: renderWizardType,
    info: renderWizardInfo,
    devices: renderWizardDevices,
    configure: renderWizardConfigure,
    volume: renderWizardVolume,
    volumeCommands: renderWizardVolumeCommands,
    review: renderWizardReview,
  };
  body.innerHTML = renderers[phase]();
  wireWizardPhase(phase);

  document.getElementById('wizBackBtn').style.display = (phase === 'type') ? 'none' : '';
  document.getElementById('wizNextBtn').style.display = (phase === 'review' || phase === 'type') ? 'none' : '';
  document.getElementById('wizSaveBtn').style.display = (phase === 'review') ? '' : 'none';
}

function renderWizardType() {
  return `
    <div class="hint">What is this Activity for? (just picks a starting name — everything else is up to you)</div>
    <div class="btn-row" style="flex-wrap:wrap;margin-top:10px">
      ${ACTIVITY_TYPES.map(t => `<button type="button" class="secondary" onclick="pickActivityType('${t.id}')">${t.label}</button>`).join('')}
    </div>
  `;
}

function renderWizardInfo() {
  return `
    <label>Name</label>
    <input type="text" id="wizName" value="${wizard.name}" placeholder="e.g., Apple TV">
    <label>Room</label>
    <input type="text" id="wizRoom" value="${wizard.room}" placeholder="e.g., Living Room">
    <div id="wizIconField"></div>
    <label>Page to open when this Activity starts (optional)</label>
    <input type="text" id="wizPage" value="${wizard.page}" placeholder="e.g., Apple TV">
  `;
}

function renderWizardDevices() {
  const irDevices = dashboardData.irDevices || [];
  const selectedIrIds = new Set(wizard.deviceRefs.filter(r => r.source === 'ir').map(r => r.deviceId));
  return `
    <div class="hint">Which devices does this Activity involve? You'll pick an input/command for each on the next screens.</div>

    <h3>Local IR devices</h3>
    ${irDevices.length === 0 ? '<div class="hint">No IR devices yet — create one in the "IR Devices" section, then reopen this wizard.</div>' :
      irDevices.map(d => `
        <label class="inline-check">
          <input type="checkbox" ${selectedIrIds.has(d.id) ? 'checked' : ''} onchange="toggleIrDeviceRef('${d.id}', this.checked)">
          ${d.name}
        </label>
      `).join('')}

    <h3 style="margin-top:14px">Harmony device</h3>
    <div id="wizHarmonyAddFields"></div>

    <h3 style="margin-top:14px">Home Assistant entity</h3>
    <input type="text" id="wizHaEntityId" placeholder="media_player.salon_ampli">
    <div class="btn-row" style="margin-top:6px">
      <button type="button" class="secondary" onclick="addHaDeviceRef()">+ Add HA entity</button>
    </div>

    <h3 style="margin-top:14px">Selected devices</h3>
    <div id="wizDeviceRefsList"></div>
  `;
}

function renderWizardConfigure() {
  const ref = wizard.deviceRefs[wizard.configureIndex];
  const cfg = wizard.deviceConfig[wizard.configureIndex] || {};
  const n = wizard.configureIndex + 1;
  const total = wizard.deviceRefs.length;
  return `
    <div class="hint">Device ${n} of ${total}: <strong>${deviceRefLabel(ref)}</strong></div>

    ${ref.source === 'ha' ? `
      <label>Source (optional, passed to media_player.select_source)</label>
      <input type="text" id="wizInputText" value="${cfg.inputCommand || ''}" placeholder="e.g. Apple TV">
    ` : `
      <label>Power-on command (optional)</label>
      <select id="wizPowerOn"><option value="">— none —</option></select>
      <label>Power-off command (optional)</label>
      <select id="wizPowerOff"><option value="">— none —</option></select>
      <label>Input/source command (optional — sent after power-on, or on its own if this device is shared with the outgoing Activity)</label>
      <select id="wizInput"><option value="">— none —</option></select>
    `}

    <label class="inline-check" style="margin-top:10px"><input type="checkbox" id="wizPowerOnFirst" ${cfg.powerOnFirst !== false ? 'checked' : ''}> Power on when this Activity starts (uncheck for an always-on device)</label>
    <label class="inline-check"><input type="checkbox" id="wizPowerOffOnExit" ${cfg.powerOffOnExit !== false ? 'checked' : ''}> Power off when this Activity ends and another one takes the room</label>
    <label>Delay before the next device (ms)</label>
    <input type="number" id="wizDelay" value="${cfg.delayAfterMs || 0}" min="0">
  `;
}

function renderWizardVolume() {
  return `
    <div class="hint">Which device should VOLUME_UP/DOWN/MUTE target while this Activity is active?</div>
    <select id="wizVolumeDevice">
      <option value="">— none —</option>
      ${wizard.deviceRefs.map(r => `<option value="${r.deviceId}" ${wizard.volumeDeviceId === r.deviceId ? 'selected' : ''}>${deviceRefLabel(r)}</option>`).join('')}
    </select>
    <div class="hint" style="margin-top:8px">If this Activity has a "Page", these get written as page-scoped hotkeys on it (overriding whatever VOLUME_UP/DOWN/MUTE do elsewhere) once saved.</div>
  `;
}

function renderWizardVolumeCommands() {
  const ref = volumeDeviceRef();
  return `
    <div class="hint">Which commands on <strong>${deviceRefLabel(ref)}</strong> are volume up, volume down, and mute?</div>
    <label>Volume up</label>
    <select id="wizVolUp"><option value="">— none —</option></select>
    <label>Volume down</label>
    <select id="wizVolDown"><option value="">— none —</option></select>
    <label>Mute</label>
    <select id="wizMute"><option value="">— none —</option></select>
  `;
}

function renderWizardReview() {
  const noCmdCount = wizard.deviceRefs.filter((r, i) => {
    const c = wizard.deviceConfig[i] || {};
    return r.source !== 'ha' && !c.powerOnCommand && !c.powerOffCommand && !c.inputCommand;
  }).length;
  const volRef = volumeDeviceRef();
  let volLine = '';
  if (volRef) {
    volLine = volRef.source === 'ha'
      ? `Volume: ${deviceRefLabel(volRef)} (via media_player.volume_up/volume_down/volume_mute)`
      : `Volume: ${deviceRefLabel(volRef)} — up: ${wizard.volumeUpCommand || '—'}, down: ${wizard.volumeDownCommand || '—'}, mute: ${wizard.muteCommand || '—'}`;
    if (!wizard.page) volLine += ' — no "page" set on this Activity, so these won\'t be written anywhere as hotkeys yet.';
  }
  return `
    <div class="hint"><strong>${wizard.name}</strong> — ${wizard.room}${wizard.page ? ' — opens "' + wizard.page + '"' : ''}</div>
    <div id="wizReviewList" style="margin-top:10px"></div>
    ${volLine ? `<div class="hint" style="margin-top:8px">${volLine}</div>` : ''}
    ${noCmdCount > 0 ? `<div class="hint" style="color:#e5984a;margin-top:8px">${noCmdCount} device${noCmdCount === 1 ? '' : 's'} have no commands set — they won't do anything when this Activity runs.</div>` : ''}
  `;
}

// ---- phase-specific wiring (dropdowns, live handlers) ----------------------

function wireWizardPhase(phase) {
  if (phase === 'info') {
    document.getElementById('wizIconField').innerHTML = iconFieldHtml('wizIcon');
    document.getElementById('wizIcon').value = wizard.icon;
    updateIconThumb('wizIcon');
  } else if (phase === 'devices') {
    renderWizardDeviceRefsList();
    renderWizardHarmonyAddFields();
  } else if (phase === 'configure') {
    const ref = wizard.deviceRefs[wizard.configureIndex];
    const cfg = wizard.deviceConfig[wizard.configureIndex] || {};
    if (ref.source === 'ir') {
      const dev = irDevicesById()[ref.deviceId];
      const entries = dev ? Object.entries(dev.commands).map(([id, c]) => [id, `${id} — ${c.label || id}`]) : [];
      fillWizCommandOptions('wizPowerOn', entries);
      fillWizCommandOptions('wizPowerOff', entries);
      fillWizCommandOptions('wizInput', entries);
      document.getElementById('wizPowerOn').value = cfg.powerOnCommand || '';
      document.getElementById('wizPowerOff').value = cfg.powerOffCommand || '';
      document.getElementById('wizInput').value = cfg.inputCommand || '';
    } else if (ref.source === 'harmony') {
      loadHarmonyConfig(ref.hub).then(data => {
        const device = (data.devices || []).find(d => d.id === ref.deviceId);
        const entries = device ? device.commands.map(c => [c.name, c.label || c.name]) : [];
        fillWizCommandOptions('wizPowerOn', entries);
        fillWizCommandOptions('wizPowerOff', entries);
        fillWizCommandOptions('wizInput', entries);
        document.getElementById('wizPowerOn').value = cfg.powerOnCommand || '';
        document.getElementById('wizPowerOff').value = cfg.powerOffCommand || '';
        document.getElementById('wizInput').value = cfg.inputCommand || '';
      });
    }
  } else if (phase === 'volumeCommands') {
    const ref = volumeDeviceRef();
    if (ref.source === 'ir') {
      const dev = irDevicesById()[ref.deviceId];
      const entries = dev ? Object.entries(dev.commands).map(([id, c]) => [id, `${id} — ${c.label || id}`]) : [];
      fillWizCommandOptions('wizVolUp', entries);
      fillWizCommandOptions('wizVolDown', entries);
      fillWizCommandOptions('wizMute', entries);
      document.getElementById('wizVolUp').value = wizard.volumeUpCommand || '';
      document.getElementById('wizVolDown').value = wizard.volumeDownCommand || '';
      document.getElementById('wizMute').value = wizard.muteCommand || '';
    } else if (ref.source === 'harmony') {
      loadHarmonyConfig(ref.hub).then(data => {
        const device = (data.devices || []).find(d => d.id === ref.deviceId);
        const entries = device ? device.commands.map(c => [c.name, c.label || c.name]) : [];
        fillWizCommandOptions('wizVolUp', entries);
        fillWizCommandOptions('wizVolDown', entries);
        fillWizCommandOptions('wizMute', entries);
        document.getElementById('wizVolUp').value = wizard.volumeUpCommand || '';
        document.getElementById('wizVolDown').value = wizard.volumeDownCommand || '';
        document.getElementById('wizMute').value = wizard.muteCommand || '';
      });
    }
  } else if (phase === 'review') {
    renderWizardReviewList();
  }
}

function fillWizCommandOptions(selectId, commandEntries) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— none —</option>' +
    commandEntries.map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
}

function renderWizardHarmonyAddFields() {
  const container = document.getElementById('wizHarmonyAddFields');
  if (!harmonyAvailable) {
    container.innerHTML = '<div class="hint">No Harmony hub reachable from this builder session — configure one in the app first, or use a local IR device / HA entity instead.</div>';
    return;
  }
  container.innerHTML = `
    <select id="wizHarmonyHub"></select>
    <select id="wizHarmonyDevice"><option value="">— select a hub first —</option></select>
    <div class="btn-row" style="margin-top:6px">
      <button type="button" class="secondary" onclick="addHarmonyDeviceRef()">+ Add Harmony device</button>
    </div>
  `;
  renderHarmonyHubSelect(container, 'device', 'wizHarmonyStub');
  // renderHarmonyHubSelect wires its own #wizHarmonyStubHub/#wizHarmonyStubDeviceSelect —
  // swap them in for the placeholder selects above and rebind onchange to
  // this file's handler.
  const hubSel = document.getElementById('wizHarmonyStubHub');
  const devSel = document.getElementById('wizHarmonyStubDeviceSelect');
  if (hubSel) {
    document.getElementById('wizHarmonyHub').replaceWith(hubSel);
    hubSel.id = 'wizHarmonyHub';
    hubSel.onchange = onWizHarmonyHubChange;
  }
  if (devSel) {
    document.getElementById('wizHarmonyDevice').replaceWith(devSel);
    devSel.id = 'wizHarmonyDevice';
  }
}

async function onWizHarmonyHubChange() {
  const hub = document.getElementById('wizHarmonyHub').value;
  const deviceSel = document.getElementById('wizHarmonyDevice');
  resetHarmonySelect(deviceSel, '— loading —');
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

function renderWizardDeviceRefsList() {
  const list = document.getElementById('wizDeviceRefsList');
  if (!wizard.deviceRefs.length) {
    list.innerHTML = '<div class="hint">None yet.</div>';
    return;
  }
  list.innerHTML = '';
  wizard.deviceRefs.forEach((ref, i) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${deviceRefLabel(ref)}</span><span class="remove" onclick="removeDeviceRef(${i})">✕</span>`;
    list.appendChild(el);
  });
}

function renderWizardReviewList() {
  const list = document.getElementById('wizReviewList');
  list.innerHTML = '';
  wizard.deviceRefs.forEach((ref, i) => {
    const cfg = wizard.deviceConfig[i] || {};
    const parts = [];
    if (cfg.powerOnCommand) parts.push(`on: ${cfg.powerOnCommand}`);
    if (cfg.powerOffCommand) parts.push(`off: ${cfg.powerOffCommand}`);
    if (cfg.inputCommand) parts.push(`input: ${cfg.inputCommand}`);
    const isVolume = wizard.volumeDeviceId === ref.deviceId;
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${deviceRefLabel(ref)}${isVolume ? ' 🔊' : ''} <span style="color:#888">${parts.join(', ') || 'no commands'}</span></span>`;
    list.appendChild(el);
  });
}

// ---- device-selection actions (phase: 'devices') ---------------------------

function pickActivityType(typeId) {
  const type = ACTIVITY_TYPES.find(t => t.id === typeId);
  wizard.type = typeId;
  if (!wizard.name && type.id !== 'custom') wizard.name = type.label;
  wizard.phase = 'info';
  renderWizard();
}

function toggleIrDeviceRef(deviceId, checked) {
  if (checked) {
    wizard.deviceRefs.push({ source: 'ir', deviceId });
  } else {
    const i = wizard.deviceRefs.findIndex(r => r.source === 'ir' && r.deviceId === deviceId);
    if (i >= 0) wizard.deviceRefs.splice(i, 1);
  }
  renderWizardDeviceRefsList();
}

function addHarmonyDeviceRef() {
  const hub = document.getElementById('wizHarmonyHub')?.value;
  const deviceId = document.getElementById('wizHarmonyDevice')?.value;
  if (!hub || !deviceId) { alert('Pick a Harmony hub and device.'); return; }
  if (wizard.deviceRefs.some(r => r.source === 'harmony' && r.hub === hub && r.deviceId === deviceId)) {
    alert('That device is already added.');
    return;
  }
  const deviceLabel = document.getElementById('wizHarmonyDevice').selectedOptions[0]?.textContent || deviceId;
  wizard.deviceRefs.push({ source: 'harmony', deviceId, hub, deviceLabel });
  renderWizardDeviceRefsList();
}

function addHaDeviceRef() {
  const deviceId = document.getElementById('wizHaEntityId').value.trim();
  if (!deviceId) { alert('Enter an entity id.'); return; }
  if (wizard.deviceRefs.some(r => r.source === 'ha' && r.deviceId === deviceId)) {
    alert('That entity is already added.');
    return;
  }
  wizard.deviceRefs.push({ source: 'ha', deviceId });
  document.getElementById('wizHaEntityId').value = '';
  renderWizardDeviceRefsList();
}

function removeDeviceRef(i) {
  wizard.deviceRefs.splice(i, 1);
  wizard.deviceConfig.splice(i, 1);
  renderWizardDeviceRefsList();
}

// ---- saving / listing / removing Activities --------------------------------

function saveActivityWizard() {
  dashboardData.activities = dashboardData.activities || [];
  const devices = wizard.deviceRefs.map((ref, i) => {
    const cfg = wizard.deviceConfig[i] || {};
    return {
      deviceId: ref.deviceId,
      source: ref.source,
      ...(ref.hub ? { hub: ref.hub } : {}),
      ...(cfg.powerOnCommand ? { powerOnCommand: cfg.powerOnCommand } : {}),
      ...(cfg.powerOffCommand ? { powerOffCommand: cfg.powerOffCommand } : {}),
      ...(cfg.inputCommand ? { inputCommand: cfg.inputCommand } : {}),
      ...(cfg.powerOnFirst === false ? { powerOnFirst: false } : {}),
      ...(cfg.powerOffOnExit === false ? { powerOffOnExit: false } : {}),
      ...(cfg.delayAfterMs ? { delayAfterMs: cfg.delayAfterMs } : {}),
    };
  });
  const volRef = volumeDeviceRef();
  const payload = {
    name: wizard.name,
    room: wizard.room,
    ...(wizard.icon ? { icon: wizard.icon } : {}),
    ...(wizard.page ? { page: wizard.page } : {}),
    devices,
    ...(wizard.volumeDeviceId ? { volumeDeviceId: wizard.volumeDeviceId } : {}),
    ...(volRef && volRef.source !== 'ha' && wizard.volumeUpCommand ? { volumeUpCommand: wizard.volumeUpCommand } : {}),
    ...(volRef && volRef.source !== 'ha' && wizard.volumeDownCommand ? { volumeDownCommand: wizard.volumeDownCommand } : {}),
    ...(volRef && volRef.source !== 'ha' && wizard.muteCommand ? { muteCommand: wizard.muteCommand } : {}),
  };

  if (wizard.editingId) {
    const idx = dashboardData.activities.findIndex(a => a.id === wizard.editingId);
    if (idx >= 0) dashboardData.activities[idx] = { ...dashboardData.activities[idx], ...payload };
  } else {
    const id = slugify(wizard.name, 'activity');
    let uniqueId = id;
    let n = 2;
    while (dashboardData.activities.some(a => a.id === uniqueId)) uniqueId = `${id}_${n++}`;
    dashboardData.activities.push({ id: uniqueId, ...payload });
  }
  applyVolumeHotkeysToPage();
  closeActivityWizard();
  renderActivitiesList();
  updateCardFormInputs(); // refreshes the composed-Activity picker inside the scene_grid form, if open
  updateJsonOutput();
}

/**
 * Writes VOLUME_UP/VOLUME_DOWN/MUTE as page-scoped hotkeys (PageConfig.
 * hotkeys, which already override global bindings while that page is on
 * screen — see MainActivity.mergeHotkeys) on this Activity's `page`, so
 * pressing the physical volume keys while that page is showing routes to
 * whichever device this Activity designated for volume. No-op if the
 * Activity has no `page` or no volume device chosen.
 *
 * If that page already has ANY of these three keys bound to something else,
 * confirms before overwriting — the most likely case is the user, like the
 * one this feature was built for, already assigned VOLUME_UP/DOWN/MUTE
 * globally to a different default device, and page-scoped hotkeys silently
 * taking priority there would be a surprise otherwise.
 */
function applyVolumeHotkeysToPage() {
  if (!wizard.page || !wizard.volumeDeviceId) return;
  const ref = volumeDeviceRef();
  if (!ref) return;
  const page = dashboardData.pages.find(p => p.name === wizard.page);
  if (!page) {
    alert(`Heads up: this Activity's page "${wizard.page}" doesn't exist yet, so volume hotkeys weren't written anywhere. Create the page, then reopen and re-save this Activity.`);
    return;
  }

  let bindings;
  if (ref.source === 'ha') {
    bindings = [
      { key: 'VOLUME_UP', service: 'media_player.volume_up', entityId: ref.deviceId },
      { key: 'VOLUME_DOWN', service: 'media_player.volume_down', entityId: ref.deviceId },
      { key: 'MUTE', service: 'media_player.volume_mute', entityId: ref.deviceId, data: { is_volume_muted: true } },
    ];
  } else {
    const actionFor = command => ref.source === 'ir'
      ? { irDevice: ref.deviceId, irCommand: command }
      : { harmonyDevice: ref.deviceId, harmonyCommand: command, ...(ref.hub ? { hub: ref.hub } : {}) };
    bindings = [];
    if (wizard.volumeUpCommand) bindings.push({ key: 'VOLUME_UP', ...actionFor(wizard.volumeUpCommand) });
    if (wizard.volumeDownCommand) bindings.push({ key: 'VOLUME_DOWN', ...actionFor(wizard.volumeDownCommand) });
    if (wizard.muteCommand) bindings.push({ key: 'MUTE', ...actionFor(wizard.muteCommand) });
  }
  if (!bindings.length) return;

  page.hotkeys = page.hotkeys || [];
  const conflictingKeys = bindings
    .map(b => b.key)
    .filter(key => page.hotkeys.some(h => h.key === key));
  if (conflictingKeys.length) {
    const proceed = confirm(
      `Page "${wizard.page}" already has a hotkey for ${conflictingKeys.join('/')}. ` +
      `Overwrite with this Activity's volume device (${deviceRefLabel(ref)})?`,
    );
    if (!proceed) return;
  }
  bindings.forEach(b => {
    const i = page.hotkeys.findIndex(h => h.key === b.key);
    if (i >= 0) page.hotkeys[i] = b; else page.hotkeys.push(b);
  });
}

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
      el.innerHTML = `<span>${act.name} <span style="color:#888">(${act.devices.length} device${act.devices.length === 1 ? '' : 's'})</span></span><span><span class="remove" style="color:#00E5FF" onclick="startActivityWizard('${act.id}')">✎</span> <span class="remove" onclick="removeActivity('${act.id}')">✕</span></span>`;
      list.appendChild(el);
    });
  });
}

function removeActivity(id) {
  dashboardData.activities = (dashboardData.activities || []).filter(a => a.id !== id);
  renderActivitiesList();
  updateCardFormInputs();
  updateJsonOutput();
}

renderActivitiesList();
