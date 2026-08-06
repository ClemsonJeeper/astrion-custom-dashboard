let dashboardData = { startPage: 0, pages: [ { name: "Home", cards: [], hotkeys: [], longHotkeys: [] } ], hotkeys: [], longHotkeys: [], irActivities: [] };
let currentActivePage = 0;
let editingCard = null;    // index of the card being edited within the current page, or null
let editingHotkey = null;  // { scope, listType, i } of the hotkey being edited, or null

function resetAll() {
  dashboardData = { startPage: 0, pages: [ { name: "Home", cards: [], hotkeys: [], longHotkeys: [] } ], hotkeys: [], longHotkeys: [], irActivities: [] };
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
      irActivities: parsed.irActivities || [],
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
  renderPageSelect();
  renderStartPageSelect();
  renderPagesList();
  renderTabs();
  renderPreview();
  renderHotkeysList();
  renderIrActivitiesList();
  updateJsonOutput();
  updateCardFormInputs();
  updateHotkeyActionInputs();
}

// ---- Pages: rename / delete -------------------------------------------------

function renderPagesList() {
  const container = document.getElementById('pagesList');
  if (!container) return;
  container.innerHTML = '';
  dashboardData.pages.forEach((page, i) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <input type="text" value="${page.name.replace(/"/g, '&quot;')}" style="margin:0" onchange="renamePage(${i}, this.value)">
      <span class="remove" onclick="deletePage(${i})">✕</span>
    `;
    container.appendChild(row);
  });
}

function renamePage(i, newName) {
  newName = newName.trim();
  if (!newName) { renderPagesList(); return; }
  dashboardData.pages[i].name = newName;
  renderPageSelect(); renderStartPageSelect(); renderTabs(); renderPreview(); updateJsonOutput();
}

function deletePage(i) {
  if (dashboardData.pages.length <= 1) { alert('You need at least one page.'); return; }
  if (!confirm(`Delete page "${dashboardData.pages[i].name}" and everything on it (cards, page hotkeys)?`)) return;
  dashboardData.pages.splice(i, 1);
  if (currentActivePage >= dashboardData.pages.length) currentActivePage = dashboardData.pages.length - 1;
  if (dashboardData.startPage >= dashboardData.pages.length) dashboardData.startPage = 0;
  editingCard = null; editingHotkey = null;
  renderPageSelect(); renderStartPageSelect(); renderPagesList(); renderTabs();
  renderPreview(); renderHotkeysList(); updateJsonOutput(); updateCardFormInputs();
}

function renderPageSelect() {
  const select = document.getElementById('pageSelect');
  select.innerHTML = '';
  dashboardData.pages.forEach((page, index) => {
    const opt = document.createElement('option');
    opt.value = index; opt.innerText = page.name;
    if (index === currentActivePage) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderStartPageSelect() {
  const select = document.getElementById('startPageSelect');
  select.innerHTML = '';
  dashboardData.pages.forEach((page, index) => {
    const opt = document.createElement('option');
    opt.value = index; opt.innerText = page.name;
    if (index === dashboardData.startPage) opt.selected = true;
    select.appendChild(opt);
  });
}

function setStartPage() {
  dashboardData.startPage = parseInt(document.getElementById('startPageSelect').value, 10);
  updateJsonOutput();
}

function onPageChange() {
  currentActivePage = parseInt(document.getElementById('pageSelect').value, 10);
  cancelCardEdit();
  renderTabs();
  renderPreview();
  renderHotkeysList();
  updateCardFormInputs();
}

function addPage() {
  const nameInput = document.getElementById('newPageName');
  if (!nameInput.value.trim()) return;
  dashboardData.pages.push({ name: nameInput.value.trim(), cards: [], hotkeys: [], longHotkeys: [] });
  nameInput.value = '';
  currentActivePage = dashboardData.pages.length - 1;
  renderPageSelect(); renderStartPageSelect(); renderPagesList(); renderTabs(); renderPreview(); renderHotkeysList(); updateJsonOutput();
}

