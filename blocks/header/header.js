import { buildNav } from '../../scripts/chronicle-nav.js';

function getMeta(name) {
  return document.head.querySelector(`meta[name="${name}"]`)?.content?.trim() ?? '';
}

function buildBreadcrumbSlots() {
  const project = getMeta('project');
  if (!project) return [];

  const slots = [];

  // Project — links to homepage filtered to that project
  slots.push({ label: project, href: '/#view=project' });

  // Issue number — links to GitHub issue, renders as current terminus
  const issueNumber = getMeta('issue-number');
  if (issueNumber) {
    const issueUrl = getMeta('issue-url');
    slots.push({
      label: `#${issueNumber}`,
      href: issueUrl || null,
      icon: 'issue',
      target: '_blank',
      current: !issueUrl ? false : true,
    });
  } else {
    // No issue number — the page title is the terminus
    const title = getMeta('og:title') || document.title || '';
    const cleanTitle = title.replace(/\s*—\s*Chronicle\s*$/, '');
    if (cleanTitle) slots.push({ label: cleanTitle, icon: 'page', current: true });
  }

  return slots;
}

export default function decorate(block) {
  const header = block.closest('header');
  if (header) header.style.cssText = 'position:sticky;top:0;z-index:100;';

  const isIssuePage = window.location.pathname.startsWith('/issues/');
  const slots = isIssuePage ? buildBreadcrumbSlots() : [];
  buildNav(block, slots);
}
