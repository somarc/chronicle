const INDEX_URL = '/query-index.json';
const ISSUES_PREFIX = '/issues/';

const CSS = `
.cn-wrap {
  height: 44px; min-height: 44px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex; align-items: center;
  padding: 0 20px; gap: 0; flex-shrink: 0; z-index: 100;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}
.cn-brand {
  font-size: 13px; font-weight: 700; color: #e6edf3;
  text-decoration: none; letter-spacing: 0.02em;
  display: flex; align-items: center; gap: 6px;
  padding: 4px 8px; border-radius: 5px;
  transition: background .15s;
}
.cn-brand:hover { background: #21262d; }
.cn-brand svg { flex-shrink: 0; }
.cn-sep { width: 1px; height: 16px; background: #30363d; margin: 0 10px; flex-shrink: 0; }
.cn-nav-link {
  font-size: 13px; font-weight: 500; color: #8b949e;
  text-decoration: none; display: flex; align-items: center;
  padding: 4px 8px; border-radius: 5px;
  transition: color .15s, background .15s;
}
.cn-nav-link:hover { color: #e6edf3; background: #21262d; text-decoration: none; }
.cn-slots { display: flex; align-items: center; gap: 0; flex: 1; min-width: 0; }
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
export function buildNav(target, slots = []) {
  injectStyles();

  const wrap = document.createElement('div');
  wrap.className = 'cn-wrap';

  const brand = document.createElement('a');
  brand.className = 'cn-brand';
  brand.href = '/';
  brand.innerHTML = `
    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
    chronicle`;
  wrap.append(brand);

  const toolsSep = document.createElement('div');
  toolsSep.className = 'cn-sep';
  const toolsLink = document.createElement('a');
  toolsLink.className = 'cn-nav-link';
  toolsLink.href = '/tools/';
  toolsLink.textContent = 'Explorers';
  wrap.append(toolsSep, toolsLink);

  if (slots.length) {
    slots.forEach((slot) => {
      const sep = document.createElement('div');
      sep.className = 'cn-sep';
      wrap.append(sep, slot);
    });
  }

  const slotsWrap = document.createElement('div');
  slotsWrap.className = 'cn-slots';
  wrap.append(slotsWrap);

  target.innerHTML = '';
  target.append(wrap);
  decorateBrowse(wrap);
}
