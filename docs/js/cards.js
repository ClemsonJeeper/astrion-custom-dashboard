// ---- Cards ---------------------------------------------------------------

const NAME_ENTITY_TYPES = ['source_select'];

function updateCardFormInputs() {
  const type = document.getElementById('cardTypeSelect').value;
  const container = document.getElementById('dynamicCardInputs');

  if (NAME_ENTITY_TYPES.includes(type)) {
    container.innerHTML = `
      <label>Name</label><input type="text" id="optName" placeholder="e.g., Living Room">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., light.living_room">
      ${iconFieldHtml('optIcon')}
    `;
  } else if (type === 'title') {
    container.innerHTML = `
      <label>Title</label><input type="text" id="optTitle" placeholder="e.g., Living Room">
      <label>Subtitle (optional)</label><input type="text" id="optSubtitle" placeholder="e.g., 3 lights on">
      <label>Alignment</label>
      <select id="optTitleAlignment">
        <option value="start">Start (left)</option>
        <option value="center">Center</option>
        <option value="end">End (right)</option>
        <option value="justify">Justify</option>
      </select>
      ${iconFieldHtml('optTitleIcon')}
      <label class="inline-check"><input type="checkbox" id="optTitleDivider"> Divider line (fills the rest of the row after the title)</label>
      <label>Color (optional, ARGB/RGB hex — defaults to the standard title color, also tints the divider line)</label><input type="text" id="optTitleColor" placeholder="#7FB3C4">
      <div class="hint">A section header for grouping the cards below it — no entity of its own. Setting an icon or the divider always left-aligns the title row regardless of Alignment (that layout has no sensible centered/right-aligned form) — the subtitle below is unaffected. For a tappable title/subtitle (e.g. a "see all" link to another page), use "Other / custom type…" below instead and add title_page / subtitle_page — or any of scene_grid's other action fields with a title_/subtitle_ prefix — directly in the JSON; like every type here, re-saving through this simple form overwrites the card's options from scratch, so those fields wouldn't survive a later edit through it.</div>
    `;
  } else if (type === 'switch') {
    container.innerHTML = `
      <label>Name</label><input type="text" id="optName" placeholder="e.g., Living Room">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., switch.living_room">
      <label>"On" color (optional, ARGB hex — defaults to green)</label>${colorFieldHtml('optOnColor', '', '#FF2E5A46')}
      ${iconFieldHtml('optIcon')}
    `;
  } else if (type === 'cover') {
    container.innerHTML = `
      <label>Name (optional, defaults to the entity's friendly name)</label><input type="text" id="optName" placeholder="e.g., Volet Chambre">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., cover.volet_chambre">
      ${iconFieldHtml('optIcon')}
      <label>Layout</label>
      <select id="optCoverLayout">
        <option value="default">Default (icon + name/state, controls full-width below)</option>
        <option value="horizontal">Horizontal (icon + name/state left, controls right)</option>
        <option value="vertical">Vertical (icon, name, state, controls — all centered/stacked)</option>
      </select>
      <label>Controls (Mushroom-style — same options as the Home Assistant Mushroom cover card)</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optCoverCtrlButtons" checked> Buttons (open/stop/close)</label>
        <label class="inline-check"><input type="checkbox" id="optCoverCtrlPosition"> Position slider</label>
        <label class="inline-check"><input type="checkbox" id="optCoverCtrlTilt"> Tilt slider</label>
      </div>
      <div class="hint">Status shows "Open"/"Closed" at 0%/100%, otherwise "N% open" — translated automatically in the app. Up/down buttons auto-disable once fully open/closed. If several controls are checked, only one shows at a time on the card — a small button cycles through them, same as Mushroom. Position/tilt sliders only appear if the entity actually reports that attribute.</div>
    `;
  } else if (type === 'select') {
    container.innerHTML = `
      <label>Name (optional, defaults to the entity's friendly name)</label><input type="text" id="optName" placeholder="e.g., Living room output">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., input_select.video_output_living_room">
      <label>Icon color (optional, hex — tints the icon, same as the Mushroom select card's own icon_color)</label><input type="text" id="optSelectIconColor" placeholder="#6EA8FE">
      <label>Layout</label>
      <select id="optSelectLayout">
        <option value="default">Default (icon + name/state, control full-width below)</option>
        <option value="horizontal">Horizontal (icon + name/state left, control right)</option>
        <option value="vertical">Vertical (icon, name, state, control — all centered/stacked)</option>
      </select>
      <div class="hint">For any input_select.* or select.* entity — shows the current option and, tapped, a dropdown of every option from the entity's own list; picking one calls the right select_option service automatically. For a media_player's own source list (HDMI inputs, apps, etc.) use "Source selector (source_select)" instead — that one reads a different HA attribute/service and won't work here.</div>
    `;
  } else if (type === 'light') {
    container.innerHTML = `
      <label>Name (optional, defaults to the entity's friendly name)</label><input type="text" id="optName" placeholder="e.g., Kitchen">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., light.kitchen">
      <label>Layout</label>
      <select id="optLightLayout">
        <option value="default">Default (icon + name/state, controls full-width below)</option>
        <option value="horizontal">Horizontal (icon + name/state, controls right)</option>
        <option value="vertical">Vertical (icon, name, state, controls — centered/stacked)</option>
      </select>
      <label><input type="checkbox" id="optLightUseColor"> Tint the icon with the light's own colour (when it reports one)</label>
      <label><input type="checkbox" id="optLightShowBrightness" checked> Show brightness ("N%") instead of just "On"</label>
      <label>Controls (Mushroom-style — same options as the Home Assistant Mushroom light card)</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optLightCtrlBrightness" checked> Brightness slider</label>
        <label class="inline-check"><input type="checkbox" id="optLightCtrlColorTemp"> Colour temperature slider</label>
        <label class="inline-check"><input type="checkbox" id="optLightCtrlColor"> Colour swatches</label>
      </div>
      <label><input type="checkbox" id="optLightCollapsible"> Hide the controls area entirely while the light is off</label>
      <div class="hint">Tap toggles the light; long-press opens the brightness/colour detail popup. Status shows "Éteint"/"Off" at 0%, otherwise the live "N%" brightness — translated automatically in the app. If several controls are checked, only one shows at a time on the card — a small button cycles through them, same as Mushroom. Colour temperature/swatches only appear if the entity actually supports them.</div>
    `;
  } else if (type === 'media_player') {
    container.innerHTML = `
      <label>Name (optional override — otherwise the media title/friendly name is used)</label><input type="text" id="optName" placeholder="e.g., Salon">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., media_player.nest_hub_max_salon">
      <label>Variant</label>
      <select id="optMediaVariant">
        <option value="compact">Compact (Mushroom-style tile, for a grid/list of players)</option>
        <option value="full">Full (big album art + progress bar, for a dedicated media page)</option>
      </select>
      <label><input type="checkbox" id="optMediaUseInfo" checked> Show what's playing (title/artist/app) instead of just the friendly name/state</label>
      <label><input type="checkbox" id="optMediaShowVolume"> Append the volume level ("⸱ N%") to the state line</label>
      <label>Transport controls (shown in the compact tile's control row / full page's main row)</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlOnOff"> Power</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlShuffle"> Shuffle</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlPrevious" checked> Previous</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlPlayPause" checked> Play/Pause</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlNext" checked> Next</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlRepeat"> Repeat</label>
      </div>
      <label>Volume controls</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optMediaVolMute" checked> Mute</label>
        <label class="inline-check"><input type="checkbox" id="optMediaVolButtons" checked> -/+ buttons</label>
        <label class="inline-check"><input type="checkbox" id="optMediaVolSet"> Slider</label>
      </div>
      <div class="hint">Every button above is still hidden automatically when the entity doesn't actually support it (checked live against its <code>supported_features</code>) — these checkboxes just control what's requested. In the compact tile, transport and volume controls share one row with a small swap button when both are present.</div>
      <div id="mediaTopButtonsField" style="display:none">
        <label>Top buttons (full variant only — optional, JSON array)</label>
        <textarea id="optMediaTopButtons" rows="3" placeholder='[{"name":"Group","service":"media_player.join","entity_id":"media_player.salon","data":{"group_members":["media_player.cuisine"]}}]'>[]</textarea>
        <div class="hint">Each entry fires an arbitrary service call as a full-width button above the album art — e.g. speaker grouping.</div>
      </div>
    `;
    document.getElementById('optMediaVariant').addEventListener('change', updateMediaTopButtonsVisibility);
    updateMediaTopButtonsVisibility();
  } else if (type === 'camera') {
    container.innerHTML = `
      <label>Name (optional, defaults to the entity's friendly name)</label><input type="text" id="optName" placeholder="e.g., Front Door">
      <label>Entity ID</label><input type="text" id="optEntityId" placeholder="e.g., camera.front_door">
      <label>Mode</label>
      <select id="optCameraMode">
        <option value="stream">Live stream (MJPEG — real motion)</option>
        <option value="snapshot">Snapshot only (refresh a still — lowest CPU)</option>
      </select>
      <label>Snapshot interval (seconds — snapshot mode, and stream-drop fallback)</label><input type="number" id="optCameraInterval" value="2" min="1" max="60">
      <label>Aspect ratio (width ÷ height)</label>
      <select id="optCameraAspect">
        <option value="1.7778">16:9 (widescreen)</option>
        <option value="1.3333">4:3 (standard)</option>
        <option value="1">1:1 (square)</option>
        <option value="0.75">3:4 (portrait)</option>
      </select>
      <label>Fit</label>
      <select id="optCameraFit">
        <option value="cover">Cover (fill the card, crop edges)</option>
        <option value="contain">Contain (show the whole frame, letterbox)</option>
      </select>
      <div class="hint">"Live stream" decodes Home Assistant's MJPEG feed for real motion; if it stalls it auto-falls-back to still snapshots, then retries. If a camera feels laggy on the remote, switch that card to "Snapshot only" — no reinstall needed. The preview below pulls one real frame from this device when it's connected to HA.</div>
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
          <label>Harmony action (optional) — OR —</label>
          <select id="giHarmonyMode" onchange="onGiHarmonyModeChange()">
            <option value="">— none —</option>
            <option value="activity">Activity</option>
            <option value="command">Device command</option>
          </select>
          <div id="giHarmonyPicker"></div>
          <label>IR device + command (sends locally, no hub needed) — OR —</label>
          <select id="giIrDevice" onchange="onGiIrDeviceChange()">
            <option value="">— none —</option>
            ${(dashboardData.irDevices || []).map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
          <select id="giIrCommand"><option value="">— select a device first —</option></select>
          ${(dashboardData.irDevices || []).length === 0 ? '<div class="hint">No IR devices yet — create one in the "IR Devices" section below, then come back here.</div>' : ''}
          <label>Composed Activity (sequences multiple devices) — OR —</label>
          <select id="giActivityRef">
            <option value="">— none —</option>
            ${(dashboardData.activities || []).map(a => `<option value="${a.id}">${a.name} (${a.room})</option>`).join('')}
          </select>
          ${(dashboardData.activities || []).length === 0 ? '<div class="hint">No Activities yet — create one in the "Activities" section below for multi-device setups (e.g. IR-only, no Harmony/HA).</div>' : ''}
          <label>Color (optional, ARGB hex — defaults to the standard tile color)</label>${colorFieldHtml('giColor', '', '#66009688')}
          <div class="divider" style="margin:12px 0"></div>
          <label><input type="checkbox" id="giTrack" onchange="onGiTrackChange()"> Track as Activity</label>
          <div class="hint">Makes this tile show up as the active AV Activity for its room — see ActivityRuntime. At most one tracked Activity is active per room at a time. Not needed if you picked a Composed Activity above — that's always tracked automatically, using its own room.</div>
          <div id="giRoomField" style="display:none">
            <label>Room</label><input type="text" id="giRoom" placeholder="e.g., Living Room">
            <label>Physical devices this Activity involves (optional — IR/Harmony device ids, comma-separated)</label>
            <input type="text" id="giDevices" placeholder="e.g., samsung_hw_m550, lg_oled_65b8">
            <div class="hint">Lets a later *composed* Activity in the same room know this device was already on, so it doesn't needlessly re-toggle it (matters most for a device with only a Power Toggle command, no discrete on/off). Especially worth setting for a Harmony-backed tile — Astrion has no other way to know which physical devices a Harmony Activity touches.</div>
          </div>
        `}
        ${iconFieldHtml('giIcon')}
        <button type="button" class="secondary" onclick="addGridItem('${type}')" id="giSubmitBtn">+ Add ${label.toLowerCase()} to this card</button>
        <button type="button" class="secondary" onclick="cancelGridItemEdit()" id="giCancelBtn" style="display:none">Cancel edit</button>
      </div>
      <div class="hint">Click a ${label.toLowerCase()} below to edit it. Add every ${label.toLowerCase()}, then click "Add card to page" once below.</div>
    `;
    window._pendingGridItems = window._pendingGridItems || [];
    renderGridItemsList(type);
  } else if (type === 'apple_tv_remote') {
    container.innerHTML = `<div id="atvHarmonyPicker"></div>`;
    renderAppleTvHarmonyFields();
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

  // Attach live entity autocomplete to whichever entity_id fields this card
  // type created. Only attaches when /ha-states data is available (device mode
  // + HA connected); otherwise the inputs stay plain text fields.
  const mainDomain = type === 'clock_weather' ? 'weather'
    : type === 'source_select' ? null
    : type === 'select' ? ['select', 'input_select']
    : type;
  ['optEntityId', 'optRemoteEntity', 'optMediaEntity', 'optMuteEntity',
    'optCalendarEntity', 'optMapImage', 'giEntityId'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const dom = id === 'optEntityId' ? mainDomain
      : id === 'optRemoteEntity' ? 'remote'
      : id === 'optMediaEntity' ? 'media_player'
      : id === 'optMuteEntity' ? 'media_player'
      : id === 'optCalendarEntity' ? 'calendar'
      : id === 'optMapImage' ? 'image'
      : null; // giEntityId — any domain (scene.*, script.*, media_player.*, …)
    attachEntityAutocomplete(el, dom);
  });
}

// media_player card: top_buttons only make sense on the "full" variant
// (the compact tile has no room for them) — hide the field otherwise.
function updateMediaTopButtonsVisibility() {
  const variantEl = document.getElementById('optMediaVariant');
  const field = document.getElementById('mediaTopButtonsField');
  if (!variantEl || !field) return;
  field.style.display = variantEl.value === 'full' ? '' : 'none';
}

let editingGridItem = null; // index of the button/scene being edited within _pendingGridItems, or null

function onGiTrackChange() {
  const checked = document.getElementById('giTrack').checked;
  document.getElementById('giRoomField').style.display = checked ? '' : 'none';
}

function onGiIrDeviceChange() {
  const deviceId = document.getElementById('giIrDevice').value;
  const cmdSel = document.getElementById('giIrCommand');
  const device = (dashboardData.irDevices || []).find(d => d.id === deviceId);
  if (!device) { cmdSel.innerHTML = '<option value="">— select a device first —</option>'; return; }
  cmdSel.innerHTML = '<option value="">— select a command —</option>' +
    Object.entries(device.commands).map(([id, c]) => `<option value="${id}">${id} — ${c.label || id}</option>`).join('');
}

function renderAppleTvHarmonyFields() {
  const container = document.getElementById('atvHarmonyPicker');
  if (!container) return;
  if (harmonyAvailable) {
    renderHarmonyHubSelect(container, 'device', 'atv');
  } else {
    container.innerHTML = `<label>Device ID (Harmony)</label><input type="text" id="optDeviceId" placeholder="e.g., 62846050">`;
  }
}

async function fillAppleTvHarmonyFields(o) {
  renderAppleTvHarmonyFields();
  if (harmonyAvailable) {
    document.getElementById('atvHub').value = o.hub || '';
    if (o.hub) {
      await onHarmonyHubChange('device', 'atv');
      document.getElementById('atvDeviceSelect').value = o.deviceId || '';
    }
  } else {
    document.getElementById('optDeviceId').value = o.deviceId || '';
  }
}

function onGiHarmonyModeChange() {
  const mode = document.getElementById('giHarmonyMode').value;
  const container = document.getElementById('giHarmonyPicker');
  if (!mode) { container.innerHTML = ''; return; }
  if (harmonyAvailable) {
    renderHarmonyHubSelect(container, mode, 'gi');
  } else if (mode === 'activity') {
    container.innerHTML = `<label>Harmony activity ID</label><input type="text" id="giActivityId" placeholder="e.g., 39568252 (or -1 for Off)">`;
  } else {
    container.innerHTML = `
      <label>Harmony device ID</label><input type="text" id="giHarmonyDevice" placeholder="e.g., 62845789">
      <label>Harmony command</label><input type="text" id="giHarmonyCommand" placeholder="e.g., VolumeUp">
    `;
  }
}

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
  updateIconThumb('giIcon');
  if (type === 'button_grid') {
    document.getElementById('giService').value = item.service || '';
    document.getElementById('giEntityId').value = item.entity_id || '';
    document.getElementById('giData').value = item.data ? JSON.stringify(item.data) : '';
  } else {
    document.getElementById('giEntityId').value = item.entity_id || '';
    document.getElementById('giPage').value = item.page || '';
    if (item.irDevice) {
      document.getElementById('giIrDevice').value = item.irDevice;
      onGiIrDeviceChange();
      document.getElementById('giIrCommand').value = item.irCommand || '';
    }
    const actRefSel = document.getElementById('giActivityRef');
    if (actRefSel) actRefSel.value = item.activity || '';
    setColorFieldValue('giColor', item.color || '');
    document.getElementById('giTrack').checked = item.track === true;
    document.getElementById('giRoom').value = item.room || '';
    document.getElementById('giDevices').value = (item.devices || []).join(', ');
    onGiTrackChange();
  }
}

/**
 * Restores a scene/button item's Harmony fields into the form when editing.
 * Deliberately does NOT default `hub` to "the first configured hub" when the
 * item has none — with more than one hub configured, guessing is exactly
 * the kind of silent wrong-hub bug that bit us before. An item saved before
 * `hub` was mandatory just shows the Hub select empty, forcing an explicit
 * pick before it can be saved again (see the validation in addGridItem()).
 */
async function fillGiHarmonySection(item) {
  const modeSel = document.getElementById('giHarmonyMode');
  if (!modeSel) return; // button_grid form has no Harmony section
  const mode = item.activityId ? 'activity' : (item.harmonyDevice && item.harmonyCommand) ? 'command' : '';
  modeSel.value = mode;
  onGiHarmonyModeChange();
  if (!mode) return;
  if (harmonyAvailable) {
    document.getElementById('giHub').value = item.hub || '';
    if (item.hub) {
      await onHarmonyHubChange(mode, 'gi');
      if (mode === 'activity') {
        document.getElementById('giActivitySelect').value = item.activityId || '';
      } else {
        document.getElementById('giDeviceSelect').value = item.harmonyDevice || '';
        onHarmonyDeviceChange('gi');
        document.getElementById('giCommandSelect').value = item.harmonyCommand || '';
      }
    }
  } else if (mode === 'activity') {
    document.getElementById('giActivityId').value = item.activityId || '';
  } else {
    document.getElementById('giHarmonyDevice').value = item.harmonyDevice || '';
    document.getElementById('giHarmonyCommand').value = item.harmonyCommand || '';
  }
}

async function editGridItem(type, i) {
  editingGridItem = i;
  const item = window._pendingGridItems[i];
  fillGridItemForm(type, item);
  if (type !== 'button_grid') await fillGiHarmonySection(item);
  document.getElementById('giSubmitBtn').textContent = `Save ${type === 'button_grid' ? 'button' : 'scene'}`;
  document.getElementById('giCancelBtn').style.display = '';
}

function cancelGridItemEdit() {
  editingGridItem = null;
  document.getElementById('giName').value = '';
  document.getElementById('giIcon').value = '';
  updateIconThumb('giIcon');
  ['giService', 'giEntityId', 'giData', 'giPage', 'giIrDevice', 'giIrCommand', 'giActivityRef'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setColorFieldValue('giColor', '');
  const trackEl = document.getElementById('giTrack');
  if (trackEl) { trackEl.checked = false; document.getElementById('giRoom').value = ''; document.getElementById('giDevices').value = ''; onGiTrackChange(); }
  const harmonyModeSel = document.getElementById('giHarmonyMode');
  if (harmonyModeSel) { harmonyModeSel.value = ''; onGiHarmonyModeChange(); }
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
    const irDevice = document.getElementById('giIrDevice')?.value || '';
    const irCommand = document.getElementById('giIrCommand')?.value || '';
    const activityRef = document.getElementById('giActivityRef')?.value || '';
    const color = colorFieldValue('giColor');
    if (entityId) item.entity_id = entityId;
    if (page) item.page = page;
    if (irDevice && irCommand) { item.irDevice = irDevice; item.irCommand = irCommand; }
    else if (irDevice && !irCommand) { alert('Pick an IR command, or clear the IR device field.'); return; }
    if (activityRef) item.activity = activityRef;
    if (color) item.color = color;

    const harmonyMode = document.getElementById('giHarmonyMode')?.value || '';
    if (harmonyMode === 'activity') {
      if (harmonyAvailable) {
        const hub = document.getElementById('giHub').value.trim();
        const activityId = document.getElementById('giActivitySelect').value.trim();
        if (!hub || !activityId) { alert('Pick a hub and an activity.'); return; }
        item.hub = hub;
        item.activityId = activityId;
      } else {
        const activityId = document.getElementById('giActivityId').value.trim();
        if (activityId) item.activityId = activityId;
      }
    } else if (harmonyMode === 'command') {
      if (harmonyAvailable) {
        const hub = document.getElementById('giHub').value.trim();
        const device = document.getElementById('giDeviceSelect').value.trim();
        const command = document.getElementById('giCommandSelect').value.trim();
        if (!hub || !device || !command) { alert('Pick a hub, a device, and a command.'); return; }
        item.hub = hub;
        item.harmonyDevice = device;
        item.harmonyCommand = command;
      } else {
        item.harmonyDevice = document.getElementById('giHarmonyDevice').value.trim();
        item.harmonyCommand = document.getElementById('giHarmonyCommand').value.trim();
      }
    }

    const track = document.getElementById('giTrack')?.checked || false;
    if (track) {
      const room = document.getElementById('giRoom').value.trim();
      if (!room) { alert('A tracked Activity needs a Room — that\'s what makes it exclusive at runtime.'); return; }
      item.track = true;
      item.room = room;
      const devices = document.getElementById('giDevices').value.split(',').map(s => s.trim()).filter(Boolean);
      if (devices.length) item.devices = devices;
    }
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

// Opens the card dialog — the single entry point for both "+ Add card" and
// the ✎ edit icon on a card in the preview, same as clicking "+ ADD CARD" or
// a card's own edit action in the Home Assistant dashboard editor.
function openCardDialog(idx) {
  editingCard = idx;
  const isNew = idx === null;
  document.getElementById('cardEditorTitle').textContent = isNew ? 'Add card' : 'Edit card';
  document.getElementById('addCardBtn').innerText = isNew ? 'Add card to page' : 'Save changes';

  const select = document.getElementById('cardTypeSelect');
  if (isNew) {
    select.value = select.options[0].value;
    updateCardFormInputs();
  } else {
    const card = dashboardData.pages[currentActivePage].cards[idx];
    const known = Array.from(select.options).map(o => o.value).filter(v => v !== 'custom');
    select.value = known.includes(card.type) ? card.type : 'custom';
    updateCardFormInputs();
    fillCardForm(card);
  }

  document.getElementById('cardEditorModal').classList.add('open');
}

function editCard(idx) {
  openCardDialog(idx);
}

function fillCardForm(card) {
  const type = card.type;
  const o = card.options || {};
  if (NAME_ENTITY_TYPES.includes(type)) {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optIcon').value = o.icon || '';
    updateIconThumb('optIcon');
  } else if (type === 'title') {
    document.getElementById('optTitle').value = o.title || '';
    document.getElementById('optSubtitle').value = o.subtitle || '';
    document.getElementById('optTitleAlignment').value = ['center', 'end', 'justify'].includes(o.alignment) ? o.alignment : 'start';
    document.getElementById('optTitleIcon').value = o.icon || '';
    updateIconThumb('optTitleIcon');
    document.getElementById('optTitleDivider').checked = o.divider === true;
    document.getElementById('optTitleColor').value = o.color || '';
  } else if (type === 'switch') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    setColorFieldValue('optOnColor', o.on_color || '');
    document.getElementById('optIcon').value = o.icon || '';
    updateIconThumb('optIcon');
  } else if (type === 'cover') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optIcon').value = o.icon || '';
    updateIconThumb('optIcon');
    document.getElementById('optCoverLayout').value = ['horizontal', 'vertical'].includes(o.layout) ? o.layout : 'default';
    // Mirrors CoverCard.kt: if none of the 3 flags are set at all, the app
    // falls back to "buttons only" — reflect that same default here.
    const hasCoverCtrlOpts = ('show_buttons_control' in o) || ('show_position_control' in o) || ('show_tilt_position_control' in o);
    document.getElementById('optCoverCtrlButtons').checked = hasCoverCtrlOpts ? (o.show_buttons_control === true) : true;
    document.getElementById('optCoverCtrlPosition').checked = o.show_position_control === true;
    document.getElementById('optCoverCtrlTilt').checked = o.show_tilt_position_control === true;
  } else if (type === 'select') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optSelectIconColor').value = o.icon_color || '';
    document.getElementById('optSelectLayout').value = ['horizontal', 'vertical'].includes(o.layout) ? o.layout : 'default';
  } else if (type === 'light') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optLightLayout').value = ['horizontal', 'vertical'].includes(o.layout) ? o.layout : 'default';
    document.getElementById('optLightUseColor').checked = o.use_light_color === true;
    document.getElementById('optLightShowBrightness').checked = o.show_brightness !== false;
    // Mirrors LightCard.kt: if none of the 3 flags are set at all, the app
    // falls back to "brightness control only" — reflect that same default here.
    const hasLightCtrlOpts = ('show_brightness_control' in o) || ('show_color_temp_control' in o) || ('show_color_control' in o);
    document.getElementById('optLightCtrlBrightness').checked = hasLightCtrlOpts ? (o.show_brightness_control === true) : true;
    document.getElementById('optLightCtrlColorTemp').checked = o.show_color_temp_control === true;
    document.getElementById('optLightCtrlColor').checked = o.show_color_control === true;
    document.getElementById('optLightCollapsible').checked = o.collapsible_controls === true;
  } else if (type === 'media_player') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optMediaVariant').value = o.variant === 'full' ? 'full' : 'compact';
    document.getElementById('optMediaUseInfo').checked = o.use_media_info !== false;
    document.getElementById('optMediaShowVolume').checked = o.show_volume_level === true;
    const mCtrls = (o.media_controls || 'previous,play_pause,next').split(',').map(s => s.trim());
    document.getElementById('optMediaCtrlOnOff').checked = mCtrls.includes('on_off');
    document.getElementById('optMediaCtrlShuffle').checked = mCtrls.includes('shuffle');
    document.getElementById('optMediaCtrlPrevious').checked = mCtrls.includes('previous');
    document.getElementById('optMediaCtrlPlayPause').checked = mCtrls.includes('play_pause');
    document.getElementById('optMediaCtrlNext').checked = mCtrls.includes('next');
    document.getElementById('optMediaCtrlRepeat').checked = mCtrls.includes('repeat');
    const vCtrls = (o.volume_controls || 'mute,buttons').split(',').map(s => s.trim());
    document.getElementById('optMediaVolMute').checked = vCtrls.includes('mute');
    document.getElementById('optMediaVolButtons').checked = vCtrls.includes('buttons');
    document.getElementById('optMediaVolSet').checked = vCtrls.includes('set');
    document.getElementById('optMediaTopButtons').value = JSON.stringify(o.top_buttons || [], null, 2);
    updateMediaTopButtonsVisibility();
  } else if (type === 'camera') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optCameraMode').value = o.mode === 'snapshot' ? 'snapshot' : 'stream';
    document.getElementById('optCameraInterval').value = o.snapshot_interval ?? 2;
    // Snap the aspect dropdown to the stored value when it matches a preset;
    // an unusual custom aspect just shows the default here (the JSON keeps its
    // own value until the card is re-saved from this form).
    const aspSel = document.getElementById('optCameraAspect');
    aspSel.value = (o.aspect != null) ? String(o.aspect) : '1.7778';
    if (!aspSel.value) aspSel.value = '1.7778';
    document.getElementById('optCameraFit').value = o.fit === 'contain' ? 'contain' : 'cover';
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
    fillAppleTvHarmonyFields(o);
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
  document.getElementById('cardEditorModal').classList.remove('open');
}

// Reorder helpers — used by the ↑/↓ buttons and by drag-and-drop in
// preview.js's enhanceCardControls().
function moveCard(idx, direction) {
  const cards = dashboardData.pages[currentActivePage].cards;
  const target = idx + direction;
  if (target < 0 || target >= cards.length) return;
  [cards[idx], cards[target]] = [cards[target], cards[idx]];
  renderPreview(); updateJsonOutput();
}

function reorderCard(fromIdx, toIdx) {
  const cards = dashboardData.pages[currentActivePage].cards;
  if (fromIdx < 0 || fromIdx >= cards.length || toIdx < 0 || toIdx >= cards.length) return;
  const [moved] = cards.splice(fromIdx, 1);
  cards.splice(toIdx, 0, moved);
  renderPreview(); updateJsonOutput();
}

function addCardToPage() {
  const pageIndex = currentActivePage;
  const type = document.getElementById('cardTypeSelect').value;
  let newCard = { type: type, options: {} };

  if (NAME_ENTITY_TYPES.includes(type)) {
    newCard.options.name = document.getElementById('optName').value || 'Component';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'domain.entity';
    const icon = document.getElementById('optIcon').value.trim();
    if (icon) newCard.options.icon = icon;
  } else if (type === 'title') {
    const title = document.getElementById('optTitle').value.trim();
    const subtitle = document.getElementById('optSubtitle').value.trim();
    if (!title && !subtitle) { alert('Set a title, a subtitle, or both.'); return; }
    if (title) newCard.options.title = title;
    if (subtitle) newCard.options.subtitle = subtitle;
    const alignment = document.getElementById('optTitleAlignment').value;
    if (alignment !== 'start') newCard.options.alignment = alignment;
    const titleIcon = document.getElementById('optTitleIcon').value.trim();
    if (titleIcon) newCard.options.icon = titleIcon;
    if (document.getElementById('optTitleDivider').checked) newCard.options.divider = true;
    const titleColor = document.getElementById('optTitleColor').value.trim();
    if (titleColor) newCard.options.color = titleColor;
  } else if (type === 'switch') {
    newCard.options.name = document.getElementById('optName').value || 'Switch';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'switch.entity';
    const onColor = colorFieldValue('optOnColor');
    if (onColor) newCard.options.on_color = onColor;
    const icon = document.getElementById('optIcon').value.trim();
    if (icon) newCard.options.icon = icon;
  } else if (type === 'cover') {
    const coverName = document.getElementById('optName').value.trim();
    if (coverName) newCard.options.name = coverName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'cover.entity';
    const coverIcon = document.getElementById('optIcon').value.trim();
    if (coverIcon) newCard.options.icon = coverIcon;
    const coverLayout = document.getElementById('optCoverLayout').value;
    if (coverLayout !== 'default') newCard.options.layout = coverLayout;
    // Written explicitly (even when checked/default) so the app's "any flag
    // present => only what's set shows" logic is unambiguous once the
    // builder has touched this card.
    newCard.options.show_buttons_control = document.getElementById('optCoverCtrlButtons').checked;
    newCard.options.show_position_control = document.getElementById('optCoverCtrlPosition').checked;
    newCard.options.show_tilt_position_control = document.getElementById('optCoverCtrlTilt').checked;
  } else if (type === 'select') {
    const selectName = document.getElementById('optName').value.trim();
    if (selectName) newCard.options.name = selectName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'input_select.entity';
    const selectIconColor = document.getElementById('optSelectIconColor').value.trim();
    if (selectIconColor) newCard.options.icon_color = selectIconColor;
    const selectLayout = document.getElementById('optSelectLayout').value;
    if (selectLayout !== 'default') newCard.options.layout = selectLayout;
  } else if (type === 'light') {
    const lightName = document.getElementById('optName').value.trim();
    if (lightName) newCard.options.name = lightName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'light.entity';
    const lightLayout = document.getElementById('optLightLayout').value;
    if (lightLayout !== 'default') newCard.options.layout = lightLayout;
    if (document.getElementById('optLightUseColor').checked) newCard.options.use_light_color = true;
    if (!document.getElementById('optLightShowBrightness').checked) newCard.options.show_brightness = false;
    // Written explicitly (even when checked/default) so the app's "any flag
    // present => only what's set shows" logic is unambiguous once the
    // builder has touched this card.
    newCard.options.show_brightness_control = document.getElementById('optLightCtrlBrightness').checked;
    newCard.options.show_color_temp_control = document.getElementById('optLightCtrlColorTemp').checked;
    newCard.options.show_color_control = document.getElementById('optLightCtrlColor').checked;
    if (document.getElementById('optLightCollapsible').checked) newCard.options.collapsible_controls = true;
  } else if (type === 'media_player') {
    const mediaName = document.getElementById('optName').value.trim();
    if (mediaName) newCard.options.name = mediaName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'media_player.entity';
    const mediaVariant = document.getElementById('optMediaVariant').value;
    if (mediaVariant === 'full') newCard.options.variant = 'full';
    if (!document.getElementById('optMediaUseInfo').checked) newCard.options.use_media_info = false;
    if (document.getElementById('optMediaShowVolume').checked) newCard.options.show_volume_level = true;
    const mediaControls = [];
    if (document.getElementById('optMediaCtrlOnOff').checked) mediaControls.push('on_off');
    if (document.getElementById('optMediaCtrlShuffle').checked) mediaControls.push('shuffle');
    if (document.getElementById('optMediaCtrlPrevious').checked) mediaControls.push('previous');
    if (document.getElementById('optMediaCtrlPlayPause').checked) mediaControls.push('play_pause');
    if (document.getElementById('optMediaCtrlNext').checked) mediaControls.push('next');
    if (document.getElementById('optMediaCtrlRepeat').checked) mediaControls.push('repeat');
    if (mediaControls.join(',') !== 'previous,play_pause,next') newCard.options.media_controls = mediaControls.join(',');
    const volumeControls = [];
    if (document.getElementById('optMediaVolMute').checked) volumeControls.push('mute');
    if (document.getElementById('optMediaVolButtons').checked) volumeControls.push('buttons');
    if (document.getElementById('optMediaVolSet').checked) volumeControls.push('set');
    if (volumeControls.join(',') !== 'mute,buttons') newCard.options.volume_controls = volumeControls.join(',');
    if (mediaVariant === 'full') {
      try {
        const topButtons = JSON.parse(document.getElementById('optMediaTopButtons').value || '[]');
        if (Array.isArray(topButtons) && topButtons.length) newCard.options.top_buttons = topButtons;
      } catch (e) {
        alert('Top buttons JSON is invalid — fix it or leave as []. Card not added.');
        return;
      }
    }
  } else if (type === 'camera') {
    const camName = document.getElementById('optName').value.trim();
    if (camName) newCard.options.name = camName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'camera.entity';
    if (document.getElementById('optCameraMode').value === 'snapshot') newCard.options.mode = 'snapshot';
    const camInterval = parseInt(document.getElementById('optCameraInterval').value, 10);
    if (Number.isFinite(camInterval) && camInterval !== 2) newCard.options.snapshot_interval = camInterval;
    const camAspect = parseFloat(document.getElementById('optCameraAspect').value);
    if (Number.isFinite(camAspect) && Math.abs(camAspect - 1.7778) > 0.001) newCard.options.aspect = camAspect;
    if (document.getElementById('optCameraFit').value === 'contain') newCard.options.fit = 'contain';
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
    if (harmonyAvailable) {
      const hub = document.getElementById('atvHub').value.trim();
      const deviceId = document.getElementById('atvDeviceSelect').value.trim();
      if (!hub || !deviceId) { alert('Pick a hub and a device.'); return; }
      newCard.options.hub = hub;
      newCard.options.deviceId = deviceId;
    } else {
      newCard.options.deviceId = document.getElementById('optDeviceId').value || '';
    }
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
  } else {
    dashboardData.pages[pageIndex].cards.push(newCard);
  }
  cancelCardEdit();
  renderPreview(); updateJsonOutput();
}


function removeCard(idx) {
  dashboardData.pages[currentActivePage].cards.splice(idx, 1);
  if (editingCard === idx) cancelCardEdit();
  renderPreview(); updateJsonOutput();
}

// ---- Icon / color helpers for scene_grid & button_grid previews -----------
// Icons are configured as absolute on-device paths (e.g.
// "/sdcard/astrion/icons/disco.png"). The browser preview can't read the
// device filesystem directly, but when this page is served by the remote's
// own local web server (http://<remote-ip>:8080/builder/) that server also
// exposes those files at /icons/<filename> (see ConfigServer.kt), so we just
// point an <img> there and gracefully fall back (blank/no icon) if it 404s —
// e.g. when running the standalone GitHub Pages copy with no device behind it.
function iconUrl(path) {
  if (!path) return null;
  const name = String(path).split(/[\\/]/).pop();
  return name ? `/icons/${encodeURIComponent(name)}` : null;
}

// Mirrors SceneGridCard.kt's parseHexColor: "#RRGGBB" is treated as opaque,
// "#AARRGGBB" carries its own alpha channel.
function parseHexColorCss(hex) {
  if (!hex) return null;
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(clean)) return null;
  if (clean.length === 6) return `#${clean}`;
  const a = parseInt(clean.slice(0, 2), 16) / 255;
  const r = parseInt(clean.slice(2, 4), 16);
  const g = parseInt(clean.slice(4, 6), 16);
  const b = parseInt(clean.slice(6, 8), 16);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

// Mirrors SceneGridCard.kt's luminance() + textColor threshold (0.75).
function textColorForBg(cssColor) {
  const m = cssColor.match(/rgba?\(([^)]+)\)/);
  let r, g, b;
  if (m) {
    [r, g, b] = m[1].split(',').map(s => parseFloat(s));
  } else {
    const clean = cssColor.replace('#', '');
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  const luminance = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
  return luminance > 0.75 ? '#141414' : '#F0F2F6';
}

// Icon not found (wrong filename, or previewing outside the remote's own
// server where /icons/ isn't served) — fall back to the same blank-spacer
// look the real app uses when BitmapFactory.decodeFile() returns null.
function onSceneIconError(img) {
  const spacer = document.createElement('div');
  spacer.className = 'st-icon-spacer';
  img.replaceWith(spacer);
}

function onButtonIconError(img) {
  const tile = img.closest('.preview-button-tile');
  img.remove();
  if (tile) tile.classList.replace('has-icon', 'no-icon');
}

// ---- Icon field: text input + live thumbnail + picker button --------------
// Every card option that takes an icon path (optIcon on name/entity cards and
// cover, giIcon on scene_grid/button_grid items) renders through this one
// helper, so the picker/thumbnail behaviour stays identical everywhere
// instead of hand-typing a path being the only option.

function iconFieldHtml(id) {
  return `
    <label>Icon (optional, PNG path)</label>
    <div class="icon-field-row">
      <input type="text" id="${id}" placeholder="/sdcard/astrion/icons/xxx.png" oninput="updateIconThumb('${id}')">
      <img class="icon-field-thumb" id="${id}Thumb" alt="">
      <button type="button" class="secondary" onclick="openIconPicker('${id}')">Choose…</button>
    </div>
  `;
}

// Keeps the little thumbnail next to an icon field in sync with its current
// value — called on typing (oninput, see iconFieldHtml) and whenever a field
// is populated programmatically (editing an existing card/item). Same
// silent-fallback rule as everywhere else: no thumbnail if the path is empty,
// unresolvable, or this copy of the builder has no device behind /icons/.
function updateIconThumb(id) {
  const input = document.getElementById(id);
  const thumb = document.getElementById(id + 'Thumb');
  if (!input || !thumb) return;
  const url = iconUrl(input.value.trim());
  if (!url) {
    thumb.classList.remove('shown');
    return;
  }
  thumb.onerror = () => thumb.classList.remove('shown');
  thumb.src = url;
  thumb.classList.add('shown');
}

// Which icon field the picker modal is currently filling in — set by
// openIconPicker, read by selectIcon.
let iconPickerTarget = null;

// Opens the icon-picker modal for the given field id, listing every icon
// already uploaded to the device (GET /icons-list, see ConfigServer.kt) as
// clickable thumbnails. Only resolves anything when this copy of the builder
// is served by the device itself (http://<remote-ip>:8080/builder/) — the
// standalone GitHub Pages copy, or opening index.html straight from disk,
// has no device behind it to list icons from, so the grid explains that
// instead of silently doing nothing.
async function openIconPicker(targetId) {
  iconPickerTarget = targetId;
  const grid = document.getElementById('iconPickerGrid');
  grid.innerHTML = '<div class="icon-picker-empty">Loading…</div>';
  document.getElementById('iconPickerModal').classList.add('open');

  let names;
  try {
    const res = await fetch('/icons-list');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    names = await res.json();
  } catch (e) {
    grid.innerHTML = `
      <div class="icon-picker-error">
        Can't list icons from here — this only works when the builder is opened
        from the device itself (<code>http://&lt;remote-ip&gt;:8080/builder/</code>),
        not the standalone copy. Type the path by hand instead, or upload icons
        first from the device's home page (<code>/</code>).
      </div>`;
    return;
  }

  if (!names.length) {
    grid.innerHTML = '<div class="icon-picker-empty">No icons uploaded yet — add some from the "Icons" section on the device\'s home page (<code>/</code>) first.</div>';
    return;
  }

  grid.innerHTML = names.map(name => `
    <div class="icon-picker-item" onclick="selectIcon('${name.replace(/'/g, "\\'")}')">
      <img src="${iconUrl(name)}" alt="" loading="lazy">
      <span>${name}</span>
    </div>
  `).join('');
}

function selectIcon(name) {
  if (!iconPickerTarget) return;
  document.getElementById(iconPickerTarget).value = `/sdcard/astrion/icons/${name}`;
  updateIconThumb(iconPickerTarget);
  closeIconPicker();
}

function closeIconPicker() {
  document.getElementById('iconPickerModal').classList.remove('open');
  iconPickerTarget = null;
}
