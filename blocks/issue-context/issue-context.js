function row(block, idx) {
  return block.children[idx]?.children[0]?.textContent?.trim() || '';
}

function lnk(block, idx) {
  const a = block.children[idx]?.children[0]?.querySelector('a');
  return a ? { href: a.href, text: a.textContent.trim() } : null;
}

function render(block, data) {
  const {
    project, issueNum, issueHref, prHref, prText, flowsHref, dateStr, summary,
  } = data;

  const [dy, dm, dd] = (dateStr || '').split('-').map(Number);
  const fmtDate = (dy && dm && dd)
    ? new Date(dy, dm - 1, dd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  block.innerHTML = `
    <div class="ic-header">
      <div class="ic-meta">
        ${project ? `<span class="ic-project">${project}</span>` : ''}
        ${issueNum ? `<a class="ic-issue-badge" href="${issueHref || '#'}" target="_blank" rel="noopener">#${issueNum}</a>` : ''}
        ${fmtDate ? `<span class="ic-date">${fmtDate}</span>` : ''}
      </div>
      ${summary ? `<p class="ic-summary">${summary}</p>` : ''}
      <div class="ic-actions">
        ${flowsHref ? `<a class="ic-btn ic-btn-primary" href="${flowsHref}">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Flow Explorer
        </a>` : ''}
        ${prHref ? `<a class="ic-btn" href="${prHref}" target="_blank" rel="noopener">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7M6 9v12"/></svg>
          ${prText || 'Pull Request'}
        </a>` : ''}
      </div>
    </div>
  `;
}

async function fromIndex(path) {
  try {
    const resp = await fetch('/query-index.json');
    if (!resp.ok) return null;
    const json = await resp.json();
    return (json.data || []).find((e) => e.path === path) || null;
  } catch {
    return null;
  }
}

export default async function decorate(block) {
  // Read from block rows (populated by EDS from DA source)
  const project = row(block, 0);
  const issueNum = row(block, 1);
  const issueLink = lnk(block, 1) || (issueNum ? { href: '#', text: issueNum } : null);
  const prLink = lnk(block, 2);
  const flowsLink = lnk(block, 3);
  const dateStr = row(block, 4);
  const summary = row(block, 5);

  // If block rows are populated, render immediately
  if (project || issueNum || dateStr) {
    render(block, {
      project,
      issueNum,
      issueHref: issueLink?.href,
      prHref: prLink?.href,
      prText: prLink?.text,
      flowsHref: flowsLink?.href,
      dateStr,
      summary,
    });
    return;
  }

  // Fallback: fetch from query-index using the current page path
  const entry = await fromIndex(window.location.pathname.replace(/\/$/, ''));
  if (!entry) {
    block.innerHTML = '';
    return;
  }

  render(block, {
    project: entry.project,
    issueNum: entry['issue-number'],
    issueHref: entry['issue-url'],
    prHref: entry['pr-url'],
    prText: entry['pr-url'] ? 'Pull Request' : '',
    flowsHref: entry['flows-url'],
    dateStr: entry.date,
    summary: entry.description,
  });
}
