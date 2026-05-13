import { buildNav } from '../../scripts/chronicle-nav.js';

export default function decorate(block) {
  const header = block.closest('header');
  if (header) header.style.cssText = 'position:sticky;top:0;z-index:100;';
  buildNav(block);
}
