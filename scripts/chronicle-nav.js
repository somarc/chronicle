const INDEX_URL = '/query-index.json';
const ISSUES_PREFIX = '/issues/';

const CSS = `
.cn-wrap {
  width: 100%; box-sizing: border-box;
  height: 44px; min-height: 44px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex; align-items: center;
  padding: 0 20px; gap: 0; flex-shrink: 0; z-index: 100;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}
.cn-brand {
  font-size: 13px; font-weight: 700; color: #e6edf3 !important;
  text-decoration: none !important; letter-spacing: 0.02em;
  display: flex; align-items: center; gap: 6px;
  padding: 4px 8px; border-radius: 5px;
  transition: background .15s;
}
.cn-brand:hover { background: #21262d; }
.cn-brand img { flex-shrink: 0; width: 20px; height: 20px; object-fit: cover; border-radius: 3px; }
.cn-sep { width: 1px; height: 16px; background: #30363d; margin: 0 10px; flex-shrink: 0; }
.cn-nav-link {
  font-size: 12px; font-weight: 500; color: #8b949e !important;
  text-decoration: none !important; display: flex; align-items: center; gap: 5px;
  padding: 4px 8px; border-radius: 5px;
  transition: color .15s, background .15s;
}
.cn-nav-link:hover { color: #e6edf3 !important; background: #21262d; text-decoration: none; }
.cn-nav-link--active { color: #e6edf3 !important; font-weight: 600; }
.cn-nav-link svg { flex-shrink: 0; opacity: 0.6; }
.cn-nav-current {
  font-size: 13px; font-weight: 600; color: #e6edf3;
  display: flex; align-items: center; gap: 6px;
  padding: 4px 8px;
}
.cn-nav-current svg { flex-shrink: 0; opacity: 0.5; }
.cn-nav-badge {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px;
  color: #484f58; padding: 0 4px;
}
.cn-browse-wrap { margin-left: auto; position: relative; flex-shrink: 0; }
.cn-browse {
  display: flex; align-items: center; gap: 5px;
  font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500;
  color: #8b949e; background: transparent; border: 1px solid #30363d;
  padding: 4px 10px; border-radius: 6px; cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
}
.cn-browse:hover, .cn-browse[aria-expanded="true"] {
  color: #e6edf3; border-color: #8b949e; background: #21262d;
}
.cn-browse svg { transition: transform .15s; }
.cn-browse[aria-expanded="true"] svg { transform: rotate(180deg); }
.cn-popover {
  position: absolute; right: 0; top: calc(100% + 8px);
  width: 360px; background: #161b22; border: 1px solid #30363d;
  border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.5);
  z-index: 200; display: flex; flex-direction: column; overflow: hidden;
}
.cn-popover[hidden] { display: none; }
.cn-search-wrap { padding: 10px; border-bottom: 1px solid #30363d; }
.cn-search {
  width: 100%; background: #0d1117; border: 1px solid #30363d;
  border-radius: 6px; padding: 6px 10px; color: #e6edf3;
  font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 12px;
  outline: none;
}
.cn-search:focus { border-color: #58a6ff; }
.cn-search::placeholder { color: #484f58; }
.cn-list { list-style: none; margin: 0; padding: 4px 0; max-height: 320px; overflow-y: auto; }
.cn-list::-webkit-scrollbar { width: 4px; }
.cn-list::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
.cn-entry {
  display: block; padding: 8px 14px; text-decoration: none;
  cursor: pointer; transition: background .1s;
}
.cn-entry:hover, .cn-entry:focus { background: #1c2128; outline: none; }
.cn-entry-title {
  font-size: 12px; font-weight: 500; color: #e6edf3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: block;
}
.cn-entry-meta {
  display: flex; align-items: center; gap: 6px; margin-top: 2px;
}
.cn-entry-project {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px;
  color: #34d399; background: rgba(52,211,153,.1);
  padding: 1px 5px; border-radius: 3px; flex-shrink: 0;
}
.cn-entry-issue {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px;
  color: #58a6ff;
}
.cn-entry-date { font-size: 10px; color: #484f58; margin-left: auto; }
.cn-empty { padding: 16px 14px; font-size: 12px; color: #484f58; text-align: center; }
`;

function injectStyles() {
  if (document.getElementById('cn-styles')) return;
  const s = document.createElement('style');
  s.id = 'cn-styles';
  s.textContent = CSS;
  document.head.append(s);
}

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  btn.innerHTML = `Browse
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
// SVG icons for nav slots — eslint-disable-next-line needed for HTML attribute double quotes
/* eslint-disable quotes */
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
  // eslint-disable-next-line quotes
  brand.innerHTML = `<img src="/logo.jpg" alt="Chronicle" width="20" height="20"/>chronicle`;
  wrap.append(brand);

  const path = window.location.pathname;
  [
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
      icon: null,
      match: '/readme',
    },
  ].forEach(({
    text, href, icon, match, exclude,
  }) => {
    const sep = document.createElement('div');
    sep.className = 'cn-sep';
    const isActive = path.startsWith(match) && !(exclude && path.startsWith(exclude));
    const link = document.createElement('a');
    link.className = isActive ? 'cn-nav-link cn-nav-link--active' : 'cn-nav-link';
    link.href = href;
    link.innerHTML = `${icon || ''}${text}`;
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
