/**
 * Related Entries block
 * Shows other entries from the same project at the bottom of issue detail pages.
 * Purely JS-driven from /query-index.json — no authored rows needed.
 */

const INDEX_URL = '/query-index.json';

/**
 * Format a date string (YYYY-MM-DD) as "Apr 30, 2026"
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Build a single related-entry card element.
 * @param {Object} entry
 * @returns {HTMLElement}
 */
function buildCard(entry) {
  const card = document.createElement('div');
  card.className = 're-card';

  // --- Meta row: project badge + date ---
  const meta = document.createElement('div');
  meta.className = 're-card-meta';

  const project = document.createElement('span');
  project.className = 're-project';
  project.textContent = entry.project || '';

  const date = document.createElement('span');
  date.className = 're-date';
  date.textContent = formatDate(entry.date);

  meta.appendChild(project);
  meta.appendChild(date);

  // --- Title (linked to the issue page) ---
  const titleEl = document.createElement('h3');
  titleEl.className = 're-title';

  const titleLink = document.createElement('a');
  titleLink.href = entry.path;
  // Strip the " — Chronicle" suffix if present for cleaner display
  titleLink.textContent = (entry.title || '').replace(/\s*—\s*Chronicle\s*$/, '');

  titleEl.appendChild(titleLink);

  // --- Description ---
  const desc = document.createElement('p');
  desc.className = 're-desc';
  desc.textContent = entry.description || '';

  // --- Links row ---
  const links = document.createElement('div');
  links.className = 're-links';

  if (entry['flows-url']) {
    const flowsBtn = document.createElement('a');
    flowsBtn.className = 're-link re-flows';
    flowsBtn.href = entry['flows-url'];
    flowsBtn.textContent = 'Flow Explorer →';
    links.appendChild(flowsBtn);
  }

  if (entry['pr-url']) {
    const prLink = document.createElement('a');
    prLink.className = 're-link';
    prLink.href = entry['pr-url'];
    prLink.target = '_blank';
    prLink.rel = 'noopener noreferrer';
    prLink.textContent = 'PR';
    links.appendChild(prLink);
  }

  card.appendChild(meta);
  card.appendChild(titleEl);
  card.appendChild(desc);
  if (links.children.length) card.appendChild(links);

  return card;
}

/**
 * Main decorate function — entry point for EDS.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  // Hide immediately so there's no flash of empty content
  block.style.display = 'none';

  let index;
  try {
    const resp = await fetch(INDEX_URL);
    if (!resp.ok) return;
    index = await resp.json();
  } catch {
    return;
  }

  const entries = index?.data;
  if (!Array.isArray(entries) || entries.length === 0) return;

  const currentPath = window.location.pathname;

  // Find the current page's entry
  const currentEntry = entries.find((e) => e.path === currentPath);
  if (!currentEntry || !currentEntry.project) return;

  const currentProject = currentEntry.project;

  // Filter related entries: same project, not the current page
  const related = entries.filter(
    (e) => e.project === currentProject && e.path !== currentPath,
  );

  if (related.length === 0) return;

  // --- Build the section ---
  const section = document.createElement('div');
  section.className = 're-section';

  const heading = document.createElement('p');
  heading.className = 're-heading';
  heading.textContent = `More from ${currentProject}`;

  const grid = document.createElement('div');
  grid.className = 're-grid';

  related.forEach((entry) => {
    grid.appendChild(buildCard(entry));
  });

  section.appendChild(heading);
  section.appendChild(grid);

  // Replace block contents and make visible
  block.textContent = '';
  block.appendChild(section);
  block.style.display = '';
}
