let dashboardData = { startPage: 0, pages: [ { name: "Home", cards: [], hotkeys: [], longHotkeys: [] } ], hotkeys: [], longHotkeys: [], irDevices: [], activities: [] };
let currentActivePage = 0;
let editingCard = null;    // index of the card being edited within the current page, or null
let editingHotkey = null;  // { scope, listType, i } of the hotkey being edited, or null
let editingPage = null;    // index of the page being edited in the page dialog, or null (= adding a new one)

/**
 * Turns a display name into a stable, ASCII id — shared by ir.js
 * (irDevices) and activities.js (activities) so both slugify the same way.
 * Diacritics are stripped via Unicode NFD decomposition rather than dropped
 * outright: "Série" -> "e" would silently swallow the accented letter if we
 * matched straight against [^a-z0-9], producing "s_rie" instead of "serie".
 * `normalize('NFD')` splits "é" into "e" + a separate combining accent
 * codepoint (U+0301), which \u0300-\u036f then strips, leaving the plain
 * letter behind.
 */
function slugify(name, fallbackPrefix) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || (fallbackPrefix + '_' + Date.now());
}

function resetAll() {
  dashboardData = { startPage: 0, pages: [ { name: "Home", cards: [], hotkeys: [], longHotkeys: [] } ], hotkeys: [], longHotkeys: [], irDevices: [], activities: [] };
  currentActivePage = 0;
  document.getElementById('importBox').value = '';
  initEditor();
}

function importJson() {
  const raw = document.getElementById('importBox').value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    dashboardData = {
      startPage: parsed.startPage || 0,
      pages: (parsed.pages || []).map(p => ({
        name: p.name || 'Page',
        cards: p.cards || [],
        hotkeys: p.hotkeys || [],
        longHotkeys: p.longHotkeys || [],
      })),
      hotkeys: parsed.hotkeys || [],
      longHotkeys: parsed.longHotkeys || [],
      irDevices: parsed.irDevices || [],
      activities: parsed.activities || [],
    };
    if (dashboardData.pages.length === 0) dashboardData.pages.push({ name: "Home", cards: [], hotkeys: [], longHotkeys: [] });
    currentActivePage = 0;
    initEditor();
    alert('dashboard.json loaded — you can now edit it below.');
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
}

function initEditor() {
  editingCard = null;
  editingHotkey = null;
  editingPage = null;
  renderTabs();
  renderPreview();
  renderHotkeysList();
  renderIrDevicesList();
  renderActivitiesList();
  updateJsonOutput();
  updateHotkeyActionInputs();
}

// ---- Pages: add / rename / delete, all via the page dialog -----------------
// Mirrors Home Assistant's "views" editor: pages live as tabs above the
// preview; a "+" tab adds one, and each tab's own settings (rename, delete,
// set-as-start-page) open in a small dialog instead of a permanent form.

function onPageChange(index) {
  currentActivePage = index;
  cancelCardEdit();
  renderTabs();
  renderPreview();
  renderHotkeysList();
}

function openPageDialog(index) {
  editingPage = index; // null = adding a new page
  const isNew = index === null;
  document.getElementById('pageDialogTitle').textContent = isNew ? 'Add page' : 'Page settings';
  document.getElementById('pageDialogName').value = isNew ? '' : dashboardData.pages[index].name;
  document.getElementById('pageDialogStart').checked = isNew ? false : (dashboardData.startPage === index);
  document.getElementById('pageDialogDeleteBtn').style.display = isNew ? 'none' : '';
  document.getElementById('pageDialogModal').classList.add('open');
  document.getElementById('pageDialogName').focus();
}

function closePageDialog() {
  document.getElementById('pageDialogModal').classList.remove('open');
  editingPage = null;
}

function savePageDialog() {
  const name = document.getElementById('pageDialogName').value.trim();
  if (!name) { alert('Give the page a name.'); return; }
  const makeStart = document.getElementById('pageDialogStart').checked;

  if (editingPage === null) {
    dashboardData.pages.push({ name, cards: [], hotkeys: [], longHotkeys: [] });
    currentActivePage = dashboardData.pages.length - 1;
    if (makeStart) dashboardData.startPage = currentActivePage;
  } else {
    dashboardData.pages[editingPage].name = name;
    if (makeStart) dashboardData.startPage = editingPage;
    else if (dashboardData.startPage === editingPage) dashboardData.startPage = 0;
  }

  closePageDialog();
  renderTabs(); renderPreview(); renderHotkeysList(); updateJsonOutput();
}

function deletePageFromDialog() {
  const i = editingPage;
  if (i === null) return;
  if (dashboardData.pages.length <= 1) { alert('You need at least one page.'); return; }
  if (!confirm(`Delete page "${dashboardData.pages[i].name}" and everything on it (cards, page hotkeys)?`)) return;
  dashboardData.pages.splice(i, 1);
  if (currentActivePage >= dashboardData.pages.length) currentActivePage = dashboardData.pages.length - 1;
  if (dashboardData.startPage >= dashboardData.pages.length) dashboardData.startPage = 0;
  editingCard = null; editingHotkey = null;
  closePageDialog();
  renderTabs(); renderPreview(); renderHotkeysList(); updateJsonOutput();
}
