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

function linkOrTextFrom(cell) {
  const link = cell?.querySelector?.('a[href]');
  return link?.href || textFrom(cell);
}

function ensureVideoPreviewStyles() {
  if (document.getElementById('site-library-video-preview-styles')) return;
  const style = document.createElement('style');
  style.id = 'site-library-video-preview-styles';
  style.textContent = `
    .site-library .sl-card-has-media.sl-card-active .sl-card-media,
    .site-library .sl-card-has-media:hover .sl-card-media,
    .site-library .sl-card-has-media:focus-within .sl-card-media { opacity: 1; }
    .site-library .sl-card-media::after {
      background:
        linear-gradient(90deg, rgb(13 17 23 / 58%) 0%, rgb(13 17 23 / 28%) 48%, rgb(13 17 23 / 42%) 100%),
        linear-gradient(180deg, rgb(13 17 23 / 16%) 0%, rgb(13 17 23 / 64%) 100%);
    }
  `;
  document.head.append(style);
}

function wireVideoPreview(card, video) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const play = () => {
    if (reduceMotion.matches) return;
    card.classList.add('sl-card-active');
    video.play().catch(() => {});
  };

  const stop = () => {
    card.classList.remove('sl-card-active');
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // Some browsers reject seeking before video metadata is available.
    }
  };

  card.addEventListener('pointerenter', play);
  card.addEventListener('pointerleave', stop);
  card.addEventListener('focusin', play);
  card.addEventListener('focusout', (event) => {
    if (!card.contains(event.relatedTarget)) stop();
  });
}

function makeCard(row, index) {
  const cells = [...row.children];
  const [titleCell, urlCell, descCell, dateCell, mediaCell] = cells;
  const title = textFrom(titleCell) || 'Untitled site';
  const url = linkOrTextFrom(urlCell);
  const description = textFrom(descCell);
  const date = cleanDate(textFrom(dateCell));
  const mediaUrl = linkOrTextFrom(mediaCell);

  const article = document.createElement('article');
  article.className = 'sl-card';
  article.style.setProperty('--sl-index', `${index + 1}`.padStart(2, '0'));

  if (mediaUrl) {
    article.classList.add('sl-card-has-media');
    const media = document.createElement('div');
    media.className = 'sl-card-media';
    const video = document.createElement('video');
    video.src = mediaUrl;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    media.append(video);
    article.append(media);
    wireVideoPreview(article, video);
  }

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

function groupLabel(block) {
  let sibling = (block.closest('.site-library-wrapper') || block).previousElementSibling;
  while (sibling) {
    if (/^H[2-4]$/i.test(sibling.tagName)) {
      return sibling.textContent.trim();
    }
    const headings = sibling.querySelectorAll?.('h2, h3, h4');
    if (headings?.length) {
      return headings[headings.length - 1].textContent.trim();
    }
    sibling = sibling.previousElementSibling;
  }
  return 'Somarc Edge Delivery catalogue';
}

export default function decorate(block) {
  ensureVideoPreviewStyles();

  const rows = [...block.children].filter((row) => row.children.length);
  const cards = rows.map(makeCard);

  const summary = document.createElement('div');
  summary.className = 'sl-summary';
  summary.innerHTML = `
    <span>${cards.length} sites</span>
    <span>${groupLabel(block)}</span>
  `;

  const grid = document.createElement('div');
  grid.className = cards.length > 3 ? 'sl-grid sl-grid-many' : 'sl-grid';
  cards.forEach((card) => grid.append(card));

  block.replaceChildren(summary, grid);
}
