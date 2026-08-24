/*
 * issue-context — entry metadata card.
 *
 * Canvas-safe by construction: decorate() only classifies the authored
 * rows, cells, and links. It never rebuilds, copies, moves, or removes
 * authored nodes, so every field stays editable in da-live Canvas.
 *
 * Authored contract (six rows, first cell used):
 *   1. project        plain text
 *   2. issue          link whose text is the issue number (optional)
 *   3. pull request   link (optional)
 *   4. flow explorer  link (optional)
 *   5. date           YYYY-MM-DD
 *   6. summary        plain text
 */

const ROW_NAMES = ['project', 'issue', 'pr', 'flows', 'date', 'summary'];

export default function decorate(block) {
  [...block.children].forEach((row, i) => {
    const name = ROW_NAMES[i];
    if (!name) return;
    row.classList.add('ic-row', `ic-${name}`);
    const cell = row.firstElementChild;
    if (!cell || !cell.textContent.trim()) {
      row.classList.add('ic-empty');
      return;
    }
    const link = cell.querySelector('a');
    if (link) {
      if (name === 'issue') link.classList.add('ic-issue-badge');
      else if (name === 'flows') link.classList.add('ic-btn', 'ic-btn-primary');
      else if (name === 'pr') link.classList.add('ic-btn');
    }
  });
}
