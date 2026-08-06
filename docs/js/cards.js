// ---- Cards ---------------------------------------------------------------

const NAME_ENTITY_TYPES = ['bubble_light', 'light', 'switch', 'cover', 'source_select'];

function updateCardFormInputs() {
  const type = document.getElementById('cardTypeSelect').value;
  const container = document.getElementById('dynamicCardInputs');

  if (NAME_ENTITY_TYPES.includes(type)) {
    container.innerHTML = `
      <label>Name</label><input type="text" id="optName" placeholder="e.g., Living Room">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., light.living_room">
      <label>Icon (optional, PNG path)</label><input type="text" id="optIcon" placeholder="/sdcard/astrion/icons/xxx.png">
    `;
  } else if (type === 'fan') {
    container.innerHTML = `
      <label>Name</label><input type="text" id="optName" placeholder="e.g., Standing Fan">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., fan.mi_smart_standing_fan_2">
      <label>Layout</label>
      <select id="optFanStyle">
        <option value="auto">Auto (detect from entity)</option>
        <option value="simple">Simple (percentage tile)</option>
        <option value="full">Full (presets + oscillate)</option>
      </select>
      <label>Preset modes override (optional, comma-separated, in display order — normally read from the entity)</label><input type="text" id="optFanPresetModes" placeholder="Level 1,Level 2,Level 3,Level 4">
      <label>Percentage step (simple layout / no-preset fallback)</label><input type="number" id="optFanStep" value="20" min="1" max="100">
      <label><input type="checkbox" id="optFanShowCaptions" checked> Show captions ("Preset"/"Oscillate") above chip rows</label>
      <div class="hint">"Auto" shows the full layout (power button, presets, oscillate toggle) whenever the entity reports preset_modes or an oscillating attribute; otherwise it falls back to the simple percentage tile. Force one or the other with Layout above.</div>
    `;
  } else if (type === 'climate') {
    container.innerHTML = `
      <label>Name</label><input type="text" id="optName" placeholder="e.g., Living Room AC">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., climate.living_room">
      <label>HVAC modes override (optional, comma-separated, in display order — normally read from the entity)</label><input type="text" id="optHvacModes" placeholder="heat_cool,cool">
      <label>HVAC mode display</label>
      <select id="optHvacModeStyle">
        <option value="icons">Icon</option>
        <option value="label">Text label</option>
      </select>
      <label>Fan modes override (optional, comma-separated, in display order — normally read from the entity)</label><input type="text" id="optFanModes" placeholder="low,medium,high,auto">
      <label>Fan mode display</label>
      <select id="optFanModeStyle">
        <option value="label">Text label</option>
        <option value="icons">Icon</option>
      </select>
      <label>Swing modes override (optional, comma-separated, in display order — normally read from the entity)</label><input type="text" id="optSwingModes" placeholder="stop,swing">
      <label>Swing mode display</label>
      <select id="optSwingModeStyle">
        <option value="label">Text label</option>
        <option value="icons">Icon</option>
      </select>
      <div class="hint">HVAC/fan/swing mode names ("Cooling", "Auto", "Swing"...) are translated automatically via assets/ha_labels/&lt;lang&gt;.json. The "off" mode never shows as a chip — it's already covered by the power button.</div>
      <label><input type="checkbox" id="optShowCaptions" checked> Show captions ("Mode"/"Fan"/"Swing") above chip rows</label>
    `;
  } else if (type === 'button_grid' || type === 'scene_grid') {
    const label = type === 'button_grid' ? 'Button' : 'Scene';
    container.innerHTML = `
      <label>Columns</label><input type="number" id="optColumns" value="2" min="1">
      ${type === 'scene_grid' ? `<label><input type="checkbox" id="optShowLabels" checked> Show name under icon (when any scene has one — applies to the whole grid)</label>` : ''}
      <div id="gridItemsList"></div>
      <div class="section-box" style="margin-top:8px">
        <label>${label} name</label><input type="text" id="giName" placeholder="e.g., ${type === 'button_grid' ? 'Netflix' : 'Movie Night'}">
        ${type === 'button_grid' ? `
          <label>Service (domain.service)</label><input type="text" id="giService" placeholder="e.g., media_player.play_media">
          <label>Entity ID (optional)</label><input type="text" id="giEntityId" placeholder="e.g., media_player.tv">
          <label>Extra data (optional, JSON)</label><input type="text" id="giData" placeholder='{"media_content_type":"app"}'>
        ` : `
          <label>Entity ID (activates a scene/script) — OR —</label><input type="text" id="giEntityId" placeholder="e.g., scene.night">
          <label>Page to open instead — OR —</label><input type="text" id="giPage" placeholder="e.g., Apple TV">
          <label>Harmony activity ID (triggers directly on the hub) — OR —</label><input type="text" id="giActivityId" placeholder="e.g., 39568252 (or -1 for Off)">
          <label>IR activity (sends locally, no hub needed) — OR —</label>
          <select id="giIrActivity">
            <option value="">— none —</option>
            ${(dashboardData.irActivities || []).map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
          ${(dashboardData.irActivities || []).length === 0 ? '<div class="hint">No IR activities yet — create one in the "IR Activities" section below, then come back here.</div>' : ''}
          <label>Color (optional, ARGB hex — defaults to the standard tile color)</label><input type="text" id="giColor" placeholder="#66009688">
        `}
        <label>Icon (optional, PNG path)</label><input type="text" id="giIcon" placeholder="/sdcard/astrion/icons/xxx.png">
        <button type="button" class="secondary" onclick="addGridItem('${type}')" id="giSubmitBtn">+ Add ${label.toLowerCase()} to this card</button>
        <button type="button" class="secondary" onclick="cancelGridItemEdit()" id="giCancelBtn" style="display:none">Cancel edit</button>
      </div>
      <div class="hint">Click a ${label.toLowerCase()} below to edit it. Add every ${label.toLowerCase()}, then click "Add card to page" once below.</div>
    `;
    window._pendingGridItems = window._pendingGridItems || [];
    renderGridItemsList(type);
  } else if (type === 'apple_tv_remote') {
    container.innerHTML = `<label>Device ID (Harmony)</label><input type="text" id="optDeviceId" placeholder="e.g., 62846050">`;
  } else if (type === 'tv_remote') {
    container.innerHTML = `
      <label>Name</label><input type="text" id="optName" placeholder="e.g., Living Room TV">
      <label>Remote entity ID</label><input type="text" id="optRemoteEntity" placeholder="e.g., remote.living_room_tv">
      <label>Media entity ID (optional)</label><input type="text" id="optMediaEntity" placeholder="e.g., media_player.tv">
      <label>Mute entity ID (optional)</label><input type="text" id="optMuteEntity" placeholder="e.g., media_player.soundbar">
    `;
  } else if (type === 'clock_weather') {
    container.innerHTML = `
      <label>Weather entity ID</label><input type="text" id="optEntityId" placeholder="e.g., weather.forecast_home">
      <label>Time format</label>
      <select id="optTimeFormat">
        <option value="12">12-hour (e.g., 9:41 PM)</option>
        <option value="24">24-hour (e.g., 21:41)</option>
      </select>
      <label>Forecast rows (days shown below the clock)</label><input type="number" id="optForecastRows" value="4" min="0" max="10">
      <label>Calendar entity (optional — shows today's event under the date)</label><input type="text" id="optCalendarEntity" placeholder="e.g., calendar.family">
      <div class="hint">The condition text ("Partly cloudy", "Rainy"...) is translated automatically via assets/ha_labels/&lt;lang&gt;.json — no field needed here.</div>
    `;
  } else if (type === 'vacuum') {
    container.innerHTML = `
      <label>Name (optional, defaults to the entity's friendly name)</label><input type="text" id="optName" placeholder="e.g., Robot vacuum">
      <label>Vacuum entity ID</label><input type="text" id="optEntityId" placeholder="e.g., vacuum.roborock">
      <label>Map image entity (optional)</label><input type="text" id="optMapImage" placeholder="e.g., image.roborock_map">
      <label>Map rotation (degrees clockwise)</label><input type="number" id="optMapRotation" value="0" step="90">
      <label>Map height (px)</label><input type="number" id="optMapHeight" value="200" min="0">
      <div id="vacuumRoomsList"></div>
      <div class="section-box" style="margin-top:8px">
        <label>Room name</label><input type="text" id="vrName" placeholder="e.g., Kitchen">
        <label>Room / segment ID (from your map)</label><input type="number" id="vrId" placeholder="e.g., 18">
        <button type="button" class="secondary" onclick="addVacuumRoom()">+ Add room to this card</button>
      </div>
      <div class="hint">Add every room, then click "Add card to page" once below. The vacuum's state ("Cleaning", "Docked"...) is translated automatically via assets/ha_labels/&lt;lang&gt;.json.</div>
    `;
    window._pendingVacuumRooms = window._pendingVacuumRooms || [];
    renderVacuumRoomsList();
  } else {
    // Advanced / custom: raw options JSON, and free type name if "custom"
    container.innerHTML = `
      ${type === 'custom' ? `<label>Card type string</label><input type="text" id="optCustomType" placeholder="e.g., my_new_card">` : ''}
      <label>Options (raw JSON — see the card's Kotlin file for its exact fields)</label>
      <textarea id="optRawJson" rows="4" placeholder='{"entity_id": "..."}'>{}</textarea>
      <div class="hint">This card type isn't fully modeled in the builder yet — paste the options object directly.</div>
    `;
  }
}

let editingGridItem = null; // index of the button/scene being edited within _pendingGridItems, or null

function renderGridItemsList(type) {
  const list = document.getElementById('gridItemsList');
  if (!list) return;
  list.innerHTML = '';
  (window._pendingGridItems || []).forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${item.name || '(unnamed)'}</span><span><span class="remove" style="color:#00E5FF" onclick="editGridItem('${type}', ${i})">✎</span> <span class="remove" onclick="removeGridItem('${type}', ${i})">✕</span></span>`;
    list.appendChild(el);
  });
}

function fillGridItemForm(type, item) {
  document.getElementById('giName').value = item.name || '';
  document.getElementById('giIcon').value = item.icon || '';
  if (type === 'button_grid') {
    document.getElementById('giService').value = item.service || '';
    document.getElementById('giEntityId').value = item.entity_id || '';
    document.getElementById('giData').value = item.data ? JSON.stringify(item.data) : '';
  } else {
    document.getElementById('giEntityId').value = item.entity_id || '';
    document.getElementById('giPage').value = item.page || '';
    document.getElementById('giActivityId').value = item.activityId || '';
    const irSel = document.getElementById('giIrActivity');
    if (irSel) irSel.value = item.irActivity || '';
    document.getElementById('giColor').value = item.color || '';
  }
}

function editGridItem(type, i) {
  editingGridItem = i;
  fillGridItemForm(type, window._pendingGridItems[i]);
  document.getElementById('giSubmitBtn').textContent = `Save ${type === 'button_grid' ? 'button' : 'scene'}`;
  document.getElementById('giCancelBtn').style.display = '';
}

function cancelGridItemEdit() {
  editingGridItem = null;
  document.getElementById('giName').value = '';
  document.getElementById('giIcon').value = '';
  ['giService', 'giEntityId', 'giData', 'giPage', 'giActivityId', 'giIrActivity', 'giColor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const btn = document.getElementById('giSubmitBtn');
  if (btn) btn.textContent = btn.textContent.replace(/^Save/, '+ Add');
  document.getElementById('giCancelBtn').style.display = 'none';
}

function addGridItem(type) {
  const name = document.getElementById('giName').value.trim();
  const icon = document.getElementById('giIcon').value.trim();
  let item = { name };
  if (icon) item.icon = icon;
  if (type === 'button_grid') {
    item.service = document.getElementById('giService').value.trim();
    const entityId = document.getElementById('giEntityId').value.trim();
    if (entityId) item.entity_id = entityId;
    const rawData = document.getElementById('giData').value.trim();
    if (rawData) {
      try { item.data = JSON.parse(rawData); } catch (e) { alert('Extra data must be valid JSON'); return; }
    }
  } else {
    const entityId = document.getElementById('giEntityId').value.trim();
    const page = document.getElementById('giPage').value.trim();
    const activityId = document.getElementById('giActivityId').value.trim();
    const irActivity = document.getElementById('giIrActivity')?.value || '';
    const color = document.getElementById('giColor').value.trim();
    if (entityId) item.entity_id = entityId;
    if (page) item.page = page;
    if (activityId) item.activityId = activityId;
    if (irActivity) item.irActivity = irActivity;
    if (color) item.color = color;
  }
  window._pendingGridItems = window._pendingGridItems || [];
  if (editingGridItem !== null) {
    window._pendingGridItems[editingGridItem] = item;
  } else {
    window._pendingGridItems.push(item);
  }
  cancelGridItemEdit();
  renderGridItemsList(type);
}

function removeGridItem(type, i) {
  window._pendingGridItems.splice(i, 1);
  if (editingGridItem === i) cancelGridItemEdit();
  renderGridItemsList(type);
}

// Fake example entity — used to preview a `climate` card that has no
// hvac_modes/fan_modes/swing_modes override, so the builder still shows a
// realistic result instead of an empty shell. Based on a real Daikin unit.

function renderVacuumRoomsList() {
  const list = document.getElementById('vacuumRoomsList');
  if (!list) return;
  list.innerHTML = '';
  (window._pendingVacuumRooms || []).forEach((room, i) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${room.name || '(unnamed)'} — id ${room.id}</span><span class="remove" onclick="removeVacuumRoom(${i})">✕</span>`;
    list.appendChild(el);
  });
}

function addVacuumRoom() {
  const name = document.getElementById('vrName').value.trim();
  const idRaw = document.getElementById('vrId').value.trim();
  const id = parseInt(idRaw, 10);
  if (!name || isNaN(id)) { alert('Room needs a name and a numeric ID'); return; }
  window._pendingVacuumRooms = window._pendingVacuumRooms || [];
  window._pendingVacuumRooms.push({ name, id });
  document.getElementById('vrName').value = '';
  document.getElementById('vrId').value = '';
  renderVacuumRoomsList();
}

function removeVacuumRoom(i) {
  window._pendingVacuumRooms.splice(i, 1);
  updateCardFormInputs();
}

function editCard(idx) {
  const card = dashboardData.pages[currentActivePage].cards[idx];
  editingCard = idx;
  document.getElementById('pageSelect').value = currentActivePage;

  const select = document.getElementById('cardTypeSelect');
  const known = Array.from(select.options).map(o => o.value).filter(v => v !== 'custom');
  select.value = known.includes(card.type) ? card.type : 'custom';
  updateCardFormInputs();
  fillCardForm(card);

  document.getElementById('addCardBtn').innerText = 'Save changes';
  document.getElementById('cancelCardEditBtn').style.display = 'inline-block';
  document.getElementById('dynamicCardInputs').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function fillCardForm(card) {
  const type = card.type;
  const o = card.options || {};
  if (NAME_ENTITY_TYPES.includes(type)) {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optIcon').value = o.icon || '';
  } else if (type === 'fan') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optFanStyle').value = ['simple', 'full'].includes(o.style) ? o.style : 'auto';
    document.getElementById('optFanPresetModes').value = (o.preset_modes || []).join(',');
    document.getElementById('optFanStep').value = o.step ?? 20;
    document.getElementById('optFanShowCaptions').checked = o.show_captions !== false;
  } else if (type === 'climate') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optHvacModes').value = (o.hvac_modes || []).join(',');
    document.getElementById('optHvacModeStyle').value = o.hvac_mode_style === 'label' ? 'label' : 'icons';
    document.getElementById('optFanModes').value = (o.fan_modes || []).join(',');
    document.getElementById('optFanModeStyle').value = o.fan_mode_style === 'icons' ? 'icons' : 'label';
    document.getElementById('optSwingModes').value = (o.swing_modes || []).join(',');
    document.getElementById('optSwingModeStyle').value = o.swing_mode_style === 'icons' ? 'icons' : 'label';
    document.getElementById('optShowCaptions').checked = o.show_captions !== false;
  } else if (type === 'button_grid' || type === 'scene_grid') {
    document.getElementById('optColumns').value = o.columns || 2;
    if (type === 'scene_grid') document.getElementById('optShowLabels').checked = o.show_labels !== false;
    window._pendingGridItems = JSON.parse(JSON.stringify(o.buttons || o.scenes || []));
    renderGridItemsList(type);
  } else if (type === 'apple_tv_remote') {
    document.getElementById('optDeviceId').value = o.deviceId || '';
  } else if (type === 'tv_remote') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optRemoteEntity').value = o.remote_entity || '';
    document.getElementById('optMediaEntity').value = o.media_entity || '';
    document.getElementById('optMuteEntity').value = o.mute_entity || '';
  } else if (type === 'clock_weather') {
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optTimeFormat').value = (o.time_format === 24) ? '24' : '12';
    document.getElementById('optForecastRows').value = (o.forecast_rows ?? 4);
    document.getElementById('optCalendarEntity').value = o.calendar_entity || '';
  } else if (type === 'vacuum') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optMapImage').value = o.map_image || '';
    document.getElementById('optMapRotation').value = o.map_rotation ?? 0;
    document.getElementById('optMapHeight').value = o.map_height ?? 200;
    window._pendingVacuumRooms = JSON.parse(JSON.stringify(o.rooms || []));
    renderVacuumRoomsList();
  } else {
    const customField = document.getElementById('optCustomType');
    if (customField) customField.value = type;
    document.getElementById('optRawJson').value = JSON.stringify(o, null, 2);
  }
}

function cancelCardEdit() {
  editingCard = null;
  window._pendingGridItems = [];
  window._pendingVacuumRooms = [];
  document.getElementById('addCardBtn').innerText = 'Add card to page';
  document.getElementById('cancelCardEditBtn').style.display = 'none';
  updateCardFormInputs();
}

function addCardToPage() {
  const pageIndex = document.getElementById('pageSelect').value;
  const type = document.getElementById('cardTypeSelect').value;
  let newCard = { type: type, options: {} };

  if (NAME_ENTITY_TYPES.includes(type)) {
    newCard.options.name = document.getElementById('optName').value || 'Component';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'domain.entity';
    const icon = document.getElementById('optIcon').value.trim();
    if (icon) newCard.options.icon = icon;
  } else if (type === 'fan') {
    newCard.options.name = document.getElementById('optName').value || 'Fan';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'fan.entity';
    if (document.getElementById('optFanStyle').value !== 'auto') newCard.options.style = document.getElementById('optFanStyle').value;
    const presetModes = document.getElementById('optFanPresetModes').value.trim();
    if (presetModes) newCard.options.preset_modes = presetModes.split(',').map(s => s.trim()).filter(Boolean);
    const step = parseInt(document.getElementById('optFanStep').value, 10);
    if (!isNaN(step) && step !== 20) newCard.options.step = step;
    if (!document.getElementById('optFanShowCaptions').checked) newCard.options.show_captions = false;
  } else if (type === 'climate') {
    newCard.options.name = document.getElementById('optName').value || 'Climate';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'climate.entity';
    const hvacModes = document.getElementById('optHvacModes').value.trim();
    if (hvacModes) newCard.options.hvac_modes = hvacModes.split(',').map(s => s.trim()).filter(Boolean);
    if (document.getElementById('optHvacModeStyle').value === 'label') newCard.options.hvac_mode_style = 'label';
    const fanModes = document.getElementById('optFanModes').value.trim();
    if (fanModes) newCard.options.fan_modes = fanModes.split(',').map(s => s.trim()).filter(Boolean);
    if (document.getElementById('optFanModeStyle').value === 'icons') newCard.options.fan_mode_style = 'icons';
    const swingModes = document.getElementById('optSwingModes').value.trim();
    if (swingModes) newCard.options.swing_modes = swingModes.split(',').map(s => s.trim()).filter(Boolean);
    if (document.getElementById('optSwingModeStyle').value === 'icons') newCard.options.swing_mode_style = 'icons';
    if (!document.getElementById('optShowCaptions').checked) newCard.options.show_captions = false;
  } else if (type === 'button_grid') {
    newCard.options.columns = parseInt(document.getElementById('optColumns').value, 10) || 2;
    newCard.options.buttons = window._pendingGridItems || [];
    window._pendingGridItems = [];
  } else if (type === 'scene_grid') {
    newCard.options.columns = parseInt(document.getElementById('optColumns').value, 10) || 2;
    newCard.options.scenes = window._pendingGridItems || [];
    if (!document.getElementById('optShowLabels').checked) newCard.options.show_labels = false;
    window._pendingGridItems = [];
  } else if (type === 'apple_tv_remote') {
    newCard.options.deviceId = document.getElementById('optDeviceId').value || '';
  } else if (type === 'tv_remote') {
    newCard.options.name = document.getElementById('optName').value || 'TV';
    newCard.options.remote_entity = document.getElementById('optRemoteEntity').value || '';
    const mediaEntity = document.getElementById('optMediaEntity').value.trim();
    const muteEntity = document.getElementById('optMuteEntity').value.trim();
    if (mediaEntity) newCard.options.media_entity = mediaEntity;
    if (muteEntity) newCard.options.mute_entity = muteEntity;
  } else if (type === 'clock_weather') {
    newCard.options.entity_id = document.getElementById('optEntityId').value.trim() || 'weather.forecast_home';
    newCard.options.time_format = parseInt(document.getElementById('optTimeFormat').value, 10) || 12;
    newCard.options.forecast_rows = parseInt(document.getElementById('optForecastRows').value, 10);
    if (isNaN(newCard.options.forecast_rows)) newCard.options.forecast_rows = 4;
    const calendarEntity = document.getElementById('optCalendarEntity').value.trim();
    if (calendarEntity) newCard.options.calendar_entity = calendarEntity;
  } else if (type === 'vacuum') {
    const vName = document.getElementById('optName').value.trim();
    if (vName) newCard.options.name = vName;
    newCard.options.entity_id = document.getElementById('optEntityId').value.trim() || 'vacuum.entity';
    const mapImage = document.getElementById('optMapImage').value.trim();
    if (mapImage) newCard.options.map_image = mapImage;
    const mapRotation = parseInt(document.getElementById('optMapRotation').value, 10);
    if (!isNaN(mapRotation) && mapRotation !== 0) newCard.options.map_rotation = mapRotation;
    const mapHeight = parseInt(document.getElementById('optMapHeight').value, 10);
    newCard.options.map_height = isNaN(mapHeight) ? 200 : mapHeight;
    newCard.options.rooms = window._pendingVacuumRooms || [];
    window._pendingVacuumRooms = [];
  } else {
    if (type === 'custom') newCard.type = document.getElementById('optCustomType').value.trim() || 'custom';
    try {
      newCard.options = JSON.parse(document.getElementById('optRawJson').value || '{}');
    } catch (e) { alert('Options must be valid JSON'); return; }
  }

  if (editingCard !== null) {
    dashboardData.pages[pageIndex].cards[editingCard] = newCard;
    cancelCardEdit();
  } else {
    dashboardData.pages[pageIndex].cards.push(newCard);
    updateCardFormInputs();
  }
  renderPreview(); updateJsonOutput();
}


function removeCard(idx) {
  dashboardData.pages[currentActivePage].cards.splice(idx, 1);
  if (editingCard === idx) cancelCardEdit();
  renderPreview(); updateJsonOutput();
}
