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
  { id: 'watch_tv', labelKey: 'web_activity_type_watch_tv' },
  { id: 'watch_movie', labelKey: 'web_activity_type_watch_movie' },
  { id: 'listen_music', labelKey: 'web_activity_type_listen_music' },
  { id: 'smart_tv', labelKey: 'web_activity_type_smart_tv' },
  { id: 'netflix', labelKey: 'web_activity_type_netflix' },
  { id: 'custom', labelKey: 'web_activity_type_custom' },
];

let wizard = null; // null when the wizard modal is closed; see startActivityWizard()

function irDevicesById() {
  return Object.fromEntries((dashboardData.irDevices || []).map(d => [d.id, d]));
}

/**
 * [value, label] entries for an IR device's command dropdowns. Only
 * *actually* known for inline devices (commands map right there in
 * dashboardData). For an ir-database reference device, falls back to
 * whatever "known command ids" were typed in when it was created (see
 * ir.js's irDeviceCommandHints) — no friendly label available for those,
 * just the id twice. Empty either way if there's nothing to suggest;
 * these are real `<select>`s here (unlike scene_grid's free-text
 * giIrCommand) since a wrong powerOn/powerOff/input command silently
 * breaks Activity switching, so typos matter more here.
 */
function irDeviceCommandEntries(dev) {
  if (!dev) return [];
  if (dev.commands) return Object.entries(dev.commands).map(([id, c]) => [id, `${id} — ${c.label || id}`]);
  const hints = (typeof irDeviceCommandHints !== 'undefined' ? irDeviceCommandHints[dev.id] : null) || [];
  return hints.map(id => [id, id]);
}

function deviceRefLabel(ref) {
  if (ref.source === 'ir') return `${irDevicesById()[ref.deviceId]?.name || ref.deviceId} ${I18N.t('web_activity_ref_ir')}`;
  if (ref.source === 'harmony') return `${ref.deviceLabel || ref.deviceId} ${I18N.t('web_activity_ref_harmony')}`;
  return `${ref.deviceId} ${I18N.t('web_activity_ref_ha')}`;
}


const WIZARD_STEP_LABELS = {
  type: 'web_activity_step_type',
  info: 'web_activity_step_info',
  devices: 'web_activity_step_devices',
  configure: 'web_activity_step_configure',
  volume: 'web_activity_step_volume',
  volumeCommands: 'web_activity_step_volume_commands',
  review: 'web_activity_step_review',
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
    if (!wizard.name) { alert(I18N.t('web_activity_alert_need_name')); return; }
    if (!wizard.room) { alert(I18N.t('web_activity_alert_need_room')); return; }
    wizard.phase = 'devices';
  } else if (phase === 'devices') {
    if (!wizard.deviceRefs.length) { alert(I18N.t('web_activity_alert_need_device')); return; }
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
  document.getElementById('wizStepLabel').textContent = WIZARD_STEP_LABELS[phase] ? I18N.t(WIZARD_STEP_LABELS[phase]) : phase;
  document.getElementById('activityWizardTitle').textContent = wizard.editingId ? I18N.t('web_activity_edit_title', wizard.name) : I18N.t('web_modal_new_activity');

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
    <div class="hint">${I18N.t('web_activity_type_hint')}</div>
    <div class="btn-row" style="flex-wrap:wrap;margin-top:10px">
      ${ACTIVITY_TYPES.map(t => `<button type="button" class="secondary" onclick="pickActivityType('${t.id}')">${I18N.t(t.labelKey)}</button>`).join('')}
    </div>
  `;
}

function renderWizardInfo() {
  return `
    <label>${I18N.t('web_activity_label_name')}</label>
    <input type="text" id="wizName" value="${wizard.name}" placeholder="${I18N.t('web_activity_name_placeholder')}">
    <label>${I18N.t('web_activity_label_room')}</label>
    <input type="text" id="wizRoom" value="${wizard.room}" placeholder="${I18N.t('web_activity_room_placeholder')}">
    <div id="wizIconField"></div>
    <label>${I18N.t('web_activity_page_label')}</label>
    <input type="text" id="wizPage" value="${wizard.page}" placeholder="${I18N.t('web_activity_page_placeholder')}">
  `;
}

function renderWizardDevices() {
  const irDevices = dashboardData.irDevices || [];
  const selectedIrIds = new Set(wizard.deviceRefs.filter(r => r.source === 'ir').map(r => r.deviceId));
  return `
    <div class="hint">${I18N.t('web_activity_devices_hint')}</div>

    <h3>${I18N.t('web_activity_ir_devices_heading')}</h3>
    ${irDevices.length === 0 ? `<div class="hint">${I18N.t('web_activity_no_ir_devices')}</div>` :
      irDevices.map(d => `
        <label class="inline-check">
          <input type="checkbox" ${selectedIrIds.has(d.id) ? 'checked' : ''} onchange="toggleIrDeviceRef('${d.id}', this.checked)">
          ${d.name}
        </label>
      `).join('')}

    <h3 style="margin-top:14px">${I18N.t('web_activity_harmony_heading')}</h3>
    <div id="wizHarmonyAddFields"></div>

    <h3 style="margin-top:14px">${I18N.t('web_activity_ha_heading')}</h3>
    <input type="text" id="wizHaEntityId" placeholder="media_player.salon_ampli">
    <div class="btn-row" style="margin-top:6px">
      <button type="button" class="secondary" onclick="addHaDeviceRef()">${I18N.t('web_activity_add_ha_entity')}</button>
    </div>

    <h3 style="margin-top:14px">${I18N.t('web_activity_selected_devices')}</h3>
    <div id="wizDeviceRefsList"></div>
  `;
}

function renderWizardConfigure() {
  const ref = wizard.deviceRefs[wizard.configureIndex];
  const cfg = wizard.deviceConfig[wizard.configureIndex] || {};
  const n = wizard.configureIndex + 1;
  const total = wizard.deviceRefs.length;
  return `
    <div class="hint">${I18N.t('web_activity_device_n_of_m', n, total)} <strong>${deviceRefLabel(ref)}</strong></div>

    ${ref.source === 'ha' ? `
      <label>${I18N.t('web_activity_source_label')}</label>
      <input type="text" id="wizInputText" value="${cfg.inputCommand || ''}" placeholder="${I18N.t('web_activity_source_placeholder')}">
    ` : `
      <label>${I18N.t('web_activity_power_on_label')}</label>
      <input type="text" id="wizPowerOn" list="wizPowerOnHints">
      <datalist id="wizPowerOnHints"></datalist>
      <label>${I18N.t('web_activity_power_off_label')}</label>
      <input type="text" id="wizPowerOff" list="wizPowerOffHints">
      <datalist id="wizPowerOffHints"></datalist>
      <label>${I18N.t('web_activity_input_label')}</label>
      <input type="text" id="wizInput" list="wizInputHints">
      <datalist id="wizInputHints"></datalist>
    `}

    <label class="inline-check" style="margin-top:10px"><input type="checkbox" id="wizPowerOnFirst" ${cfg.powerOnFirst !== false ? 'checked' : ''}> ${I18N.t('web_activity_power_on_first')}</label>
    <label class="inline-check"><input type="checkbox" id="wizPowerOffOnExit" ${cfg.powerOffOnExit !== false ? 'checked' : ''}> ${I18N.t('web_activity_power_off_on_exit')}</label>
    <label>${I18N.t('web_activity_delay_label')}</label>
    <input type="number" id="wizDelay" value="${cfg.delayAfterMs || 0}" min="0">
  `;
}

function renderWizardVolume() {
  return `
    <div class="hint">${I18N.t('web_activity_volume_hint')}</div>
    <select id="wizVolumeDevice">
      <option value="">${I18N.t('web_none')}</option>
      ${wizard.deviceRefs.map(r => `<option value="${r.deviceId}" ${wizard.volumeDeviceId === r.deviceId ? 'selected' : ''}>${deviceRefLabel(r)}</option>`).join('')}
    </select>
    <div class="hint" style="margin-top:8px">${I18N.t('web_activity_volume_hotkey_hint')}</div>
  `;
}

function renderWizardVolumeCommands() {
  const ref = volumeDeviceRef();
  return `
    <div class="hint">${I18N.t('web_activity_volume_commands_hint', `<strong>${deviceRefLabel(ref)}</strong>`)}</div>
    <label>${I18N.t('web_activity_vol_up_label')}</label>
    <input type="text" id="wizVolUp" list="wizVolUpHints">
    <datalist id="wizVolUpHints"></datalist>
    <label>${I18N.t('web_activity_vol_down_label')}</label>
    <input type="text" id="wizVolDown" list="wizVolDownHints">
    <datalist id="wizVolDownHints"></datalist>
    <label>${I18N.t('web_activity_mute_label')}</label>
    <input type="text" id="wizMute" list="wizMuteHints">
    <datalist id="wizMuteHints"></datalist>
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
      ? I18N.t('web_activity_review_volume_ha', deviceRefLabel(volRef))
      : I18N.t('web_activity_review_volume_cmds', deviceRefLabel(volRef), wizard.volumeUpCommand || '—', wizard.volumeDownCommand || '—', wizard.muteCommand || '—');
    if (!wizard.page) volLine += I18N.t('web_activity_review_volume_no_page');
  }
  return `
    <div class="hint">${I18N.t('web_activity_review_title', `<strong>${wizard.name}</strong>`, wizard.room)}${wizard.page ? I18N.t('web_activity_review_opens', wizard.page) : ''}</div>
    <div id="wizReviewList" style="margin-top:10px"></div>
    ${volLine ? `<div class="hint" style="margin-top:8px">${volLine}</div>` : ''}
    ${noCmdCount > 0 ? `<div class="hint" style="color:#e5984a;margin-top:8px">${I18N.t(noCmdCount === 1 ? 'web_activity_review_no_commands_one' : 'web_activity_review_no_commands_many', noCmdCount)}</div>` : ''}
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
      const entries = irDeviceCommandEntries(irDevicesById()[ref.deviceId]);
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
      const entries = irDeviceCommandEntries(irDevicesById()[ref.deviceId]);
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

/**
 * Populates the `<datalist>` suggestions for one of the wizard's IR/Harmony
 * command fields (now plain text inputs with a list= attribute, not
 * selects — see renderWizardDeviceConfig/renderWizardVolumeCommands).
 * A free-text input, unlike a select, means an id this builder doesn't
 * know about (an ir-database reference device with no typed-in hints, or
 * just a typo) doesn't leave the field stuck on "— none —" with nothing
 * pickable — you can always just type the id.
 */
function fillWizCommandOptions(inputId, commandEntries) {
  const datalist = document.getElementById(inputId + 'Hints');
  if (!datalist) return;
  datalist.innerHTML = commandEntries.map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
}

function renderWizardHarmonyAddFields() {
  const container = document.getElementById('wizHarmonyAddFields');
  if (!harmonyAvailable) {
    container.innerHTML = `<div class="hint">${I18N.t('web_activity_no_harmony')}</div>`;
    return;
  }
  container.innerHTML = `
    <div id="wizHarmonyPicker"></div>
    <div class="btn-row" style="margin-top:6px">
      <button type="button" class="secondary" onclick="addHarmonyDeviceRef()">${I18N.t('web_activity_add_harmony_device')}</button>
    </div>
  `;
  // Renders into its OWN sub-container (#wizHarmonyPicker), not the outer
  // one that also holds the "+ Add Harmony device" button — renderHarmonyHubSelect
  // sets container.innerHTML itself, which would otherwise wipe out that
  // button (and everything else already in `container`) the moment it runs.
  // Reuses the exact same Hub -> Device cascading picker (and its built-in
  // onHarmonyHubChange handler) as the hotkey ('hk') and scene item ('gi')
  // forms — no separate wiring needed here.
  renderHarmonyHubSelect(document.getElementById('wizHarmonyPicker'), 'device', 'wizHarmony');
}

function renderWizardDeviceRefsList() {
  const list = document.getElementById('wizDeviceRefsList');
  if (!wizard.deviceRefs.length) {
    list.innerHTML = `<div class="hint">${I18N.t('web_activity_none_yet')}</div>`;
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
    if (cfg.powerOnCommand) parts.push(I18N.t('web_activity_review_on', cfg.powerOnCommand));
    if (cfg.powerOffCommand) parts.push(I18N.t('web_activity_review_off', cfg.powerOffCommand));
    if (cfg.inputCommand) parts.push(I18N.t('web_activity_review_input', cfg.inputCommand));
    const isVolume = wizard.volumeDeviceId === ref.deviceId;
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${deviceRefLabel(ref)}${isVolume ? ' 🔊' : ''} <span style="color:#888">${parts.join(', ') || I18N.t('web_activity_review_no_commands')}</span></span>`;
    list.appendChild(el);
  });
}

// ---- device-selection actions (phase: 'devices') ---------------------------

function pickActivityType(typeId) {
  const type = ACTIVITY_TYPES.find(t => t.id === typeId);
  wizard.type = typeId;
  if (!wizard.name && type.id !== 'custom') wizard.name = I18N.t(type.labelKey);
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
  const deviceId = document.getElementById('wizHarmonyDeviceSelect')?.value;
  if (!hub || !deviceId) { alert(I18N.t('web_activity_alert_pick_harmony')); return; }
  if (wizard.deviceRefs.some(r => r.source === 'harmony' && r.hub === hub && r.deviceId === deviceId)) {
    alert(I18N.t('web_activity_alert_device_dup'));
    return;
  }
  const deviceLabel = document.getElementById('wizHarmonyDeviceSelect').selectedOptions[0]?.textContent || deviceId;
  wizard.deviceRefs.push({ source: 'harmony', deviceId, hub, deviceLabel });
  renderWizardDeviceRefsList();
}

function addHaDeviceRef() {
  const deviceId = document.getElementById('wizHaEntityId').value.trim();
  if (!deviceId) { alert(I18N.t('web_activity_alert_enter_entity')); return; }
  if (wizard.deviceRefs.some(r => r.source === 'ha' && r.deviceId === deviceId)) {
    alert(I18N.t('web_activity_alert_entity_dup'));
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
    alert(I18N.t('web_activity_alert_page_missing', wizard.page));
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
      I18N.t('web_activity_confirm_overwrite_hotkeys', wizard.page, conflictingKeys.join('/'), deviceRefLabel(ref)),
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
      el.innerHTML = `<span>${act.name} <span style="color:#888">${I18N.t(act.devices.length === 1 ? 'web_activity_device_count_one' : 'web_activity_device_count_many', act.devices.length)}</span></span><span><span class="remove" style="color:#00E5FF" onclick="startActivityWizard('${act.id}')">✎</span> <span class="remove" onclick="removeActivity('${act.id}')">✕</span></span>`;
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

I18N.ready.then(renderActivitiesList);
