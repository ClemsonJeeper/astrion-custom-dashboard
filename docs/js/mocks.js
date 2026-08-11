const CLIMATE_MOCK = {
  hvac_modes: ['fan_only', 'heat', 'cool', 'heat_cool', 'dry'],
  fan_modes: ['auto', 'quiet', '1', '2', '3', '4', '5'],
  swing_modes: ['stop', 'swing'],
  state: 'cool',
  fan_mode: 'auto',
  swing_mode: 'stop',
  temperature: 24,
  current_temperature: 27,
};

// Mirrors assets/ha_labels/en.json — kept separate since this is a static
// preview page, not the running app (which reads the real per-language JSON).
const CLIMATE_HVAC_LABELS = { off: 'Off', heat: 'Heat', cool: 'Cool', heat_cool: 'Auto', auto: 'Auto', dry: 'Dry', fan_only: 'Fan' };
const CLIMATE_FAN_LABELS = { auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High', silent: 'Silent', quiet: 'Silent', turbo: 'Turbo' };
const CLIMATE_SWING_LABELS = { off: 'Off', on: 'On', both: 'Both', vertical: 'Vertical', horizontal: 'Horizontal', stop: 'Off', swing: 'On' };

function climateHvacLabel(m) { return CLIMATE_HVAC_LABELS[m] || (m.charAt(0).toUpperCase() + m.slice(1)); }
function climateFanLabel(f) { return CLIMATE_FAN_LABELS[f.toLowerCase()] || (f.charAt(0).toUpperCase() + f.slice(1)); }
function climateSwingLabel(s) { return CLIMATE_SWING_LABELS[s.toLowerCase()] || (s.charAt(0).toUpperCase() + s.slice(1)); }

// Same MDI path data as MdiIcons.kt — see that file for the source/rationale.
const MDI = {
  power: 'M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13',
  fire: 'M17.66,11.2C17.43,10.9 17.15,10.64 16.89,10.38C16.22,9.78 15.46,9.35 14.82,8.72C13.33,7.26 13,4.85 13.95,3C13,3.23 12.17,3.75 11.46,4.32C8.87,6.4 7.85,10.07 9.07,13.22C9.11,13.32 9.15,13.42 9.15,13.55C9.15,13.77 9,13.97 8.8,14.05C8.57,14.15 8.33,14.09 8.14,13.93C8.08,13.88 8.04,13.83 8,13.76C6.87,12.33 6.69,10.28 7.45,8.64C5.78,10 4.87,12.3 5,14.47C5.06,14.97 5.12,15.47 5.29,15.97C5.43,16.57 5.7,17.17 6,17.7C7.08,19.43 8.95,20.67 10.96,20.92C13.1,21.19 15.39,20.8 17.03,19.32C18.86,17.66 19.5,15 18.56,12.72L18.43,12.46C18.22,12 17.66,11.2 17.66,11.2M14.5,17.5C14.22,17.74 13.76,18 13.4,18.1C12.28,18.5 11.16,17.94 10.5,17.28C11.69,17 12.4,16.12 12.61,15.23C12.78,14.43 12.46,13.77 12.33,13C12.21,12.26 12.23,11.63 12.5,10.94C12.69,11.32 12.89,11.7 13.13,12C13.9,13 15.11,13.44 15.37,14.8C15.41,14.94 15.43,15.08 15.43,15.23C15.46,16.05 15.1,16.95 14.5,17.5H14.5Z',
  snowflake: 'M20.79,13.95L18.46,14.57L16.46,13.44V10.56L18.46,9.43L20.79,10.05L21.31,8.12L19.54,7.65L20,5.88L18.07,5.36L17.45,7.69L15.45,8.82L13,7.38V5.12L14.71,3.41L13.29,2L12,3.29L10.71,2L9.29,3.41L11,5.12V7.38L8.5,8.82L6.5,7.69L5.92,5.36L4,5.88L4.47,7.65L2.7,8.12L3.22,10.05L5.55,9.43L7.55,10.56V13.45L5.55,14.58L3.22,13.96L2.7,15.89L4.47,16.36L4,18.12L5.93,18.64L6.55,16.31L8.55,15.18L11,16.62V18.88L9.29,20.59L10.71,22L12,20.71L13.29,22L14.7,20.59L13,18.88V16.62L15.5,15.17L17.5,16.3L18.12,18.63L20,18.12L19.53,16.35L21.3,15.88L20.79,13.95M9.5,10.56L12,9.11L14.5,10.56V13.44L12,14.89L9.5,13.44V10.56Z',
  heatCool: 'M12.92,1.58L11.18,2.58L12.39,4.67L11.8,6.85L9,7.6L7.38,6L7.42,3.59L5.43,3.59L5.43,5.42L3.59,5.42L3.6,7.42L6,7.42L7.65,9.03L6.9,11.82L4.68,12.4L2.59,11.2L1.59,12.93L3.17,13.84L2.26,15.42L4,16.42L5.19,14.33L7.42,13.75L7.92,14.26L9.32,12.86L8.78,12.32L9.53,9.54L12.32,8.78L12.85,9.32L14.26,7.91L13.73,7.37L14.32,5.19L16.41,4L15.41,2.25L13.83,3.16L12.92,1.58M20.72,4L4,20.72L5.27,22L10.16,17.11C10.63,17.43 11.15,17.68 11.71,17.83C14.38,18.55 17.12,16.96 17.83,14.29C18.22,12.86 17.93,11.36 17.11,10.16L22,5.27L20.72,4M18.74,9C19.18,9.63 19.53,10.38 19.75,11.19C19.97,12 20.03,12.81 19.96,13.61L22.65,10.41L18.74,9M19.32,15.95C19,16.67 18.5,17.35 17.93,17.94C17.34,18.53 16.66,19 15.96,19.34L20.05,20.06L19.32,15.95M9,18.71L10.41,22.66L13.59,19.95C12.81,20 12,19.97 11.19,19.76C10.36,19.54 9.62,19.17 9,18.71Z',
  fan: 'M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z',
  fanAuto: 'M12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4,10.39 9.21,10.87C8.28,10.68 7.23,10.25 6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 10.88,14.79C10.68,15.71 10.24,16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13,21.78 13.5,21.41C13.19,20.67 13,19.86 13,19C13,17.59 13.5,16.3 14.3,15.28C14.17,14.97 14.03,14.65 13.86,14.34C14.26,14 14.57,13.59 14.77,13.11C15.26,13.21 15.78,13.39 16.25,13.67C17.07,13.25 18,13 19,13C20.05,13 21.03,13.27 21.89,13.74C21.95,13.37 22,12.96 22,12.5C22,8.92 18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11,9.22C13.3,8.29 13.74,7.24 14.73,6.75C17.09,5.57 17,2 12.5,2M12,11C12.54,11 13,11.45 13,12C13,12.55 12.54,13 12,13C11.43,13 11,12.55 11,12C11,11.45 11.43,11 12,11M18,15C16.89,15 16,15.9 16,17V23H18V21H20V23H22V17C22,15.9 21.1,15 20,15M18,17H20V19H18Z',
  fanQuiet: 'M13,19C13,17.59 13.5,16.3 14.3,15.28C14.17,14.97 14.03,14.65 13.86,14.34C14.26,14 14.57,13.59 14.77,13.11C15.26,13.21 15.78,13.39 16.25,13.67C17.07,13.25 18,13 19,13C20.05,13 21.03,13.27 21.89,13.74C21.95,13.37 22,12.96 22,12.5C22,8.92 18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11,9.22C13.3,8.29 13.74,7.24 14.73,6.75C17.09,5.57 17,2 12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4,10.39 9.21,10.87C8.28,10.68 7.23,10.25 6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 10.88,14.79C10.68,15.71 10.24,16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13,21.78 13.5,21.41C13.19,20.67 13,19.86 13,19M12,13C11.43,13 11,12.55 11,12S11.43,11 12,11C12.54,11 13,11.45 13,12S12.54,13 12,13M19,19.17L22.17,16L23.59,17.41L19,22L14.41,17.41L15.83,16L19,19.17',
  fan1: 'M10,7V9H12V17H14V7H10Z',
  fan2: 'M9,7V9H13V11H11A2,2 0 0,0 9,13V17H11L15,17V15H11V13H13A2,2 0 0,0 15,11V9A2,2 0 0,0 13,7H9Z',
  fan3: 'M15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9C15,7.89 14.1,7 13,7H9V9H13V11H11V13H13V15H9V17H13A2,2 0 0,0 15,15',
  fan4: 'M9,7V13H13V17H15V7H13V11H11V7H9Z',
  fan5: 'M9,7V13H13V15H9V17H13A2,2 0 0,0 15,15V13A2,2 0 0,0 13,11H11V9H15V7H9Z',
  swingOff: 'M13,8.1V6.1C18.3,6.6 20,11.4 20,14H23L20.1,16.9L17.2,14H18C18,11.9 16.4,8.6 13,8.1M7.8,7.1L2.4,1.7L1.1,3L6.3,8.2C4.7,10 4,12.4 4,14H1L5,18L9,14H6C6,12.7 6.6,11 7.9,9.7L20.9,22.7L22.2,21.4L9.3,8.7L7.8,7.1M11,6.1L9.5,6.4L11,7.8V6.1Z',
  swingOn: 'M17.45,17.55L12,23L6.55,17.55L7.96,16.14L11,19.17V4.83L7.96,7.86L6.55,6.45L12,1L17.45,6.45L16.04,7.86L13,4.83V19.17L16.04,16.14L17.45,17.55Z',
  waterPercent: 'M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z',
};
function mdiSvg(path) { return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${path}"/></svg>`; }

function climateHvacIcon(m) {
  if (m === 'heat') return MDI.fire;
  if (m === 'cool') return MDI.snowflake;
  if (m === 'heat_cool' || m === 'auto') return MDI.heatCool;
  if (m === 'dry') return MDI.waterPercent;
  if (m === 'fan_only') return MDI.fan;
  return MDI.power;
}
function climateFanIcon(f) {
  const l = f.toLowerCase();
  if (l === 'auto') return MDI.fanAuto;
  if (l === 'quiet' || l === 'silent') return MDI.fanQuiet;
  if (['1', '2', '3', '4', '5'].includes(l)) return MDI['fan' + l];
  return MDI.fan;
}
function climateSwingIcon(s) {
  const l = s.toLowerCase();
  return (l === 'off' || l === 'stop') ? MDI.swingOff : MDI.swingOn;
}

// Mirrors ClimateCard.kt's balancedRows(): splits into rows of at most
// maxPerRow, but balanced (5 items @ max 4 -> 3+2, not a lopsided 4+1).
function climateBalancedRows(items, maxPerRow) {
  if (!items.length) return [];
  const rows = Math.ceil(items.length / maxPerRow);
  const perRow = Math.ceil(items.length / rows);
  const out = [];
  for (let i = 0; i < items.length; i += perRow) out.push(items.slice(i, i + perRow));
  return out;
}

function climateChipRowsHtml(items, selected, style, maxPerRow, labelFn, iconFn) {
  return climateBalancedRows(items, maxPerRow).map(row => `
    <div class="cc-row">
      ${row.map(v => {
        const isSel = (v || '').toLowerCase() === (selected || '').toLowerCase();
        const content = style === 'label' ? `<span>${labelFn(v)}</span>` : mdiSvg(iconFn(v));
        return `<div class="cc-chip ${isSel ? 'cc-chip-selected' : ''}">${content}</div>`;
      }).join('')}
    </div>`).join('');
}

// Fake example weather entity — real data (from weather.saint_martin_sur_le_pre)
// for the current condition/temp; the day-by-day forecast is synthetic since
// the real card fetches it via a live service call (weather.get_forecasts),
// not something visible in Dev Tools > States for a static preview.
const WEATHER_MOCK = {
  friendly_name: 'Saint-Martin-sur-le-Pré',
  state: 'sunny',
  temperature: 21.1,
  forecast: [
    { day: 'Mon', condition: 'sunny', low: 12, high: 22 },
    { day: 'Tue', condition: 'partlycloudy', low: 13, high: 20 },
    { day: 'Wed', condition: 'cloudy', low: 11, high: 18 },
    { day: 'Thu', condition: 'rainy', low: 10, high: 16 },
  ],
};

// Mirrors assets/ha_labels/en.json's weather_condition category.
const WEATHER_CONDITION_LABELS = {
  'clear-night': 'Clear night', clear: 'Clear', cloudy: 'Cloudy', partlycloudy: 'Partly cloudy',
  sunny: 'Sunny', rainy: 'Rainy', pouring: 'Heavy rain', snowy: 'Snowy', 'snowy-rainy': 'Snow and rain',
  windy: 'Windy', 'windy-variant': 'Windy', fog: 'Fog', lightning: 'Lightning',
  'lightning-rainy': 'Lightning with rain', hail: 'Hail', exceptional: 'Exceptional',
};
function weatherConditionLabel(c) { return WEATHER_CONDITION_LABELS[c] || c; }

// Mirrors ClockWeatherCard.kt's emojiFor().
function weatherEmoji(c) {
  if (c === 'sunny' || c === 'clear') return '☀️';
  if (c === 'clear-night') return '🌙';
  if (c === 'partlycloudy') return '⛅';
  if (c === 'cloudy') return '☁️';
  if (c === 'fog') return '🌫️';
  if (c === 'rainy' || c === 'pouring') return '🌧️';
  if (c === 'lightning' || c === 'lightning-rainy') return '⛈️';
  if (c === 'snowy' || c === 'snowy-rainy') return '❄️';
  if (c === 'windy' || c === 'windy-variant') return '💨';
  if (c === 'hail') return '🌨️';
  return '🌡️';
}
function weatherTrim(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

// Fake example vacuum entity (real data, from
// vacuum.xiaomi_roborock_vacuum_s50_xiaomi_vacuum_roborock_s50).
const VACUUM_MOCK = {
  friendly_name: 'Xiaomi Roborock Vacuum S50',
  state: 'docked',
  fan_speed: 'high',
  fan_speed_list: ['min', 'medium', 'high', 'max', 'mop'],
};

// Mirrors assets/ha_labels/en.json's vacuum_state category.
const VACUUM_STATE_LABELS = { cleaning: 'Cleaning', docked: 'Docked', idle: 'Idle', paused: 'Paused', returning: 'Returning to dock', error: 'Error' };
function vacuumStateLabel(s) { return VACUUM_STATE_LABELS[s] || vacuumPrettyLabel(s); }
// Mirrors VacuumCard.kt's prettyVacuumLabel() — used for fan_speed only,
// since (unlike vacuum_state) it isn't a fixed HA-wide value set.
function vacuumPrettyLabel(s) { return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

// Fake example fan entity (real data, from fan.mi_smart_standing_fan_2).
const FAN_MOCK = {
  friendly_name: 'Mi Smart Standing Fan 2',
  state: 'on',
  preset_modes: ['off', 'Level 1', 'Level 2', 'Level 3', 'Level 4'],
  preset_mode: 'Level 4',
  oscillating: true,
  percentage: 100,
  percentage_step: 1,
};

// Mirrors FanCard.kt's oscillate-toggle label — reuses the swing_mode
// on/off translation, same concept (oscillation on/off) as ClimateCard's swing.
function fanOscillateLabel(on) { return on ? CLIMATE_SWING_LABELS.on : CLIMATE_SWING_LABELS.off; }

// Fake example cover entity (real data, from cover.volet_chambre_noham).
const COVER_MOCK = {
  friendly_name: 'Volet Chambre Noham',
  state: 'open',
  is_closed: false,
  current_position: 100,
  device_class: 'shutter',
};

// Mirrors assets/ha_labels/en.json's cover_state category (used only as a
// fallback for covers with no current_position — see coverStateLabel below).
const COVER_STATE_LABELS = { open: 'Open', closed: 'Closed', opening: 'Opening', closing: 'Closing', stopped: 'Stopped', unknown: 'Unknown' };
function coverStateLabel(s) { return COVER_STATE_LABELS[s] || (s.charAt(0).toUpperCase() + s.slice(1)); }

// Mirrors CoverCard.kt's stateLabel logic: 100% -> "Open", 0% -> "Closed",
// anything in between -> "N% open"; falls back to the raw HA state when the
// entity has no current_position attribute at all.
function coverPositionLabel(position, rawState) {
  if (position === 100) return 'Open';
  if (position === 0) return 'Closed';
  if (position != null) return `${position}% open`;
  return coverStateLabel(rawState);
}

// Same MDI path data as MdiIcons.kt's WindowShutterClosed/Open and
// CoverUp/CoverDown — see that file for the source/rationale. "stop" mirrors
// Material Icons' filled Stop glyph (a plain filled square), used as-is by
// CoverCard.kt for the middle button.
MDI.windowShutterClosed = 'M3,4H21V8H19V20H17V8H7V20H5V8H3V4M8,9H16V11H8V9M8,12H16V14H8V12M8,15H16V17H8V15M8,18H16V20H8V18Z';
MDI.windowShutterOpen = 'M3,4H21V8H19V20H17V8H7V20H5V8H3V4M8,9H16V11H8V9Z';
MDI.coverUp = 'M21,19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19C20.11,3 21,3.9 21,5V19M13,18V9.5L16.5,13L17.92,11.58L12,5.66L6.08,11.58L7.5,13L11,9.5V18H13Z';
MDI.coverDown = 'M3,5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5M11,6V14.5L7.5,11L6.08,12.42L12,18.34L17.92,12.42L16.5,11L13,14.5V6H11Z';
MDI.stop = 'M6,6H18V18H6V6Z';
// Same shape as MdiIcons.kt's LightbulbOn/LightbulbOff, used by LightCard.kt
// (swaps automatically with on/off, same as that card).
MDI.lightbulbOn = 'M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z';
MDI.lightbulbOff = 'M12,2C9.76,2 7.78,3.05 6.5,4.68L16.31,14.5C17.94,13.21 19,11.24 19,9A7,7 0 0,0 12,2M3.28,4L2,5.27L5.04,8.3C5,8.53 5,8.76 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H14.73L18.73,22L20,20.72L3.28,4M9,20V21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9Z';

// Fake example light entity — colour-temp/xy profile (no rgb_color), the
// same shape a Hue-style colour-temp bulb reports, generic name (no local
// IP or personal entity id baked into a file this builder ships publicly).
const LIGHT_MOCK = {
  friendly_name: 'Living Room Lamp',
  state: 'on',
  brightness: 191, // 0..255, ≈75%
  supported_color_modes: ['color_temp', 'xy'],
  color_temp_kelvin: 3000, // used only to derive a warm preview tint below
  rgb_color: null,
};

// Approximates the on-screen warmth of a given colour temperature for the
// "use_light_color" preview, since this mock has no rgb_color of its own
// (color_temp/xy lights report kelvin, not RGB — LightCard.kt itself only
// tints from a real rgb_color, this is preview-only convenience).
function kelvinToPreviewRgb(k) {
  if (k <= 2700) return [255, 179, 102]; // warm
  if (k <= 4000) return [255, 214, 170]; // neutral-warm
  return [255, 249, 253]; // cool/neutral white
}

// Mirrors LightCard.kt's stateLabel logic: off -> "Off", 0% -> "Off",
// otherwise "N%" — only shown when showBrightness is on and the light
// reports a brightness; a plain toggle-only light just shows "On".
function lightStateLabel(isOn, brightnessPct, showBrightness) {
  if (!isOn) return 'Off';
  if (!showBrightness || brightnessPct == null) return 'On';
  if (brightnessPct <= 0) return 'Off';
  return `${brightnessPct}%`;
}
