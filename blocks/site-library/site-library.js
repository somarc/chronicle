function textFrom(cell) {
  return cell?.textContent?.trim() || '';
}

function cleanDate(value) {
  return value.replace(/^Last published:\s*/i, '').trim();
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace('.aem.live', '');
  } catch {
    return url;
  }
}

function makeCard(row, index) {
  const cells = [...row.children];
  const [titleCell, urlCell, descCell, dateCell] = cells;
  const title = textFrom(titleCell) || 'Untitled site';
  const url = textFrom(urlCell);
  const description = textFrom(descCell);
  const date = cleanDate(textFrom(dateCell));

  const article = document.createElement('article');
  article.className = 'sl-card';
  article.style.setProperty('--sl-index', `${index + 1}`.padStart(2, '0'));

  const eyebrow = document.createElement('div');
  eyebrow.className = 'sl-card-eyebrow';
  eyebrow.innerHTML = `<span>${`${index + 1}`.padStart(2, '0')}</span><span>${hostLabel(url)}</span>`;

  const heading = document.createElement('h3');
  heading.className = 'sl-card-title';
  heading.textContent = title;

  const desc = document.createElement('p');
  desc.className = 'sl-card-desc';
  desc.textContent = description;

  const meta = document.createElement('div');
  meta.className = 'sl-card-meta';
  meta.innerHTML = `
    <span class="sl-meta-label">Last published</span>
    <span>${date || 'Not available'}</span>
  `;

  const actions = document.createElement('div');
  actions.className = 'sl-card-actions';
  if (url) {
    const visit = document.createElement('a');
    visit.className = 'sl-visit';
    visit.href = url;
    visit.target = '_blank';
    visit.rel = 'noopener';
    visit.textContent = 'Open site';

    const raw = document.createElement('code');
    raw.className = 'sl-url';
    raw.textContent = url;
    actions.append(visit, raw);
  }

  article.append(eyebrow, heading, desc, meta, actions);
  return article;
}

export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.children.length);
  const cards = rows.map(makeCard);

  const summary = document.createElement('div');
  summary.className = 'sl-summary';
  summary.innerHTML = `
    <span>${cards.length} sites</span>
    <span>Somarc Edge Delivery catalogue</span>
  `;

  const grid = document.createElement('div');
  grid.className = 'sl-grid';
  cards.forEach((card) => grid.append(card));

  block.replaceChildren(summary, grid);
}
