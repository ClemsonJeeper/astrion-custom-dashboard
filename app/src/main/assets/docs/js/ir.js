// ---- IR Devices ---------------------------------------------------------
//
// Builds entries for dashboardData.irDevices: a registry of named commands
// per physical device ("power", "hdmi1", "volume_up"...), resolved to
// {freq, pattern} *once* here at build time from either a community
// ir-database/*.json entry (Pronto Hex, see prontoToPattern) or a
// hand-pasted Pronto code — dashboard.json ends up fully resolved, so the
// app itself never decodes a protocol or touches ir-database/. This is the
// offline/no-cloud baseline: works even if Harmony's own servers disappear.
//
// Note: fetching ir-database/*.json requires the page to be served over
// http(s) (GitHub Pages, or `npx http-server` locally) — it will fail if
// index.html is opened directly as a file:// URL, since browsers block
// fetch() for local files.

let irCategoriesIndex = null;      // [{id, label, file}], loaded once from ir-database/index.json
const irCategoryDataCache = {};    // categoryId -> parsed category JSON (brands/models/commands)
let pendingIrCommands = {};        // commandId -> {freq, pattern, label} for the device currently being built/edited
let editingIrDevice = null;        // id of the device being edited, or null when creating a new one

/**
 * Decodes a "learned" Pronto Hex code (type 0000 — raw timing, not a
 * codebook lookup) into {freq, pattern} for ConsumerIrManager.transmit().
 * Falls back to the repeat section if there's no "once" section (some
 * codes, e.g. a few Sony buttons, only carry a repeat burst).
 */
function prontoToPattern(pronto) {
  const words = pronto.trim().split(/\s+/).map(w => parseInt(w, 16));
  const [type, freqCode, onceLen, repeatLen] = words;
  if (type !== 0x0000) {
    throw new Error('Only "learned" Pronto codes (type 0000) are supported, got type ' + type.toString(16));
  }
  const carrierHz = Math.round(4145146 / freqCode);
  const periodUs = 1000000 / carrierHz;
  const rest = words.slice(4);
  const once = rest.slice(0, onceLen * 2);
  const repeat = rest.slice(onceLen * 2, onceLen * 2 + repeatLen * 2);
  const chosen = once.length ? once : repeat;
  if (!chosen.length) throw new Error('Pronto code has neither a "once" nor a "repeat" section');
  return { freq: carrierHz, pattern: chosen.map(c => Math.round(c * periodUs)) };
}

// ---- cascading dropdowns: category -> brand -> model -> command -----------

async function loadIrCategories() {
  const sel = document.getElementById('irCategory');
  if (!sel) return;
  try {
    const res = await fetch('ir-database/index.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    irCategoriesIndex = data.categories || [];
    sel.innerHTML = '<option value="">— select a category —</option>' +
      irCategoriesIndex.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  } catch (e) {
    sel.innerHTML = '<option value="">(couldn\'t load ir-database/index.json)</option>';
    console.error('Failed to load ir-database/index.json — is this page served over http(s)?', e);
  }
}

async function loadIrCategoryData(categoryId) {
  if (irCategoryDataCache[categoryId]) return irCategoryDataCache[categoryId];
  const entry = (irCategoriesIndex || []).find(c => c.id === categoryId);
  if (!entry) return null;
  const res = await fetch('ir-database/' + entry.file);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  irCategoryDataCache[categoryId] = data;
  return data;
}

function resetIrSelect(sel, placeholder) {
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  sel.disabled = true;
}

async function onIrCategoryChange() {
  const categoryId = document.getElementById('irCategory').value;
  const brandSel = document.getElementById('irBrand');
  const modelSel = document.getElementById('irModel');
  const cmdSel = document.getElementById('irCommand');
  resetIrSelect(modelSel, '— select a brand first —');
  resetIrSelect(cmdSel, '— select a model first —');
  if (!categoryId) { resetIrSelect(brandSel, '— select a category first —'); return; }
  try {
    const data = await loadIrCategoryData(categoryId);
    const brands = data.brands || [];
    brandSel.innerHTML = '<option value="">— select a brand —</option>' +
      brands.map((b, i) => `<option value="${i}">${b.brand_name}</option>`).join('');
    brandSel.disabled = false;
  } catch (e) {
    brandSel.innerHTML = '<option value="">(failed to load)</option>';
    console.error('Failed to load IR category data', e);
  }
}

function onIrBrandChange() {
  const categoryId = document.getElementById('irCategory').value;
  const brandIdx = document.getElementById('irBrand').value;
  const modelSel = document.getElementById('irModel');
  const cmdSel = document.getElementById('irCommand');
  resetIrSelect(cmdSel, '— select a model first —');
  if (brandIdx === '') { resetIrSelect(modelSel, '— select a brand first —'); return; }
  const data = irCategoryDataCache[categoryId];
  const models = data.brands[brandIdx].models || [];
  modelSel.innerHTML = '<option value="">— select a model —</option>' +
    models.map((m, i) => `<option value="${i}">${m.model_name}</option>`).join('');
  modelSel.disabled = false;
}

function onIrModelChange() {
  const categoryId = document.getElementById('irCategory').value;
  const brandIdx = document.getElementById('irBrand').value;
  const modelIdx = document.getElementById('irModel').value;
  const cmdSel = document.getElementById('irCommand');
  if (modelIdx === '') { resetIrSelect(cmdSel, '— select a model first —'); return; }
  const data = irCategoryDataCache[categoryId];
  const commands = data.brands[brandIdx].models[modelIdx].commands || {};
  cmdSel.innerHTML = '<option value="">— select a command —</option>' +
    Object.entries(commands).map(([id, c]) => `<option value="${id}">${c.label || id}</option>`).join('');
  cmdSel.disabled = false;
}

// ---- adding one named command to the device being built --------------------
//
// Three ways to populate `pendingIrCommands`:
//  1. The cascade above (community ir-database entry), one command at a time.
//  2. "Import all" — every command from the picked model at once, keyed by
//     the database's own command id; rename afterward if you want friendlier
//     ids (see startRenameIrCommand below). Existing ids are left alone (not
//     overwritten) so re-importing after a manual rename doesn't clobber it.
//  3. A hand-pasted Pronto Hex code, for a device/button not in the database
//     or a code you learned yourself with another tool.
// Either way, the commandId (freeform, e.g. "power", "hdmi1", "volume_up")
// is what this command is addressed by from ActivityDeviceConfig /
// scene_grid's irCommand field.

let renamingCommandId = null; // commandId currently shown with an inline rename field, or null

function addIrCommand() {
  const commandId = document.getElementById('irCommandId').value.trim();
  if (!commandId) { alert('Give this command an id, e.g. "power", "hdmi1", "volume_up".'); return; }

  const manualPronto = document.getElementById('irManualPronto').value.trim();
  let resolved, label;

  if (manualPronto) {
    try {
      resolved = prontoToPattern(manualPronto);
    } catch (e) {
      alert('Couldn\'t decode this Pronto code: ' + e.message);
      return;
    }
    label = document.getElementById('irManualLabel').value.trim() || commandId;
  } else {
    const categoryId = document.getElementById('irCategory').value;
    const brandIdx = document.getElementById('irBrand').value;
    const modelIdx = document.getElementById('irModel').value;
    const pickedCommandId = document.getElementById('irCommand').value;
    if (!categoryId || brandIdx === '' || modelIdx === '' || !pickedCommandId) {
      alert('Pick a category/brand/model/command from the database, or paste a Pronto code manually below it.');
      return;
    }
    const data = irCategoryDataCache[categoryId];
    const brand = data.brands[brandIdx];
    const model = brand.models[modelIdx];
    const command = model.commands[pickedCommandId];
    try {
      resolved = prontoToPattern(command.pronto);
    } catch (e) {
      alert('Couldn\'t decode this command\'s Pronto code: ' + e.message);
      return;
    }
    label = `${brand.brand_name} ${model.model_name} — ${command.label || pickedCommandId}`;
  }

  pendingIrCommands[commandId] = { freq: resolved.freq, pattern: resolved.pattern, label };
  document.getElementById('irCommandId').value = '';
  document.getElementById('irManualPronto').value = '';
  document.getElementById('irManualLabel').value = '';
  renderIrCommandsList();
}

/** Imports every command from the currently-picked category/brand/model in
 * one go, keyed by the database's own command id (e.g. "PowerOn"). Ids
 * already present in `pendingIrCommands` are left untouched — re-running
 * this after you've renamed a command won't undo the rename. Commands whose
 * Pronto code fails to decode are skipped and reported, not silently
 * dropped. */
function importAllIrCommands() {
  const categoryId = document.getElementById('irCategory').value;
  const brandIdx = document.getElementById('irBrand').value;
  const modelIdx = document.getElementById('irModel').value;
  if (!categoryId || brandIdx === '' || modelIdx === '') {
    alert('Pick a category, brand, and model first.');
    return;
  }
  const data = irCategoryDataCache[categoryId];
  const brand = data.brands[brandIdx];
  const model = brand.models[modelIdx];
  const commands = model.commands || {};
  let imported = 0;
  let skippedExisting = 0;
  const failed = [];
  Object.entries(commands).forEach(([commandId, command]) => {
    if (pendingIrCommands[commandId]) { skippedExisting++; return; }
    try {
      const resolved = prontoToPattern(command.pronto);
      pendingIrCommands[commandId] = { freq: resolved.freq, pattern: resolved.pattern, label: command.label || commandId };
      imported++;
    } catch (e) {
      failed.push(command.label || commandId);
    }
  });
  renderIrCommandsList();
  let msg = `Imported ${imported} command${imported === 1 ? '' : 's'} from ${brand.brand_name} ${model.model_name}.`;
  if (skippedExisting) msg += ` ${skippedExisting} already present, left as-is.`;
  if (failed.length) msg += ` ${failed.length} failed to decode: ${failed.join(', ')}.`;
  alert(msg);
}

function removeIrCommand(commandId) {
  delete pendingIrCommands[commandId];
  if (renamingCommandId === commandId) renamingCommandId = null;
  renderIrCommandsList();
}

function startRenameIrCommand(commandId) {
  renamingCommandId = commandId;
  renderIrCommandsList();
}

function confirmRenameIrCommand(oldId) {
  const newId = document.getElementById('irRenameInput').value.trim();
  if (!newId) { alert('Command id can\'t be empty.'); return; }
  if (newId !== oldId && pendingIrCommands[newId]) { alert('That id is already used by another command on this device.'); return; }
  if (newId !== oldId) {
    pendingIrCommands[newId] = pendingIrCommands[oldId];
    delete pendingIrCommands[oldId];
  }
  renamingCommandId = null;
  renderIrCommandsList();
}

function renderIrCommandsList() {
  const list = document.getElementById('irCommandsList');
  if (!list) return;
  const ids = Object.keys(pendingIrCommands);
  if (!ids.length) {
    list.innerHTML = '<div class="hint">No commands yet — add one above, or import all of them from a picked model.</div>';
    return;
  }
  list.innerHTML = '';
  ids.forEach(commandId => {
    const cmd = pendingIrCommands[commandId];
    const el = document.createElement('div');
    el.className = 'list-item';
    if (renamingCommandId === commandId) {
      el.innerHTML = `<input type="text" id="irRenameInput" value="${commandId}" style="flex:1;margin-right:8px">
        <span class="remove" style="color:#00E5FF" onclick="confirmRenameIrCommand('${commandId}')">✓</span>
        <span class="remove" onclick="renamingCommandId=null;renderIrCommandsList()">✕</span>`;
    } else {
      el.innerHTML = `<span><code>${commandId}</code> — ${cmd.label}</span><span><span class="remove" style="color:#00E5FF" onclick="startRenameIrCommand('${commandId}')">✎</span> <span class="remove" onclick="removeIrCommand('${commandId}')">✕</span></span>`;
    }
    list.appendChild(el);
  });
  if (renamingCommandId) document.getElementById('irRenameInput')?.focus();
}

// ---- saving / editing / removing devices ------------------------------------

function renderIrDevicesList() {
  const list = document.getElementById('irDevicesList');
  if (!list) return;
  list.innerHTML = '';
  (dashboardData.irDevices || []).forEach(dev => {
    const count = Object.keys(dev.commands || {}).length;
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${dev.name} <span style="color:#888">(${count} command${count === 1 ? '' : 's'})</span></span><span><span class="remove" style="color:#00E5FF" onclick="editIrDevice('${dev.id}')">✎</span> <span class="remove" onclick="removeIrDevice('${dev.id}')">✕</span></span>`;
    list.appendChild(el);
  });
}

function saveIrDevice() {
  const name = document.getElementById('irDevName').value.trim();
  if (!name) { alert('Give this device a name.'); return; }
  if (!Object.keys(pendingIrCommands).length) { alert('Add at least one command.'); return; }
  dashboardData.irDevices = dashboardData.irDevices || [];
  if (editingIrDevice !== null) {
    const idx = dashboardData.irDevices.findIndex(d => d.id === editingIrDevice);
    if (idx >= 0) {
      dashboardData.irDevices[idx] = { ...dashboardData.irDevices[idx], name, commands: pendingIrCommands };
    }
  } else {
    const id = slugify(name, 'device');
    let uniqueId = id;
    let n = 2;
    while (dashboardData.irDevices.some(d => d.id === uniqueId)) uniqueId = `${id}_${n++}`;
    dashboardData.irDevices.push({ id: uniqueId, name, commands: pendingIrCommands });
  }
  cancelIrDeviceEdit();
  renderIrDevicesList();
  updateCardFormInputs(); // refreshes the IR-device picker inside the scene_grid form, if open
  if (typeof renderActDevSubForm === 'function') renderActDevSubForm(); // same, for the Activities section's device picker
  updateJsonOutput();
}

function editIrDevice(id) {
  const dev = (dashboardData.irDevices || []).find(d => d.id === id);
  if (!dev) return;
  editingIrDevice = id;
  document.getElementById('irDevName').value = dev.name;
  pendingIrCommands = JSON.parse(JSON.stringify(dev.commands || {}));
  renderIrCommandsList();
  document.getElementById('saveIrDeviceBtn').textContent = 'Save device';
  document.getElementById('cancelIrDeviceEditBtn').style.display = '';
}

function cancelIrDeviceEdit() {
  editingIrDevice = null;
  pendingIrCommands = {};
  document.getElementById('irDevName').value = '';
  document.getElementById('saveIrDeviceBtn').textContent = 'Save device';
  document.getElementById('cancelIrDeviceEditBtn').style.display = 'none';
  renderIrCommandsList();
}

function removeIrDevice(id) {
  dashboardData.irDevices = (dashboardData.irDevices || []).filter(d => d.id !== id);
  if (editingIrDevice === id) cancelIrDeviceEdit();
  renderIrDevicesList();
  updateCardFormInputs();
  if (typeof renderActDevSubForm === 'function') renderActDevSubForm();
  updateJsonOutput();
}

loadIrCategories();
renderIrCommandsList();
renderIrDevicesList();
