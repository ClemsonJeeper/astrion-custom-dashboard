// ---- Shared i18n string table -----------------------------------------------
//
// Single source of truth for every user-facing string: one JSON file per
// language at i18n/<lang>.json, shared with the Android app (which generates
// its res/values*/strings.xml from the same files at build time via the
// generateI18nStrings Gradle task). scripts/sync-i18n.sh copies them next to
// this page — both here on GitHub Pages and into the app's bundled /builder/
// server — so a relative fetch works in both contexts.
//
// This file must load BEFORE every other editor script. Consumers either
// `await I18N.ready` before touching strings, or call I18N.t() inside code
// that already runs after page boot (event handlers, async fetch callbacks).

window.I18N = (() => {
  'use strict';

  const lang = ((navigator.language || 'en').split('-')[0]).startsWith('fr') ? 'fr' : 'en';

  const i18n = {
    lang: lang,
    strings: {},
    ha: {},

    // Resolves once the string table is loaded. Never rejects — a failed
    // load (e.g. opening index.html straight from disk) leaves t()
    // returning raw keys and applyUiI18n() keeping the HTML's English
    // defaults, instead of breaking the editor.
    ready: fetch('i18n/' + lang + '.json')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
      .then(strings => {
        i18n.strings = strings;
        // Nested "ha" object: raw Home Assistant state values -> translated
        // labels, by category (hvac_mode, fan_mode, weather_condition, …).
        // Mirrors what the app loads from its generated ha_labels/<lang>.json.
        i18n.ha = strings.ha || {};
      })
      .catch(e => { console.log('i18n load failed', e); }),

    // t('key') → the translated string; t('key', a1, a2, …) substitutes
    // Android-style positional args (%1$s, %2$d, …) so the same value works
    // on both sides (%% — Android's escaped percent — is collapsed too).
    // Missing keys log once and fall back to the key itself.
    t: (key, ...args) => {
      const value = i18n.strings[key];
      if (typeof value !== 'string') {
        console.warn('Missing i18n key: ' + key);
        return key;
      }
      if (!args.length) return value.replace(/%%/g, '%');
      return value
        .replace(/%(\d+)\$[sd]/g, (m, i) => {
          const arg = args[Number(i) - 1];
          return arg === undefined ? m : String(arg);
        })
        .replace(/%%/g, '%');
    },
  };

  return i18n;
})();

// Applies the loaded strings to the static markup. Runs after I18N.ready
// (gated in index.html's boot script); on a failed load the HTML's static
// English defaults stay untouched instead of being splattered with raw keys.
//
// Two markup conventions:
//   data-i18n="key"            → element's textContent is replaced
//   data-i18n-attr="attr:key"  → any attribute is replaced (placeholder,
//                                title, optgroup label…); several pairs can
//                                be chained: "placeholder:k1;title:k2"
// NOTE: data-i18n replaces the ENTIRE textContent — for elements that wrap
// child elements (a label around its input, an icon span…), put the
// attribute on a <span> around the text portion instead.
function applyUiI18n() {
  if (!Object.keys(I18N.strings).length) return;
  document.documentElement.lang = I18N.lang;

  // Beta toggle + physical-key tooltips predate the generic mechanism.
  const betaLabel = document.getElementById('betaToggleLabel');
  if (betaLabel) betaLabel.textContent = I18N.t('web_release_also_beta');
  document.querySelectorAll('button[data-hwkey]').forEach(btn => {
    const key = 'web_hwkey_' + btn.dataset.hwkey.toLowerCase();
    if (I18N.strings[key] !== undefined) btn.title = I18N.t(key);
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const value = I18N.strings[el.dataset.i18n];
    if (typeof value === 'string') el.textContent = value;
  });
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s.trim());
      const value = I18N.strings[key];
      if (typeof value === 'string') el.setAttribute(attr, value);
    });
  });
}
