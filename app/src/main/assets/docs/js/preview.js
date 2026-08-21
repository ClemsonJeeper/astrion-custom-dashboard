// ---- Preview ----------------------------------------------------------------

function renderTabs() {
  const tabsContainer = document.getElementById('tabs');
  tabsContainer.innerHTML = '';
  dashboardData.pages.forEach((page, index) => {
    const tab = document.createElement('div');
    const isActive = index === currentActivePage;
    tab.className = `tab ${isActive ? 'active' : ''}`;
    tab.dataset.pageIdx = String(index);

    const label = document.createElement('span');
    label.textContent = (page.parent ? '↳ ' : '') + page.name + (index === dashboardData.startPage ? ' 🏠' : '');
    if (page.parent) label.title = `Child of "${page.parent}"`;
    tab.appendChild(label);
    tab.onclick = () => onPageChange(index);

    // Drag-to-reorder, mirroring enhanceCardControls() below. Dropping a tab
    // onto another tab repositions its page in dashboardData.pages; the active
    // tab and start page follow their pages via reorderPage()'s index fixup.
    tab.setAttribute('draggable', 'true');
    tab.addEventListener('dragstart', (e) => {
      tab.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });
    tab.addEventListener('dragend', () => tab.classList.remove('dragging'));
    tab.addEventListener('dragover', (e) => { e.preventDefault(); tab.classList.add('drag-over'); });
    tab.addEventListener('dragleave', () => tab.classList.remove('drag-over'));
    tab.addEventListener('drop', (e) => {
      e.preventDefault();
      tab.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = parseInt(tab.dataset.pageIdx, 10);
      if (!isNaN(fromIdx) && !isNaN(toIdx) && fromIdx !== toIdx) reorderPage(fromIdx, toIdx);
    });

    if (isActive) {
      const gear = document.createElement('span');
      gear.className = 'tab-settings';
      gear.title = 'Page settings';
      gear.textContent = '⚙';
      gear.onclick = (e) => { e.stopPropagation(); openPageDialog(index); };
      tab.appendChild(gear);
    }

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
  updateRemoteScreenScale();
}

function closePreviewModal() {
  const screen = document.querySelector('.remote-screen');
  // .remote-screen now lives inside .remote-screen-container (the frame's
  // screen cutout), not directly inside .remote-frame — since the SANYTRON
  // HTML/CSS frame replaced remote.png.
  const container = document.querySelector('.remote-screen-container');
  if (!screen || !container) return;
  screen.classList.remove('expanded');
  screen.onclick = () => openPreviewModal();
  container.appendChild(screen);
  document.getElementById('previewModal').classList.remove('open');
  updateRemoteScreenScale();
}

// .remote-screen-scaler is always built at the device's true dp size (349px
// wide — see the CSS comment above .remote-screen-scaler in styles.css for
// the math). This scales it via a CSS transform to exactly fill whatever
// pixel width .remote-screen currently renders at, so every element's raw-px
// sizing (copied 1:1 from the app's dp/sp values) stays proportionally
// correct whether it's the small in-frame thumbnail, the expanded modal, or
// anything in between if the window gets resized.
function updateRemoteScreenScale() {
  const screen = document.querySelector('.remote-screen');
  const scaler = document.querySelector('.remote-screen-scaler');
  if (!screen || !scaler || screen.clientWidth === 0) return;
  scaler.style.transform = `scale(${screen.clientWidth / 349})`;
}

(function watchRemoteScreenSize() {
  const screen = document.querySelector('.remote-screen');
  if (!screen) return;
  if (typeof ResizeObserver !== 'undefined') {
    // Recomputes on every layout change: initial paint, window resize, and
    // the expand/collapse toggle above (belt-and-braces — that already
    // calls updateRemoteScreenScale() directly too).
    new ResizeObserver(updateRemoteScreenScale).observe(screen);
  } else {
    // Older WebView fallback with no ResizeObserver support.
    window.addEventListener('resize', updateRemoteScreenScale);
    updateRemoteScreenScale();
  }
})();

// .remote-frame is a fixed 208x880px design (the SANYTRON HTML/CSS
// recreation replacing remote.png). This scales the whole frame down via a
// CSS transform to fit .remote-frame-scale-wrap's actual available width —
// same idea as updateRemoteScreenScale() above, one level out. Deliberately
// sets the wrapper's height in px from JS rather than CSS `aspect-ratio`:
// that property turned out unreliable across browsers/webviews for the old
// remote.png crop and cost a debugging round-trip, so this preview avoids
// it entirely. Never scales up past 1:1 — the frame just centers with
// spare room on wide screens instead of blurring.
function updateRemoteFrameScale() {
  const wrap = document.querySelector('.remote-frame-scale-wrap');
  const frame = document.querySelector('.remote-frame');
  if (!wrap || !frame || wrap.clientWidth === 0) return;
  const scale = Math.min(wrap.clientWidth / 208, 1);
  frame.style.transform = `scale(${scale})`;
  wrap.style.height = `${Math.round(880 * scale)}px`;
}

(function watchRemoteFrameSize() {
  // Observes .preview-pane (the outer column), NOT .remote-frame-scale-wrap
  // itself — updateRemoteFrameScale() writes .remote-frame-scale-wrap's own
  // height, so observing it directly would have the callback re-trigger
  // itself on every call.
  const pane = document.querySelector('.preview-pane');
  if (!pane) return;
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateRemoteFrameScale).observe(pane);
  } else {
    window.addEventListener('resize', updateRemoteFrameScale);
  }
  updateRemoteFrameScale();
})();

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
      const useStep = style === 'step';
      const useFull = !useStep && (style === 'full' || (style !== 'simple' && (presetModes.length > 0 || true))); // mock always reports `oscillating`
      const usingExample = !(o.preset_modes && o.preset_modes.length);
      let bodyHtml;
      if (useStep) {
        const stepName = o.name ? `<div class="fs-step-name">${o.name}</div>` : '';
        bodyHtml = `
          <div class="preview-fan-step">
            ${stepName}
            <div class="fs-step-row">
              <div class="fs-step-btn">−</div>
              <div class="fs-step-pct">${FAN_MOCK.state === 'on' ? FAN_MOCK.percentage + '%' : 'Off'}</div>
              <div class="fs-step-btn">+</div>
            </div>
          </div>`;
      } else if (!useFull) {
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
    } else if (card.type === 'cover') {
      const o = card.options || {};
      const name = o.name || o.entity_id || COVER_MOCK.friendly_name;
      const position = COVER_MOCK.current_position; // 0..100
      const tilt = COVER_MOCK.current_tilt_position; // 0..100
      const isOpen = position != null ? position >= 100 : COVER_MOCK.state === 'open';
      const isClosed = position != null ? position <= 0 : COVER_MOCK.state === 'closed';
      const stateLabel = coverPositionLabel(position, COVER_MOCK.state);
      const layout = (o.layout === 'horizontal' || o.layout === 'vertical') ? o.layout : 'default';
      // Only 2 icon variants exist (fully open / fully closed shutter) — show
      // "closed" only when truly closed (0%); anything else reads as "open"
      // since the shutter isn't down (mirrors CoverCard.kt's showOpenIcon).
      const showOpenIcon = !isClosed;
      // Reflects the last known open/closed state always, including while
      // opening/closing — matches CoverCard.kt's coverIcon (no more blanking
      // the icon mid-move; the up/down/stop buttons are the real-time cue).
      const iconPath = showOpenIcon ? MDI.windowShutterOpen : MDI.windowShutterClosed;

      // Mirrors CoverCard.kt: if none of the 3 flags are set at all, fall
      // back to "buttons only" so untouched configs preview exactly as
      // they always have.
      const hasCoverCtrlOpts = ('show_buttons_control' in o) || ('show_position_control' in o) || ('show_tilt_position_control' in o);
      const ctrlButtons = hasCoverCtrlOpts ? (o.show_buttons_control === true) : true;
      const ctrlPosition = o.show_position_control === true;
      const ctrlTilt = o.show_tilt_position_control === true;
      const enabledControls = [];
      if (ctrlButtons) enabledControls.push('buttons');
      if (ctrlPosition) enabledControls.push('position');
      if (ctrlTilt) enabledControls.push('tilt');
      const activeControl = enabledControls[0]; // preview shows the first — on-device a button cycles through the rest

      const iconHtml = (big) => `<div class="pc-icon${big ? ' pc-icon-lg' : ''}">${mdiSvg(iconPath)}</div>`;
      const nameStateHtml = (center) => `
        <div class="pc-namestate${center ? ' pc-center' : ''}">
          <div class="pc-name">${name}</div>
          <div class="pc-state">${stateLabel}</div>
        </div>`;
      const btnHtml = (path, disabled) => `<div class="pc-btn${disabled ? ' pc-disabled' : ''}">${mdiSvg(path)}</div>`;
      // Up disabled once fully open, down disabled once fully closed — mirrors CoverCard.kt.
      const buttonsHtml = (full) => `
        <div class="pc-controls${full ? ' pc-full' : ''}">
          ${btnHtml(MDI.coverUp, isOpen)}
          ${btnHtml(MDI.stop, false)}
          ${btnHtml(MDI.coverDown, isClosed)}
        </div>`;
      const sliderHtml = (value, color) => `
        <div class="pc-slider" style="background:${color}22">
          <div class="pc-slider-fill" style="width:${value}%; background:${color}"></div>
          <div class="pc-slider-label">${value}%</div>
        </div>`;
      const cycleBtnHtml = enabledControls.length > 1 ? `<div class="pc-cycle-btn" title="Cycles through: ${enabledControls.join(', ')}">${mdiSvg(MDI.chevronRight)}</div>` : '';
      const controlsHtml = (full) => {
        let inner;
        if (activeControl === 'position') inner = sliderHtml(position, 'var(--accent)');
        else if (activeControl === 'tilt') inner = sliderHtml(tilt, 'var(--success)');
        else if (activeControl === 'buttons') inner = buttonsHtml(full);
        else return '';
        return `<div style="display:flex; align-items:center; gap:8px; width:100%;"><div style="flex:1; min-width:0;">${inner}</div>${cycleBtnHtml}</div>`;
      };

      let bodyHtml;
      if (layout === 'horizontal') {
        // icon + name/state on the left, controls on the right — single row.
        bodyHtml = `
          <div class="preview-cover layout-horizontal">
            ${iconHtml(false)}
            <div style="flex:1; min-width:0;">${nameStateHtml(false)}</div>
            <div style="width:140px;">${controlsHtml(false)}</div>
          </div>`;
      } else if (layout === 'vertical') {
        // icon, name, state, controls — all centered and stacked.
        bodyHtml = `
          <div class="preview-cover layout-vertical">
            ${iconHtml(true)}
            ${nameStateHtml(true)}
            ${controlsHtml(true)}
          </div>`;
      } else {
        // "default": icon + name/state row, controls full-width below.
        bodyHtml = `
          <div class="preview-cover layout-default">
            <div style="display:flex; align-items:center; gap:12px;">
              ${iconHtml(false)}
              ${nameStateHtml(false)}
            </div>
            ${controlsHtml(true)}
          </div>`;
      }

      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>cover</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          ${bodyHtml}
          <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'cover.entity'} · Layout: ${layout} · Controls: ${enabledControls.join(', ') || 'none'} · example data (${COVER_MOCK.friendly_name}, ${position}% open${ctrlTilt ? `, tilt ${tilt}%` : ''})</div>
        </div>`;
    } else if (card.type === 'select') {
      const o = card.options || {};
      const name = o.name || o.entity_id || SELECT_MOCK.friendly_name;
      const options = SELECT_MOCK.options;
      const current = SELECT_MOCK.state;
      const stateLabel = current || (options.length ? 'Select…' : 'No options');
      const layout = (o.layout === 'horizontal' || o.layout === 'vertical') ? o.layout : 'default';
      const iconColor = parseHexColorCss(o.icon_color);
      const iconBg = iconColor ? `${iconColor}33` : '#2A4954';
      const iconTint = iconColor || '#B6C9CE';

      const iconHtml = (big) => `<div class="pc-icon pl-icon${big ? ' pc-icon-lg' : ''}" style="background:${iconBg}; color:${iconTint}">${mdiSvg(MDI.list)}</div>`;
      const nameStateHtml = (center) => `
        <div class="pc-namestate${center ? ' pc-center' : ''}">
          <div class="pc-name">${name}</div>
          <div class="pc-state">${stateLabel}</div>
        </div>`;
      // Mirrors SelectCard.kt's SelectMenuControl: a rounded pill showing
      // the current option + a dropdown chevron — reuses .pc-slider's
      // pill shape (no fill bar though, this control has no "amount").
      const controlHtml = `
        <div class="pc-slider" style="background:#152B33; justify-content:space-between; padding:0 12px; box-sizing:border-box;">
          <span class="pc-slider-label" style="position:static;">${current || '—'}</span>
          <span class="pc-slider-label" style="position:static; opacity:0.7;">▾</span>
        </div>`;

      let bodyHtml;
      if (layout === 'horizontal') {
        bodyHtml = `
          <div class="preview-cover layout-horizontal">
            ${iconHtml(false)}
            <div style="flex:1; min-width:0;">${nameStateHtml(false)}</div>
            <div style="width:140px;">${controlHtml}</div>
          </div>`;
      } else if (layout === 'vertical') {
        bodyHtml = `
          <div class="preview-cover layout-vertical">
            ${iconHtml(true)}
            ${nameStateHtml(true)}
            ${controlHtml}
          </div>`;
      } else {
        bodyHtml = `
          <div class="preview-cover layout-default">
            <div style="display:flex; align-items:center; gap:12px;">
              ${iconHtml(false)}
              ${nameStateHtml(false)}
            </div>
            ${controlHtml}
          </div>`;
      }

      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>select</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          ${bodyHtml}
          <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'input_select.entity'} · Layout: ${layout} · example data (${SELECT_MOCK.friendly_name}: ${options.join(', ')})</div>
        </div>`;
    } else if (card.type === 'light') {
      const o = card.options || {};
      const name = o.name || o.entity_id || LIGHT_MOCK.friendly_name;
      const isOn = LIGHT_MOCK.state === 'on';
      const brightnessPct = LIGHT_MOCK.brightness != null ? Math.round((LIGHT_MOCK.brightness / 255) * 100) : null;
      const useLightColor = o.use_light_color === true;
      const showBrightness = o.show_brightness !== false;
      const layout = (o.layout === 'horizontal' || o.layout === 'vertical') ? o.layout : 'default';
      const stateLabel = lightStateLabel(isOn, brightnessPct, showBrightness);

      // Mirrors LightCard.kt: filled bulb while on, outline while off; tint
      // follows the light's rgb_color only when "use_light_color" is set,
      // otherwise the plain amber "on" look. This mock reports color_temp/xy
      // (no rgb_color of its own — see kelvinToPreviewRgb in mocks.js).
      const [r, g, b] = LIGHT_MOCK.rgb_color || kelvinToPreviewRgb(LIGHT_MOCK.color_temp_kelvin);
      const lightColorCss = (isOn && useLightColor) ? `rgb(${r},${g},${b})` : null;
      const iconPath = isOn ? MDI.lightbulbOn : MDI.lightbulbOff;
      const iconBg = !isOn ? 'var(--control)' : (lightColorCss ? `rgba(${r},${g},${b},0.22)` : 'var(--amber)');
      const iconTint = !isOn ? 'var(--icon)' : (lightColorCss || '#241A00');
      const barColor = lightColorCss || '#FFC24B';

      // Mirrors LightCard.kt: if none of the 3 flags are set at all, fall
      // back to "brightness control only" so untouched configs preview
      // exactly as they always have.
      const supportedModes = LIGHT_MOCK.supported_color_modes || [];
      const supportsColor = supportedModes.some(m => ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].includes(m));
      const supportsColorTemp = supportedModes.includes('color_temp');
      const hasLightCtrlOpts = ('show_brightness_control' in o) || ('show_color_temp_control' in o) || ('show_color_control' in o);
      const ctrlBrightness = hasLightCtrlOpts ? (o.show_brightness_control === true) : true;
      const ctrlColorTemp = o.show_color_temp_control === true && supportsColorTemp;
      const ctrlColor = o.show_color_control === true && supportsColor;
      const collapsible = o.collapsible_controls === true;
      const enabledControls = [];
      if (ctrlBrightness) enabledControls.push('brightness');
      if (ctrlColorTemp) enabledControls.push('color_temp');
      if (ctrlColor) enabledControls.push('color');
      const controlsVisible = enabledControls.length > 0 && (!collapsible || isOn);
      const activeControl = enabledControls[0]; // preview shows the first — on-device a button cycles through the rest

      const iconHtml = (big) => `<div class="pc-icon pl-icon${big ? ' pc-icon-lg' : ''}" style="background:${iconBg}; color:${iconTint}">${mdiSvg(iconPath)}</div>`;
      const nameStateHtml = (center) => `
        <div class="pc-namestate${center ? ' pc-center' : ''}">
          <div class="pc-name">${name}</div>
          <div class="pc-state">${stateLabel}</div>
        </div>`;
      const brightnessSliderHtml = `
        <div class="pc-slider" style="background:${barColor}22">
          <div class="pc-slider-fill" style="width:${brightnessPct ?? 0}%; background:${barColor}"></div>
          <div class="pc-slider-label">${brightnessPct ?? 0}%</div>
        </div>`;
      const colorTempSliderHtml = `
        <div class="pc-slider" style="background:linear-gradient(90deg,#FFB366,#FFF3E0,#9EC8FF)">
          <div class="pc-slider-label" style="color:#241A00">${LIGHT_MOCK.color_temp_kelvin}K</div>
        </div>`;
      const colorSwatchesHtml = `
        <div class="pl-color-row">
          ${['#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#00BCD4', '#2196F3', '#9C27B0', '#FFFFFF']
            .map(c => `<div class="pl-swatch" style="background:${c}"></div>`).join('')}
        </div>`;
      const cycleBtnHtml = enabledControls.length > 1 ? `<div class="pc-cycle-btn" title="Cycles through: ${enabledControls.join(', ')}">${mdiSvg(MDI.chevronRight)}</div>` : '';
      const controlsHtml = () => {
        if (!controlsVisible) return '';
        let inner;
        if (activeControl === 'brightness') inner = brightnessSliderHtml;
        else if (activeControl === 'color_temp') inner = colorTempSliderHtml;
        else if (activeControl === 'color') inner = colorSwatchesHtml;
        else return '';
        return `<div style="display:flex; align-items:center; gap:8px; width:100%;"><div style="flex:1; min-width:0;">${inner}</div>${cycleBtnHtml}</div>`;
      };

      let bodyHtml;
      if (layout === 'horizontal') {
        // icon + name/state on the left, controls on the right — single row.
        bodyHtml = `
          <div class="preview-light layout-horizontal">
            ${iconHtml(false)}
            <div style="flex:1; min-width:0;">${nameStateHtml(false)}</div>
            <div style="width:140px;">${controlsHtml()}</div>
          </div>`;
      } else if (layout === 'vertical') {
        // icon, name, state, controls — all centered and stacked.
        bodyHtml = `
          <div class="preview-light layout-vertical">
            ${iconHtml(true)}
            ${nameStateHtml(true)}
            ${controlsHtml()}
          </div>`;
      } else {
        // "default": icon + name/state row, controls full-width below.
        bodyHtml = `
          <div class="preview-light layout-default">
            <div style="display:flex; align-items:center; gap:12px;">
              ${iconHtml(false)}
              ${nameStateHtml(false)}
            </div>
            ${controlsHtml()}
          </div>`;
      }

      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>light</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          ${bodyHtml}
          <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'light.entity'} · Layout: ${layout}${useLightColor ? ' · icon tinted with light colour' : ''} · Controls: ${enabledControls.join(', ') || 'none'}${collapsible ? ' (hidden while off)' : ''} · example data (${LIGHT_MOCK.friendly_name}, ${brightnessPct}%)</div>
        </div>`;
    } else if (card.type === 'media_player') {
      const o = card.options || {};
      const mock = MEDIA_MOCK;
      const full = o.variant === 'full';
      const useMediaInfo = o.use_media_info !== false;
      const showVolumeLevel = o.show_volume_level === true;
      const mediaControls = (o.media_controls || 'previous,play_pause,next').split(',').map(s => s.trim()).filter(Boolean);
      const volumeControls = (o.volume_controls || 'mute,buttons').split(',').map(s => s.trim()).filter(Boolean);

      const title = useMediaInfo ? (mock.media_title || o.name || mock.friendly_name) : (o.name || mock.friendly_name);
      const subtitle = useMediaInfo ? (mock.media_artist || mock.app_name) : null;
      let stateLine = subtitle || mediaStateLabel(mock.state);
      if (showVolumeLevel) stateLine += ` ⸱ ${Math.round((mock.volume_level || 0) * 100)}%`;

      const mediaButtons = mediaComputeButtons(mock, mediaControls);
      const volumeButtons = mediaComputeVolumeButtons(mock, volumeControls);
      const hasVolumeSlider = volumeControls.includes('set') && mediaSupports(mock, MEDIA_FEATURE.VOLUME_SET);

      const btnHtml = (b, full, tint) => {
        const isPlayPause = b.action === 'media_play' || b.action === 'media_pause';
        const classes = [full ? 'pm-full-btn' : 'pm-btn'];
        if (full && isPlayPause) classes.push('pm-big');
        if (tint && (b.active || isPlayPause)) classes.push('pm-accent');
        return `<div class="${classes.join(' ')}">${mdiSvg(b.icon)}</div>`;
      };

      let bodyHtml;
      if (full) {
        const fraction = mock.media_duration > 0 ? Math.min(1, (mock.media_position || 0) / mock.media_duration) : 0;
        const fmtTime = (s) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, '0')}`; };
        bodyHtml = `
          <div class="preview-media-full">
            <div class="pm-art">${mdiSvg(mock.state === 'off' ? MDI.castOff : MDI.cast)}</div>
            <div>
              <div class="pm-full-title">${title}</div>
              <div class="pm-full-subtitle">${subtitle || mediaStateLabel(mock.state)}</div>
            </div>
            <div style="width:100%">
              <div class="pm-progress"><div class="pm-progress-fill" style="width:${fraction * 100}%"></div></div>
              <div style="display:flex; justify-content:space-between; margin-top:4px;"><small style="color:var(--muted)">${fmtTime(mock.media_position)}</small><small style="color:var(--muted)">${fmtTime(mock.media_duration)}</small></div>
            </div>
            ${mediaButtons.length ? `<div class="pm-full-controls">${mediaButtons.map(b => btnHtml(b, true, true)).join('')}</div>` : ''}
            ${(volumeButtons.length || hasVolumeSlider) ? `<div class="pm-full-controls">${hasVolumeSlider ? '<div style="flex:1; height:8px; border-radius:4px; background:var(--inset); margin:0 8px;"><div style="width:' + Math.round((mock.volume_level || 0) * 100) + '%; height:100%; border-radius:4px; background:var(--accent2);"></div></div>' : ''}${volumeButtons.map(b => btnHtml(b, true, false)).join('')}</div>` : ''}
          </div>`;
      } else {
        const hasMediaGroup = mediaButtons.length > 0;
        const hasVolumeGroup = volumeButtons.length > 0 || hasVolumeSlider;
        // Preview always shows the media (transport) group first when both
        // exist — the app itself starts on whichever group is available,
        // and lets the user tap the swap button to flip to the other.
        const showingVolume = !hasMediaGroup && hasVolumeGroup;
        const activeButtons = showingVolume ? volumeButtons : mediaButtons;
        const avatarIcon = mock.state === 'off' ? MDI.castOff : MDI.cast;
        bodyHtml = `
          <div class="preview-media">
            <div class="pm-row">
              <div class="pm-avatar">${mdiSvg(avatarIcon)}</div>
              <div class="pc-namestate" style="flex:1; min-width:0;">
                <div class="pc-name">${title}</div>
                <div class="pc-state">${stateLine}</div>
              </div>
            </div>
            ${(hasMediaGroup || hasVolumeGroup) ? `
            <div class="pm-controls">
              ${showingVolume && hasVolumeSlider ? '<div style="flex:1; height:36px; border-radius:10px; background:var(--inset);"><div style="width:' + Math.round((mock.volume_level || 0) * 100) + '%; height:100%; border-radius:10px; background:var(--accent2);"></div></div>' : ''}
              ${activeButtons.map(b => btnHtml(b, false, true)).join('')}
              ${(hasMediaGroup && hasVolumeGroup) ? `<div class="pm-btn pm-swap">${mdiSvg(showingVolume ? MDI.play : MDI.volumeHigh)}</div>` : ''}
            </div>` : ''}
          </div>`;
      }

      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>media_player (${full ? 'full' : 'compact'})</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          ${bodyHtml}
          <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'media_player.entity'} · example data (${mock.friendly_name}, ${mock.state}) · long-press the compact tile in-app opens the detail dialog</div>
        </div>`;
    } else if (card.type === 'button_grid' || card.type === 'scene_grid') {
      const isScene = card.type === 'scene_grid';
      const items = card.options?.buttons || card.options?.scenes || [];
      const cols = card.options?.columns || 2;
      const isRow = isScene && card.options?.layout === 'row';
      const showLabels = card.options?.show_labels !== false;
      // Mirrors SceneGridCard.kt: once ANY scene in the grid has an icon,
      // every tile in that grid uses the taller icon layout (74dp) so they
      // stay a uniform height — even tiles with no icon of their own get a
      // blank spacer instead of dropping to the shorter 58dp layout.
      const hasIconGrid = isScene && items.some(i => i.icon);

      const tileHtml = (item) => {
        const label = item.name || '?';
        const src = iconUrl(item.icon);
        if (isScene) {
          const bg = parseHexColorCss(item.color) || (typeof themeValues === 'function' ? themeValues().controlBackground : '#2C4C58');
          const textColor = textColorForBg(bg);
          const iconCell = hasIconGrid
            ? (src
                ? `<img class="st-icon" src="${src}" alt="" onerror="onSceneIconError(this)">`
                : `<div class="st-icon-spacer"></div>`)
            : '';
          return `<div class="preview-scene-tile ${hasIconGrid ? 'has-icon' : 'no-icon'}" style="background:${bg}; color:${textColor}">
            ${iconCell}
            ${showLabels ? `<div class="st-label">${label}</div>` : ''}
          </div>`;
        } else {
          const hasIcon = !!src;
          const iconCell = hasIcon
            ? `<img class="bt-icon" src="${src}" alt="" onerror="onButtonIconError(this)">`
            : '';
          return `<div class="preview-button-tile ${hasIcon ? 'has-icon' : 'no-icon'}">
            ${iconCell}
            ${label ? `<div class="bt-label">${label}</div>` : ''}
          </div>`;
        }
      };

      let gridHtml;
      if (isRow) {
        const tiles = items.map(i => `<div style="flex:0 0 104px; width:104px;">${tileHtml(i)}</div>`).join('');
        gridHtml = `<div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:2px;">${tiles}</div>`;
      } else {
        const tiles = items.map(tileHtml).join('');
        gridHtml = `<div class="preview-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr))">${tiles}</div>`;
      }

      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>${card.type} (${items.length} items)</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          ${gridHtml}
        </div>`;
    } else if (card.type === 'camera') {
      const o = card.options || {};
      const title = o.name || haFriendlyName(o.entity_id) || prettyEntityName(o.entity_id) || 'Camera';
      const aspect = (o.aspect != null && Number(o.aspect) > 0) ? Number(o.aspect) : (16 / 9);
      const fit = o.fit === 'contain' ? 'contain' : 'cover';
      const mode = o.mode === 'snapshot' ? 'snapshot' : 'stream';
      const paddingPct = (100 / aspect).toFixed(3);
      // Only try to pull a real frame when the editor is served by the device
      // itself (it has the HA token to proxy /camera-snapshot). On GitHub Pages
      // / offline this stays a placeholder, like the other cards' live data.
      const canFetch = (typeof deviceModeAvailable !== 'undefined' && deviceModeAvailable) && !!o.entity_id;
      const snapUrl = canFetch ? `/camera-snapshot?entity=${encodeURIComponent(o.entity_id)}&_=${Date.now()}` : '';
      const placeholder = `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#9FB6BD;"><div style="width:44px; height:44px;">${mdiSvg(MDI.video)}</div></div>`;
      const imgHtml = snapUrl
        ? `<img src="${snapUrl}" alt="${title}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:${fit};" onerror="this.style.display='none'">`
        : '';
      cardEl.innerHTML = `
        <div class="card">
          <div class="card-title"><span>camera (${mode})</span><span><span class="remove" style="color:#00E5FF" onclick="editCard(${idx})">✎</span> <span class="remove" onclick="removeCard(${idx})">✕</span></span></div>
          <div style="position:relative; width:100%; padding-top:${paddingPct}%; border-radius:14px; overflow:hidden; background:#0E1116;">
            ${placeholder}
            ${imgHtml}
            <div style="position:absolute; left:0; right:0; bottom:0; padding:8px 12px; background:linear-gradient(to top, rgba(0,0,0,.75), transparent); color:#fff; font-weight:600; font-size:13px;">${title}</div>
          </div>
          <div class="hint" style="margin-top:6px">Entity: ${o.entity_id || 'camera.entity'} · ${canFetch ? 'live frame from this device' : "placeholder here — a real still shows when opened from your device's /builder/"} · on the remote: ${mode === 'stream' ? 'live MJPEG stream (auto-falls-back to stills)' : 'still snapshot refresh'}</div>
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

  enhanceCardControls(contentContainer);
}

// ---- HA-style card controls: reorder (drag or arrows) ----------------------
// Applied uniformly to every card wrapper appended above instead of touching
// each card type's own template string. Adds ↑/↓ buttons next to the
// existing ✎/✕ icons in .card-title, and makes the whole card draggable so
// it can be dropped onto another card's position, same idea as dragging a
// card in the Home Assistant dashboard editor.
function enhanceCardControls(contentContainer) {
  const cardEls = Array.from(contentContainer.children);
  cardEls.forEach((cardEl, idx) => {
    const titleBar = cardEl.querySelector('.card-title');
    if (titleBar) {
      const iconsSpan = titleBar.querySelector('span:last-child');
      if (iconsSpan && !iconsSpan.querySelector('.card-move-up')) {
        const upSpan = document.createElement('span');
        upSpan.className = 'remove card-move-up';
        upSpan.title = 'Move up';
        upSpan.textContent = '↑';
        upSpan.style.opacity = idx === 0 ? '0.3' : '1';
        upSpan.style.cursor = idx === 0 ? 'default' : 'pointer';
        if (idx > 0) upSpan.onclick = () => moveCard(idx, -1);

        const downSpan = document.createElement('span');
        downSpan.className = 'remove card-move-down';
        downSpan.title = 'Move down';
        downSpan.textContent = '↓';
        downSpan.style.opacity = idx === cardEls.length - 1 ? '0.3' : '1';
        downSpan.style.cursor = idx === cardEls.length - 1 ? 'default' : 'pointer';
        if (idx < cardEls.length - 1) downSpan.onclick = () => moveCard(idx, 1);

        iconsSpan.prepend(downSpan, upSpan);
      }
    }

    cardEl.classList.add('ha-draggable-card');
    cardEl.setAttribute('draggable', 'true');
    cardEl.dataset.cardIdx = String(idx);
    cardEl.addEventListener('dragstart', (e) => {
      cardEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    });
    cardEl.addEventListener('dragend', () => cardEl.classList.remove('dragging'));
    cardEl.addEventListener('dragover', (e) => { e.preventDefault(); cardEl.classList.add('drag-over'); });
    cardEl.addEventListener('dragleave', () => cardEl.classList.remove('drag-over'));
    cardEl.addEventListener('drop', (e) => {
      e.preventDefault();
      cardEl.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = parseInt(cardEl.dataset.cardIdx, 10);
      if (!isNaN(fromIdx) && !isNaN(toIdx) && fromIdx !== toIdx) reorderCard(fromIdx, toIdx);
    });
  });
}
