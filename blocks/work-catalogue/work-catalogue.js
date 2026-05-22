const INDEX_URL = '/query-index.json';
const ISSUES_PREFIX = '/issues/';
const VIEWS = ['timeline', 'project', 'issue'];
const HASH_KEY = 'view';

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return (y && m && d) ? new Date(y, m - 1, d) : null;
}

function fmt(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return dateStr || '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function cleanTitle(title) {
  return (title || 'Untitled')
    .replace(/\s*—\s*Chronicle(?:Chronicle)+\s*$/i, '')
    .replace(/\s*—\s*Chronicle\s*$/i, '');
}

function groupBy(items, keyFn) {
  const fn = typeof keyFn === 'function' ? keyFn : (item) => item[keyFn] || 'Other';
  return items.reduce((acc, item) => {
    const k = fn(item) || 'Other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function getHashView() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const v = params.get(HASH_KEY);
  return VIEWS.includes(v) ? v : null;
}

function setHashView(view) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  params.set(HASH_KEY, view);
  window.history.replaceState(null, '', `#${params.toString()}`);
}

function entryCard(entry) {
  const div = document.createElement('div');
  div.className = 'wc-card';
  div.innerHTML = `
    <div class="wc-card-meta">
      ${entry.project ? `<span class="wc-project">${entry.project}</span>` : ''}
      ${entry['issue-number'] ? `<a class="wc-issue-badge" href="${entry['issue-url'] || '#'}" target="_blank" rel="noopener">#${entry['issue-number']}</a>` : ''}
      ${entry.date ? `<span class="wc-date">${fmt(entry.date)}</span>` : ''}
    </div>
    <a class="wc-title" href="${entry.path}">${cleanTitle(entry.title)}</a>
    ${entry.description ? `<p class="wc-desc">${entry.description}</p>` : ''}
    <div class="wc-links">
      ${entry['flows-url'] ? `<a class="wc-link wc-flows" href="${entry['flows-url']}">Flow Explorer →</a>` : '<span class="wc-link wc-link-disabled" aria-disabled="true">No Flow Explorer</span>'}
      ${entry['pr-url'] ? `<a class="wc-link" href="${entry['pr-url']}" target="_blank" rel="noopener">PR</a>` : ''}
    </div>
  `;
  return div;
}

function renderTimeline(entries) {
  const sorted = [...entries].sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));
  const byMonth = groupBy(sorted, (e) => {
    const d = parseDate(e.date);
    return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Undated';
  });

  const frag = document.createDocumentFragment();
  Object.entries(byMonth).forEach(([month, items]) => {
    const group = document.createElement('div');
    group.className = 'wc-group';
    const h = document.createElement('h2');
    h.className = 'wc-group-hd';
    h.textContent = month;
    group.append(h);
    const grid = document.createElement('div');
    grid.className = 'wc-grid';
    items.forEach((e) => grid.append(entryCard(e)));
    group.append(grid);
    frag.append(group);
  });
  return frag;
}

function renderByProject(entries) {
  const byProject = groupBy(entries, 'project');
  const sorted = Object.entries(byProject).sort(([a], [b]) => a.localeCompare(b));
  const frag = document.createDocumentFragment();
  sorted.forEach(([project, items]) => {
    const group = document.createElement('div');
    group.className = 'wc-group';
    const h = document.createElement('h2');
    h.className = 'wc-group-hd';
    h.textContent = project;
    group.append(h);
    const grid = document.createElement('div');
    grid.className = 'wc-grid';
    items.forEach((e) => grid.append(entryCard(e)));
    group.append(grid);
    frag.append(group);
  });
  return frag;
}

function renderByIssue(entries) {
  const sorted = [...entries].sort((a, b) => {
    const na = parseInt(a['issue-number'] || 0, 10);
    const nb = parseInt(b['issue-number'] || 0, 10);
    return nb - na;
  });
  const frag = document.createDocumentFragment();
  const grid = document.createElement('div');
  grid.className = 'wc-grid';
  sorted.forEach((e) => grid.append(entryCard(e)));
  frag.append(grid);
  return frag;
}

function render(container, entries, view) {
  container.innerHTML = '';
  if (!entries.length) {
    container.innerHTML = '<p class="wc-empty">No entries yet.</p>';
    return;
  }
  if (view === 'timeline') container.append(renderTimeline(entries));
  else if (view === 'project') container.append(renderByProject(entries));
  else container.append(renderByIssue(entries));
}

export default async function decorate(block) {
  let activeView = getHashView() || 'timeline';

  const toolbar = document.createElement('div');
  toolbar.className = 'wc-toolbar';

  const toggle = document.createElement('div');
  toggle.className = 'wc-toggle';
  toggle.setAttribute('role', 'tablist');
  toggle.setAttribute('aria-label', 'View mode');

  VIEWS.forEach((v) => {
    const btn = document.createElement('button');
    btn.className = 'wc-tab';
    btn.dataset.view = v;
    btn.textContent = v.charAt(0).toUpperCase() + v.slice(1);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', v === activeView ? 'true' : 'false');
    if (v === activeView) btn.classList.add('wc-tab-active');
    toggle.append(btn);
  });

  toolbar.append(toggle);
  block.append(toolbar);

  const content = document.createElement('div');
  content.className = 'wc-content';
  block.append(content);

  const loading = document.createElement('p');
  loading.className = 'wc-loading';
  loading.textContent = 'Loading…';
  content.append(loading);

  let entries = [];

  toggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.wc-tab');
    if (!btn) return;
    activeView = btn.dataset.view;
    toggle.querySelectorAll('.wc-tab').forEach((b) => {
      b.classList.toggle('wc-tab-active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    setHashView(activeView);
    render(content, entries, activeView);
  });

  // Sync if another part of the page changes the hash
  window.addEventListener('hashchange', () => {
    const v = getHashView();
    if (v && v !== activeView) {
      activeView = v;
      toggle.querySelectorAll('.wc-tab').forEach((b) => {
        const match = b.dataset.view === activeView;
        b.classList.toggle('wc-tab-active', match);
        b.setAttribute('aria-selected', match ? 'true' : 'false');
      });
      render(content, entries, activeView);
    }
  });

  try {
    const resp = await fetch(INDEX_URL);
    if (!resp.ok) throw new Error(resp.status);
    const json = await resp.json();
    entries = (json.data || []).filter((e) => e.path && e.path.startsWith(ISSUES_PREFIX));
  } catch (err) {
    content.innerHTML = `<p class="wc-empty">Could not load index. ${err.message}</p>`;
    return;
  }

  render(content, entries, activeView);
}
