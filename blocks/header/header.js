import { buildNav } from '../../scripts/chronicle-nav.js';

function getMeta(name) {
  return document.head.querySelector(`meta[name="${name}"]`)?.content?.trim() ?? '';
}

function buildBreadcrumbSlots() {
  const project = getMeta('project');
  if (!project) return [];

  const slots = [];

  const projectLink = document.createElement('a');
  projectLink.className = 'cn-nav-link';
  projectLink.href = '/#view=project';
  projectLink.textContent = project;
  slots.push(projectLink);

  const issueNumber = getMeta('issue-number');
  if (issueNumber) {
    const issueUrl = getMeta('issue-url');
    const issueEl = issueUrl
      ? Object.assign(document.createElement('a'), {
        className: 'cn-nav-link',
        href: issueUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        textContent: `#${issueNumber}`,
      })
      : Object.assign(document.createElement('span'), {
        className: 'cn-nav-link',
        textContent: `#${issueNumber}`,
      });
    slots.push(issueEl);
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
