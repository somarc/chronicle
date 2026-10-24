/*
 * site-library — catalogue cards for the Somarc EDS library.
 *
 * Canvas-safe by construction: the authored rows become the cards and
 * authored cells are classified in place. The URL cell is moved intact
 * (never copied) into the actions wrapper; synthetic elements (eyebrow,
 * visit link, summary bar, video preview) are additions only.
 *
 * Authored contract (five cells per row):
 *   1. site name
 *   2. site url (plain text or link)
 *   3. description
 *   4. status (optional): live | preview | frozen | private | target —
 *      rendered as a chip; the authored cell is moved intact into the eyebrow
 *   5. media url (splash video, optional)
 */

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/\.aem\.(live|page)$/, '');
  } catch {
    return url;
  }
}

function cellUrl(cell) {
  const link = cell?.querySelector?.('a[href]');
  return link?.href || cell?.textContent?.trim() || '';
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
  const rows = [...block.children].filter((row) => row.children.length && row.textContent.trim());
  if (rows.length > 3) block.classList.add('sl-grid-many');

  rows.forEach((row, index) => {
    row.classList.add('sl-card');
    row.style.setProperty('--sl-index', `"${`${index + 1}`.padStart(2, '0')}"`);

    const [titleCell, urlCell, descCell, spareCell, mediaCell] = [...row.children];
    titleCell?.classList.add('sl-card-title');
    descCell?.classList.add('sl-card-desc');
    const status = spareCell?.textContent.trim().toLowerCase() || '';
    if (status) {
      spareCell.classList.add('sl-card-status');
      row.classList.add(`sl-status-${status.replace(/[^a-z0-9]+/g, '-')}`);
    } else {
      spareCell?.classList.add('sl-card-spare');
    }
    mediaCell?.classList.add('sl-card-config');

    const url = cellUrl(urlCell);

    // synthetic eyebrow: card number + delivery host
    const eyebrow = document.createElement('div');
    eyebrow.className = 'sl-card-eyebrow';
    const num = document.createElement('span');
    num.textContent = `${index + 1}`.padStart(2, '0');
    const host = document.createElement('span');
    host.textContent = hostLabel(url);
    eyebrow.append(num, host);
    if (status) eyebrow.append(spareCell);
    row.prepend(eyebrow);

    // actions: synthetic visit link + the authored URL cell, moved intact
    if (urlCell) {
      const actions = document.createElement('div');
      actions.className = 'sl-card-actions';
      if (url) {
        const visit = document.createElement('a');
        visit.className = 'sl-visit';
        visit.href = url;
        visit.target = '_blank';
        visit.rel = 'noopener';
        visit.textContent = 'Open site';
        actions.append(visit);
      }
      urlCell.classList.add('sl-url');
      actions.append(urlCell);
      row.append(actions);
    }

    const mediaUrl = cellUrl(mediaCell);
    if (mediaUrl) {
      row.classList.add('sl-card-has-media');
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
      row.prepend(media);
      wireVideoPreview(row, video);
    }
  });

  // synthetic summary chip bar
  const summary = document.createElement('div');
  summary.className = 'sl-summary';
  const count = document.createElement('span');
  count.textContent = `${rows.length} sites`;
  const label = document.createElement('span');
  label.textContent = groupLabel(block);
  summary.append(count, label);
  block.prepend(summary);
}
