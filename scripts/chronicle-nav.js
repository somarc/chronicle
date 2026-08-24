const INDEX_URL = '/query-index.json';
const ISSUES_PREFIX = '/issues/';

function injectStyles() {
  if (document.getElementById('cn-styles')) return;
  const link = document.createElement('link');
  link.id = 'cn-styles';
  link.rel = 'stylesheet';
  link.href = '/styles/chronicle-nav.css';
  document.head.append(link);
}

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildEntryEl(entry) {
  const a = document.createElement('a');
  a.className = 'cn-entry';
  a.href = entry.path;
  a.setAttribute('role', 'option');
  a.innerHTML = `
    <span class="cn-entry-title">${entry.title || entry.path}</span>
    <span class="cn-entry-meta">
      ${entry.project ? `<span class="cn-entry-project">${entry.project}</span>` : ''}
      ${entry['issue-number'] ? `<span class="cn-entry-issue">#${entry['issue-number']}</span>` : ''}
      ${entry.date ? `<span class="cn-entry-date">${fmtDate(entry.date)}</span>` : ''}
    </span>
  `;
  return a;
}

function renderList(list, entries, query) {
  const q = query.toLowerCase();
  const filtered = q
    ? entries.filter((e) => `${e.title} ${e.project} ${e['issue-number']}`.toLowerCase().includes(q))
    : entries;

  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = `<li class="cn-empty">${q ? 'No matches.' : 'No entries yet.'}</li>`;
    return;
  }
  filtered.forEach((e) => {
    const li = document.createElement('li');
    li.append(buildEntryEl(e));
    list.append(li);
  });
}

/**
 * Appends a browse button + popover to the given nav element.
 * Call once per page. Fetches query-index lazily on first open.
 * @param {HTMLElement} navEl - container for the browse button
 */
export function decorateBrowse(navEl) {
  injectStyles();

  const wrap = document.createElement('div');
  wrap.className = 'cn-browse-wrap';

  const btn = document.createElement('button');
  btn.className = 'cn-browse';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.innerHTML = `<span class="cn-browse-label">Browse</span>
    <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6"/>
    </svg>`;

  const popover = document.createElement('div');
  popover.className = 'cn-popover';
  popover.setAttribute('hidden', '');
  popover.innerHTML = `
    <div class="cn-search-wrap">
      <input type="search" class="cn-search" placeholder="Search entries…" aria-label="Search entries">
    </div>
    <ul class="cn-list" role="listbox" aria-label="Entries"></ul>
  `;

  wrap.append(btn, popover);
  navEl.append(wrap);

  const searchInput = popover.querySelector('.cn-search');
  const list = popover.querySelector('.cn-list');
  let entries = [];
  let loaded = false;

  async function load() {
    if (loaded) return;
    loaded = true;
    list.innerHTML = '<li class="cn-empty">Loading…</li>';
    try {
      const resp = await fetch(INDEX_URL);
      if (!resp.ok) throw new Error(resp.status);
      const json = await resp.json();
      entries = (json.data || []).filter((e) => e.path?.startsWith(ISSUES_PREFIX));
    } catch {
      entries = [];
    }
    renderList(list, entries, searchInput.value);
  }

  function open() {
    popover.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    load().then(() => searchInput.focus());
  }

  function close() {
    popover.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }

  btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-expanded') === 'true') close();
    else open();
  });

  searchInput.addEventListener('input', () => {
    renderList(list, entries, searchInput.value);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') close();
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target) && btn.getAttribute('aria-expanded') === 'true') close();
  });
}

/**
 * Build a full chronicle nav bar and inject it into target.
 * Use this on EDS pages via the chronicle-header block.
 * @param {HTMLElement} target - element to render into
 * @param {HTMLElement[]} [slots] - optional extra nav items (e.g. breadcrumbs for tool pages)
 */
// Inline SVG mark and nav slot icons — eslint-disable needed for HTML attribute double quotes
/* eslint-disable quotes */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><defs><marker id="cn-ah" orient="auto" markerUnits="userSpaceOnUse" markerWidth="3.5" markerHeight="3" refX="3.5" refY="1.5"><path d="M0,0 L3.5,1.5 L0,3 Z" fill="#58a6ff"/></marker></defs><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="#58a6ff" stroke-width="0.8"/><polyline points="7,4.25 18,4.25 2,15.75 13,15.75" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#cn-ah)"/><rect x="13" y="13" width="5.5" height="5.5" rx="1.2" fill="#58a6ff" fill-opacity="0.15" stroke="#58a6ff" stroke-width="0.8"/></svg>`;

const NAV_ICONS = {
  issue: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  branch: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 3v12M18 9l-6-6-6 6M18 21V9"/></svg>`,
  pr: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7M6 9v12"/></svg>`,
  page: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  log: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  explore: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>`,
};
/* eslint-enable quotes */

/**
 * Build a nav slot element from a descriptor object or pass through a raw element.
 * Descriptor shape: { label, href?, icon?, current?, subtitle?, target? }
 *   - current: renders as bold white terminus (no hover, not a link)
 *   - icon: key from NAV_ICONS or raw SVG string
 *   - subtitle: grey badge text appended after the label
 */
function buildSlot(slot) {
  if (slot instanceof Element) return slot;

  const {
    label, href, icon, current, subtitle, target: tgt,
  } = slot;

  const iconHtml = icon ? (NAV_ICONS[icon] || icon) : '';

  if (current) {
    const el = document.createElement('span');
    el.className = 'cn-nav-current';
    el.innerHTML = `${iconHtml}${label}`;
    if (subtitle) {
      const badge = document.createElement('span');
      badge.className = 'cn-nav-badge';
      badge.textContent = subtitle;
      el.append(badge);
    }
    return el;
  }

  const el = document.createElement('a');
  el.className = 'cn-nav-link';
  el.href = href || '#';
  if (tgt) { el.target = tgt; el.rel = 'noopener'; }
  el.innerHTML = `${iconHtml}${label}`;
  return el;
}

export function buildNav(target, slots = []) {
  injectStyles();

  const wrap = document.createElement('div');
  wrap.className = 'cn-wrap';

  const brand = document.createElement('a');
  brand.className = 'cn-brand';
  brand.href = '/';
  brand.innerHTML = `${LOGO_SVG}<span class="cn-brand-label">chronicle</span>`;
  wrap.append(brand);

  const path = window.location.pathname;
  [
    {
      text: 'Sites',
      href: '/sites',
      icon: NAV_ICONS.page,
      match: '/sites',
    },
    {
      text: 'Explorers',
      href: '/tools/index.html',
      icon: NAV_ICONS.explore,
      match: '/tools/',
      exclude: '/tools/log',
    },
    {
      text: 'Log',
      href: '/tools/log/index.html',
      icon: NAV_ICONS.log,
      match: '/tools/log',
    },
    {
      text: 'About',
      href: '/readme',
      icon: NAV_ICONS.page,
      match: '/readme',
    },
  ].forEach(({
    text, href, icon, match, exclude,
  }) => {
    const sep = document.createElement('div');
    sep.className = 'cn-sep';
    const isActive = path.startsWith(match) && !(exclude && path.startsWith(exclude));
    const link = document.createElement('a');
    link.className = isActive ? 'cn-nav-link cn-nav-active' : 'cn-nav-link';
    link.href = href;
    link.innerHTML = `${icon || ''}<span class="cn-link-label">${text}</span>`;
    wrap.append(sep, link);
  });

  slots.forEach((slot) => {
    const sep = document.createElement('div');
    sep.className = 'cn-sep';
    wrap.append(sep, buildSlot(slot));
  });

  target.innerHTML = '';
  target.append(wrap);
  decorateBrowse(wrap);
}
