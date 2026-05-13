function row(block, idx) {
  return block.children[idx]?.querySelector('td')?.textContent?.trim() || '';
}

function link(block, idx) {
  const a = block.children[idx]?.querySelector('td a');
  return a ? { href: a.href, text: a.textContent.trim() } : null;
}

export default function decorate(block) {
  const project = row(block, 0);
  const issueNum = row(block, 1);
  const issueLink = link(block, 1) || { href: '#', text: `#${issueNum}` };
  const prLink = link(block, 2);
  const flowsLink = link(block, 3);
  const dateStr = row(block, 4);
  const summary = row(block, 5);

  const fmtDate = dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  block.innerHTML = `
    <div class="ic-header">
      <div class="ic-meta">
        ${project ? `<span class="ic-project">${project}</span>` : ''}
        ${issueNum ? `<a class="ic-issue-badge" href="${issueLink.href}" target="_blank" rel="noopener">#${issueNum}</a>` : ''}
        ${fmtDate ? `<span class="ic-date">${fmtDate}</span>` : ''}
      </div>
      ${summary ? `<p class="ic-summary">${summary}</p>` : ''}
      <div class="ic-actions">
        ${flowsLink ? `<a class="ic-btn ic-btn-primary" href="${flowsLink.href}">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Flow Explorer
        </a>` : ''}
        ${prLink ? `<a class="ic-btn" href="${prLink.href}" target="_blank" rel="noopener">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7M6 9v12"/></svg>
          ${prLink.text || 'Pull Request'}
        </a>` : ''}
      </div>
    </div>
  `;
}
