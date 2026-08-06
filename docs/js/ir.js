// ---- IR Activities ----------------------------------------------------------
//
// Builds entries for dashboardData.irActivities: named sequences of raw IR
// sends, executed locally by the app through its own IR blaster (no Harmony
// hub, no Home Assistant). Community-contributed device codes live in
// docs/ir-database/*.json as Pronto Hex (see prontoToPattern below); this
// file resolves a picked command into {freq, pattern} *once*, at build time
// — dashboard.json ends up with fully-resolved steps, so the app itself
// never needs to know about ir-database/ or decode any protocol.
//
// Note: fetching ir-database/*.json requires the page to be served over
// http(s) (GitHub Pages, or `npx http-server` locally) — it will fail if
// index.html is opened directly as a file:// URL, since browsers block
// fetch() for local files.

let irCategoriesIndex = null;      // [{id, label, file}], loaded once from ir-database/index.json
const irCategoryDataCache = {};    // categoryId -> parsed category JSON (brands/models/commands)
let pendingIrSteps = [];           // steps being assembled for the activity currently being built/edited
let editingIrActivity = null;      // id of the activity being edited, or null when creating a new one

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

// ---- building the step list -------------------------------------------------

function addIrStep() {
  const categoryId = document.getElementById('irCategory').value;
  const brandIdx = document.getElementById('irBrand').value;
  const modelIdx = document.getElementById('irModel').value;
  const commandId = document.getElementById('irCommand').value;
  const delayAfterMs = parseInt(document.getElementById('irStepDelay').value, 10) || 0;
  if (!categoryId || brandIdx === '' || modelIdx === '' || !commandId) {
    alert('Pick a category, brand, model, and command first.');
    return;
  }
  const data = irCategoryDataCache[categoryId];
  const brand = data.brands[brandIdx];
  const model = brand.models[modelIdx];
  const command = model.commands[commandId];
  let resolved;
  try {
    resolved = prontoToPattern(command.pronto);
  } catch (e) {
    alert('Couldn\'t decode this command\'s Pronto code: ' + e.message);
    return;
  }
  pendingIrSteps.push({
    freq: resolved.freq,
    pattern: resolved.pattern,
    delayAfterMs,
    label: `${brand.brand_name} ${model.model_name} — ${command.label || commandId}`,
  });
  renderIrStepsList();
}

function removeIrStep(i) {
  pendingIrSteps.splice(i, 1);
  renderIrStepsList();
}

function renderIrStepsList() {
  const list = document.getElementById('irStepsList');
  if (!list) return;
  if (!pendingIrSteps.length) {
    list.innerHTML = '<div class="hint">No steps yet — add one above.</div>';
    return;
  }
  list.innerHTML = '';
  pendingIrSteps.forEach((step, i) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    const delayNote = (i < pendingIrSteps.length - 1 && step.delayAfterMs > 0)
      ? ` <span style="color:#888">(+${step.delayAfterMs}ms then)</span>` : '';
    el.innerHTML = `<span>${i + 1}. ${step.label || 'IR step'}${delayNote}</span><span class="remove" onclick="removeIrStep(${i})">✕</span>`;
    list.appendChild(el);
  });
}

// ---- saving / editing / removing activities ---------------------------------

function renderIrActivitiesList() {
  const list = document.getElementById('irActivitiesList');
  if (!list) return;
  list.innerHTML = '';
  (dashboardData.irActivities || []).forEach(act => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${act.name} <span style="color:#888">(${act.steps.length} step${act.steps.length === 1 ? '' : 's'})</span></span><span><span class="remove" style="color:#00E5FF" onclick="editIrActivity('${act.id}')">✎</span> <span class="remove" onclick="removeIrActivity('${act.id}')">✕</span></span>`;
    list.appendChild(el);
  });
}

function saveIrActivity() {
  const name = document.getElementById('irActName').value.trim();
  if (!name) { alert('Give this activity a name.'); return; }
  if (!pendingIrSteps.length) { alert('Add at least one step.'); return; }
  dashboardData.irActivities = dashboardData.irActivities || [];
  if (editingIrActivity !== null) {
    const idx = dashboardData.irActivities.findIndex(a => a.id === editingIrActivity);
    if (idx >= 0) {
      dashboardData.irActivities[idx] = { ...dashboardData.irActivities[idx], name, steps: pendingIrSteps };
    }
  } else {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || ('activity_' + Date.now());
    let uniqueId = id;
    let n = 2;
    while (dashboardData.irActivities.some(a => a.id === uniqueId)) uniqueId = `${id}_${n++}`;
    dashboardData.irActivities.push({ id: uniqueId, name, steps: pendingIrSteps });
  }
  cancelIrActivityEdit();
  renderIrActivitiesList();
  updateCardFormInputs(); // refreshes the IR-activity picker inside the scene_grid form, if open
  updateJsonOutput();
}

function editIrActivity(id) {
  const act = (dashboardData.irActivities || []).find(a => a.id === id);
  if (!act) return;
  editingIrActivity = id;
  document.getElementById('irActName').value = act.name;
  pendingIrSteps = JSON.parse(JSON.stringify(act.steps));
  renderIrStepsList();
  document.getElementById('saveIrActivityBtn').textContent = 'Save activity';
  document.getElementById('cancelIrActivityEditBtn').style.display = '';
}

function cancelIrActivityEdit() {
  editingIrActivity = null;
  pendingIrSteps = [];
  document.getElementById('irActName').value = '';
  document.getElementById('saveIrActivityBtn').textContent = 'Save activity';
  document.getElementById('cancelIrActivityEditBtn').style.display = 'none';
  renderIrStepsList();
}

function removeIrActivity(id) {
  dashboardData.irActivities = (dashboardData.irActivities || []).filter(a => a.id !== id);
  if (editingIrActivity === id) cancelIrActivityEdit();
  renderIrActivitiesList();
  updateCardFormInputs();
  updateJsonOutput();
}

loadIrCategories();
renderIrStepsList();
