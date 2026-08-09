// ---- Preview ----------------------------------------------------------------

function renderTabs() {
  const tabsContainer = document.getElementById('tabs');
  tabsContainer.innerHTML = '';
  dashboardData.pages.forEach((page, index) => {
    const tab = document.createElement('div');
    tab.className = `tab ${index === currentActivePage ? 'active' : ''}`;
    tab.innerText = page.name;
    tab.onclick = () => {
      currentActivePage = index;
      document.getElementById('pageSelect').value = index;
      cancelCardEdit();
      renderTabs(); renderPreview(); renderHotkeysList();
    };
    tabsContainer.appendChild(tab);
  });
}

// Mimics the real status bar clock so the preview's proportions match what
// actually shows on-device above the dashboard content.
function updateStatusBarClock() {
  const el = document.getElementById('sbTime');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Moves the live .remote-screen node (status bar + #content) into a larger
// modal on click, and back into the remote frame on close — same DOM node,
// so nothing needs to be re-rendered or kept in sync between two copies.
function openPreviewModal() {
  const screen = document.querySelector('.remote-screen');
  const slot = document.getElementById('modalScreenSlot');
  if (!screen || !slot || screen.parentElement === slot) return;
  screen.classList.add('expanded');
  screen.onclick = null;
  slot.appendChild(screen);
  document.getElementById('previewModal').classList.add('open');
}

function closePreviewModal() {
  const screen = document.querySelector('.remote-screen');
  const frame = document.querySelector('.remote-frame');
  if (!screen || !frame) return;
  screen.classList.remove('expanded');
  screen.onclick = () => openPreviewModal();
  frame.appendChild(screen);
  document.getElementById('previewModal').classList.remove('open');
}

function renderPreview() {
  const contentContainer = document.getElementById('content');
  contentContainer.innerHTML = '';
  const page = dashboardData.pages[currentActivePage];
  if (!page) return;

  updateStatusBarClock();

  const globalKeys = (dashboardData.hotkeys || []).length + (dashboardData.longHotkeys || []).length;
  const pageKeys = (page.hotkeys || []).length + (page.longHotkeys || []).length;
  const hkInfo = document.getElementById('hotkeysInfo');
  if (hkInfo) {
    if (globalKeys + pageKeys > 0) {
      let hkHtml = `<div class="hotkeys-badge"><strong>⚡ Hotkeys active on this page:</strong><br>`;
      const describe = (h) => h.page ? `→ page "${h.page}"` : h.service ? `→ ${h.service}` : h.harmonyCommand ? `→ Harmony ${h.harmonyCommand}` : h.harmonyActivity ? `→ Harmony activity ${h.harmonyActivity}` : '';
      (dashboardData.hotkeys || []).forEach(h => hkHtml += `• [Global] <b>${h.key}</b> ${describe(h)}<br>`);
      (dashboardData.longHotkeys || []).forEach(h => hkHtml += `• [Global, long] <b>${h.key}</b> ${describe(h)}<br>`);
      (page.hotkeys || []).forEach(h => hkHtml += `• [Page] <b>${h.key}</b> ${describe(h)}<br>`);
      (page.longHotkeys || []).forEach(h => hkHtml += `• [Page, long] <b>${h.key}</b> ${describe(h)}<br>`);
      hkHtml += `</div>`;
      hkInfo.innerHTML = hkHtml;
    } else {
      hkInfo.innerHTML = '';
    }
  }

  if (!page.cards || page.cards.length === 0) {
    contentContainer.innerHTML += `<p style="color:#666; font-style:italic;">No cards on this page yet.</p>`;
    return;
  }

  page.cards.forEach((card, idx) => {
    const cardEl = document.createElement('div');

    if (card.type === 'apple_tv_remote' || card.type === 'tv_remote') {
      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>${card.type}</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          <div class="preview-apple-remote">
            <div class="preview-trackpad">
              <div style="position:absolute; top:10px;">▲</div><div style="position:absolute; bottom:10px;">▼</div>
              <div style="position:absolute; left:10px;">◀</div><div style="position:absolute; right:10px;">▶</div>
              <div class="preview-inner-select"></div>
            </div>
            <div class="preview-row-buttons"><div class="preview-pill">☰ Menu</div><div class="preview-pill">Home</div></div>
            <div class="preview-play-btn">⏯</div>
          </div>
        </div>`;
    } else if (card.type === 'clock_weather') {
      const o = card.options || {};
      const is24 = o.time_format === 24;
      const now = new Date();
      const timeStr = is24
        ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const forecastRows = o.forecast_rows ?? 4;
      const shown = WEATHER_MOCK.forecast.slice(0, forecastRows);
      const temps = shown.flatMap(f => [f.low, f.high]);
      const weekMin = temps.length ? Math.min(...temps) : 0;
      const weekMax = temps.length ? Math.max(...temps) : 1;
      const span = Math.max(weekMax - weekMin, 1);
      const forecastHtml = shown.map(f => {
        const lowPct = Math.min(Math.max((f.low - weekMin) / span, 0), 1) * 100;
        const highPct = Math.min(Math.max((f.high - weekMin) / span, 0), 1) * 100;
        return `
          <div class="cw-forecast-row">
            <span class="cw-fday">${f.day}</span>
            <span class="cw-femoji">${weatherEmoji(f.condition)}</span>
            <span class="cw-flow">${weatherTrim(f.low)}°</span>
            <div class="cw-fbar"><div class="cw-fbar-fill" style="left:${lowPct}%; right:${100 - highPct}%"></div></div>
            <span class="cw-fhigh">${weatherTrim(f.high)}°</span>
          </div>`;
      }).join('');
      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>clock_weather</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          <div class="preview-clock-weather-wrap">
            <div class="preview-clock-weather">
              <div class="cw-emoji">${weatherEmoji(WEATHER_MOCK.state)}</div>
              <div style="flex:1">
                <div class="cw-time">${timeStr}</div>
                <div class="cw-date">${now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</div>
              </div>
              <div class="cw-right">
                <div class="cw-temp">${weatherTrim(WEATHER_MOCK.temperature)}°</div>
                <div>${weatherConditionLabel(WEATHER_MOCK.state)}</div>
              </div>
            </div>
            ${forecastHtml}
          </div>
          <div class="hint" style="margin-top:8px">Entity: ${o.entity_id || 'weather.forecast_home'} · ${forecastRows} forecast row(s)${o.calendar_entity ? ' · Calendar: ' + o.calendar_entity : ''} · example data (${WEATHER_MOCK.friendly_name})</div>
        </div>`;
    } else if (card.type === 'fan') {
      const o = card.options || {};
      const presetModes = (o.preset_modes && o.preset_modes.length ? o.preset_modes : FAN_MOCK.preset_modes).filter(m => m.toLowerCase() !== 'off');
      const style = o.style || 'auto';
      const useFull = style === 'full' || (style !== 'simple' && (presetModes.length > 0 || true)); // mock always reports `oscillating`
      const usingExample = !(o.preset_modes && o.preset_modes.length);
      let bodyHtml;
      if (!useFull) {
        bodyHtml = `
          <div class="preview-fan-simple">
            <div>
              <div class="fs-name">${o.name || o.entity_id || FAN_MOCK.friendly_name}</div>
              <div class="fs-state">${FAN_MOCK.state === 'on' ? FAN_MOCK.percentage + '%' : 'Off'}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <div class="fx-pct-btn">−</div>
              <div class="fx-pct-btn">+</div>
            </div>
          </div>`;
      } else {
        const showCaptions = o.show_captions !== false;
        const presetRows = climateBalancedRows(presetModes, 4).map(row => `
          <div class="fx-row">
            ${row.map(m => `<div class="fx-chip ${FAN_MOCK.state === 'on' && m.toLowerCase() === FAN_MOCK.preset_mode.toLowerCase() ? 'fx-chip-selected' : ''}">${m}</div>`).join('')}
          </div>`).join('');
        bodyHtml = `
          <div class="preview-fan">
            <div class="fx-header">
              <span class="fx-name">${o.name || o.entity_id || FAN_MOCK.friendly_name}</span>
              <div class="fx-power ${FAN_MOCK.state === 'off' ? 'is-off' : ''}">${mdiSvg(MDI.power)}</div>
            </div>
            ${presetModes.length ? `${showCaptions ? '<div class="fx-caption">Preset</div>' : ''}${presetRows}` : `
              <div class="fx-pct-row">
                <div class="fx-pct-btn">−</div>
                <div class="fx-pct">${FAN_MOCK.percentage}%</div>
                <div class="fx-pct-btn">+</div>
              </div>`}
            ${showCaptions ? '<div class="fx-caption">Oscillate</div>' : ''}
            <div class="fx-row"><div class="fx-chip ${FAN_MOCK.oscillating ? 'fx-chip-selected' : ''}" style="flex:1">${fanOscillateLabel(FAN_MOCK.oscillating)}</div></div>
          </div>`;
      }
      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>fan</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          ${bodyHtml}
          <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'fan.entity'} · Layout: ${style}${usingExample ? ' · example data (' + FAN_MOCK.friendly_name + ')' : ''}</div>
        </div>`;
    } else if (card.type === 'vacuum') {
      const o = card.options || {};
      const rooms = o.rooms || [];
      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>vacuum</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          <div class="preview-vacuum">
            <div class="vc-header">
              <span class="vc-name">${o.name || o.entity_id || VACUUM_MOCK.friendly_name}</span>
              <span>${vacuumStateLabel(VACUUM_MOCK.state)}</span>
            </div>
            <div class="hint" style="margin-top:4px">Cleaning mode: ${vacuumPrettyLabel(VACUUM_MOCK.fan_speed)} (of ${VACUUM_MOCK.fan_speed_list.map(vacuumPrettyLabel).join(', ')})</div>
            <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'vacuum.entity'}${o.map_image ? ' · Map: ' + o.map_image : ' · No map image'}${o.map_rotation ? ' · Rotated ' + o.map_rotation + '°' : ''} · ${o.map_height ?? 200}px</div>
            ${rooms.length ? `<div class="vc-rooms">${rooms.map(r => `<div class="vc-room">${r.name} (${r.id})</div>`).join('')}</div>` : '<div class="hint" style="margin-top:6px">No rooms configured — start/pause/dock/locate controls only.</div>'}
            <div class="hint" style="margin-top:4px">example data (${VACUUM_MOCK.friendly_name})</div>
          </div>
        </div>`;
    } else if (card.type === 'climate') {
      const o = card.options || {};
      const hvacModes = (o.hvac_modes && o.hvac_modes.length ? o.hvac_modes : CLIMATE_MOCK.hvac_modes).filter(m => m !== 'off');
      const fanModes = (o.fan_modes && o.fan_modes.length ? o.fan_modes : CLIMATE_MOCK.fan_modes);
      const swingModes = (o.swing_modes && o.swing_modes.length ? o.swing_modes : CLIMATE_MOCK.swing_modes);
      const hvacStyle = o.hvac_mode_style === 'label' ? 'label' : 'icons';
      const fanStyle = o.fan_mode_style === 'icons' ? 'icons' : 'label';
      const swingStyle = o.swing_mode_style === 'icons' ? 'icons' : 'label';
      const usingExample = !(o.hvac_modes && o.hvac_modes.length) && !(o.fan_modes && o.fan_modes.length) && !(o.swing_modes && o.swing_modes.length);
      const showCaptions = o.show_captions !== false;
      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>climate</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          <div class="preview-climate">
            <div class="cc-header">
              <span class="cc-name">${o.name || o.entity_id || 'Climate'}</span>
              <div class="cc-power ${CLIMATE_MOCK.state === 'off' ? 'is-off' : ''}">${mdiSvg(MDI.power)}</div>
            </div>
            <div class="cc-temp-row">
              <div class="cc-stepper">−</div>
              <div class="cc-temp-col">
                <div class="cc-temp">${CLIMATE_MOCK.temperature}°</div>
                <div class="cc-current">Now ${CLIMATE_MOCK.current_temperature}°</div>
              </div>
              <div class="cc-stepper">+</div>
            </div>
            ${hvacModes.length ? `${showCaptions ? '<div class="cc-caption">Mode</div>' : ''}${climateChipRowsHtml(hvacModes, CLIMATE_MOCK.state, hvacStyle, hvacStyle === 'icons' ? 5 : 3, climateHvacLabel, climateHvacIcon)}` : ''}
            ${fanModes.length ? `${showCaptions ? '<div class="cc-caption">Fan</div>' : ''}${climateChipRowsHtml(fanModes, CLIMATE_MOCK.fan_mode, fanStyle, fanStyle === 'icons' ? 5 : 3, climateFanLabel, climateFanIcon)}` : ''}
            ${swingModes.length ? `${showCaptions ? '<div class="cc-caption">Swing</div>' : ''}${climateChipRowsHtml(swingModes, CLIMATE_MOCK.swing_mode, swingStyle, swingStyle === 'icons' ? 5 : 3, climateSwingLabel, climateSwingIcon)}` : ''}
          </div>
          <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'climate.entity'}${usingExample ? ' · no overrides set — showing example modes (your real device\'s modes render live in the app)' : ''}</div>
        </div>`;
    } else if (card.type === 'button_grid' || card.type === 'scene_grid') {
      const items = card.options?.buttons || card.options?.scenes || [];
      const cols = card.options?.columns || 2;
      let tiles = items.map(i => `<div class="preview-tile">${i.name || '?'}</div>`).join('');
      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>${card.type} (${items.length} items)</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          <div class="preview-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr))">${tiles}</div>
        </div>`;
    } else {
      cardEl.className = 'card';
      cardEl.innerHTML = `
        <div class="card-title"><span>${card.type}</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
        <div><strong>${card.options?.name || card.options?.entity_id || card.type}</strong><br>
        <small style="color:#888">${card.options?.entity_id || card.options?.remote_entity || ''}</small></div>`;
    }
    contentContainer.appendChild(cardEl);
  });
}

