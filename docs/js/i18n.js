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

    // Resolves once the string table is loaded. Never rejects — a failed
    // load (e.g. opening index.html straight from disk) leaves t()
    // returning raw keys and applyUiI18n() keeping the HTML's English
    // defaults, instead of breaking the editor.
    ready: fetch('i18n/' + lang + '.json')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
      .then(strings => { i18n.strings = strings; })
      .catch(e => { console.log('i18n load failed', e); }),

    // t('key') → the translated string; t('key', a1, a2, …) substitutes
    // Android-style positional args (%1$s, %2$d, …) so the same value works
    // on both sides (%% — Android's escaped percent — is collapsed too).
    // Missing keys log once and fall back to the key itself.
    t: (key, ...args) => {
      const value = i18n.strings[key];
      if (value === undefined) {
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
