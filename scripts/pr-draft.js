#!/usr/bin/env node
/**
 * pr-draft.js — Chronicle EDS PR Auto-Draft Generator
 *
 * Fetches a GitHub Pull Request (and optionally its linked issue) via the
 * GitHub REST API, then generates a ready-to-push DA content HTML file
 * matching the Chronicle issue-entry-page format.
 *
 * Usage:
 *   node scripts/pr-draft.js <pr-url> [--out <path>]
 *
 * Example:
 *   node scripts/pr-draft.js https://github.com/adobe/helix-tools-website/pull/369
 *   node scripts/pr-draft.js https://github.com/adobe/helix-tools-website/pull/369 --out content/issues/helix-tools-website-my-fix.html
 *
 * No external npm dependencies — uses only Node.js built-ins.
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── CLI argument parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Chronicle PR Auto-Draft Generator
──────────────────────────────────
Usage:
  node scripts/pr-draft.js <pr-url> [--out <path>]

Arguments:
  <pr-url>       Full GitHub PR URL, e.g.
                 https://github.com/adobe/helix-tools-website/pull/369
  --out <path>   Write HTML to this file path instead of stdout

Examples:
  node scripts/pr-draft.js https://github.com/adobe/helix-tools-website/pull/369
  node scripts/pr-draft.js https://github.com/somarc/chronicle/pull/12 --out out/draft.html
`);
  process.exit(0);
}

const prUrl = args[0];
let outPath = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--out' && args[i + 1]) {
    outPath = args[i + 1];
    i++;
  }
}

// ─── GitHub URL parsing ──────────────────────────────────────────────────────

/**
 * Parse a GitHub PR URL into { owner, repo, number }.
 * Accepts https://github.com/OWNER/REPO/pull/NUMBER
 */
function parsePrUrl(url) {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!m) {
    die(`Invalid PR URL: ${url}\nExpected format: https://github.com/OWNER/REPO/pull/NUMBER`);
  }
  return { owner: m[1], repo: m[2], number: parseInt(m[3], 10) };
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

/**
 * Perform a GET request to the GitHub REST API.
 * Returns parsed JSON or throws with a descriptive error.
 */
function githubGet(apiPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method: 'GET',
      headers: {
        'User-Agent': 'chronicle-pr-draft/1.0',
        'Accept': 'application/vnd.github.v3+json',
        // Honour GITHUB_TOKEN if set (useful for private repos / higher rate limits)
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 404) {
          reject(new Error(
            `404 Not Found: ${apiPath}\n` +
            `  • The PR URL may be wrong.\n` +
            `  • If this is a private repo, set GITHUB_TOKEN env var:\n` +
            `      export GITHUB_TOKEN=ghp_yourTokenHere\n` +
            `      node scripts/pr-draft.js <pr-url>`
          ));
          return;
        }
        if (res.statusCode === 403) {
          const rateLimitReset = res.headers['x-ratelimit-reset'];
          const resetTime = rateLimitReset
            ? new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString()
            : 'unknown';
          reject(new Error(
            `403 Forbidden: ${apiPath}\n` +
            `  • Rate limit hit or insufficient permissions.\n` +
            `  • Rate limit resets at: ${resetTime}\n` +
            `  • For private repos or higher limits, set GITHUB_TOKEN:\n` +
            `      export GITHUB_TOKEN=ghp_yourTokenHere`
          ));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API error ${res.statusCode} for ${apiPath}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse GitHub API response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Network error calling GitHub API: ${e.message}`));
    });

    req.end();
  });
}

// ─── PR body parsing ─────────────────────────────────────────────────────────

/**
 * Extract the first referenced issue number from a PR body.
 * Recognises common closing keyword patterns as well as bare #NNN references.
 *
 * Returns a number or null.
 */
function extractIssueNumber(body) {
  if (!body) return null;

  // Closing keywords (case-insensitive): Closes, Fixes, Resolves, etc.
  const closingMatch = body.match(
    /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d+)/i
  );
  if (closingMatch) return parseInt(closingMatch[1], 10);

  // Bare reference like "see #123" or "related to #123" but NOT inside code spans
  const bareMatch = body.replace(/`[^`]+`/g, '').match(/#(\d+)/);
  if (bareMatch) return parseInt(bareMatch[1], 10);

  return null;
}

/**
 * Extract a named ### Section from a Markdown PR body.
 * Returns the trimmed text content of that section, or null.
 */
function extractSection(body, sectionName) {
  if (!body) return null;
  // Match "### Section Name" (case-insensitive) up to the next heading or end
  const pattern = new RegExp(
    `###\\s+${escapeRegex(sectionName)}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`,
    'i'
  );
  const m = body.match(pattern);
  if (!m) return null;
  const text = m[1].trim();
  return text.length > 0 ? text : null;
}

/**
 * Return the first non-empty paragraph of a Markdown body,
 * stripping headings and HTML comment blocks.
 */
function firstParagraph(body) {
  if (!body) return null;
  const lines = body
    .replace(/<!--[\s\S]*?-->/g, '')   // strip HTML comments
    .split('\n');

  let paragraph = [];
  let inBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip headings, horizontal rules, blank lines between paragraphs
    if (trimmed.startsWith('#') || trimmed === '---' || trimmed === '***') {
      if (paragraph.length > 0) break; // we already collected something
      continue;
    }

    if (trimmed === '') {
      if (paragraph.length > 0) break; // end of first para
      continue;
    }

    paragraph.push(trimmed);
  }

  const text = paragraph.join(' ').trim();
  return text.length > 0 ? text : null;
}

/**
 * Naively strip Markdown syntax for inline use in HTML.
 * Removes bold/italic markers, inline code backticks, links.
 */
function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [text](url) → text
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')     // `code` → code
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')              // *italic* → italic
    .replace(/_{2}([^_]+)_{2}/g, '$1')          // __bold__ → bold
    .replace(/_([^_]+)_/g, '$1')                // _italic_ → italic
    .replace(/~~([^~]+)~~/g, '$1')              // ~~strike~~ → strike
    .trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape characters that are special in HTML.
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Slug generation ─────────────────────────────────────────────────────────

/**
 * Generate a Chronicle slug from project name and PR title.
 * Format: <project>-<brief-description>
 * e.g. "helix-tools-website" + "Fix cache TTL regression" → "helix-tools-website-fix-cache-ttl-regression"
 */
function generateSlug(project, title) {
  const titlePart = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')     // remove non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')             // spaces → hyphens
    .replace(/-+/g, '-')              // collapse multiple hyphens
    .replace(/^-|-$/g, '')            // trim leading/trailing hyphens
    .split('-')
    .slice(0, 8)                      // cap at ~8 words for brevity
    .join('-');

  const projectSlug = project
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${projectSlug}-${titlePart}`;
}

// ─── HTML generation ─────────────────────────────────────────────────────────

const TODO = '<!-- TODO: fill in -->';

/**
 * Build the DA content HTML body for a Chronicle issue entry page.
 */
function buildHtml({
  project,
  prUrl,
  prNumber,
  issueUrl,
  issueNumber,
  date,
  title,
  summary,
  problem,
  rootCause,
  fix,
  testing,
  flowsUrl,
  flowDescription,
  metaDescription,
}) {
  const flowLink = flowsUrl || `/tools/${project}/flows.html`;

  // Helper: wrap a section paragraph — use TODO placeholder if missing
  const para = (text) => `<p>${escapeHtml(text) || TODO}</p>`;

  // Issue context rows
  const issueRow = issueNumber
    ? `<div><div><p><a href="${escapeHtml(issueUrl)}">${escapeHtml(String(issueNumber))}</a></p></div><div></div></div>`
    : `<div><div><p>${TODO}</p></div><div></div></div>`;

  const issueMeta = issueNumber
    ? `\n        <div><div><p>issue-number</p></div><div><p>${escapeHtml(String(issueNumber))}</p></div></div>
        <div><div><p>issue-url</p></div><div><p>${escapeHtml(issueUrl)}</p></div></div>`
    : `\n        <div><div><p>issue-number</p></div><div><p>${TODO}</p></div></div>
        <div><div><p>issue-url</p></div><div><p>${TODO}</p></div></div>`;

  return `<body>
  <header></header>
  <main>
    <div>
      <div class="issue-context">
        <div><div><p>${escapeHtml(project)}</p></div><div></div></div>
        ${issueRow}
        <div><div><p><a href="${escapeHtml(prUrl)}">PR #${prNumber}</a></p></div><div></div></div>
        <div><div><p><a href="${escapeHtml(flowLink)}">Flow Explorer</a></p></div><div></div></div>
        <div><div><p>${escapeHtml(date)}</p></div><div></div></div>
        <div><div><p>${escapeHtml(summary) || TODO}</p></div><div></div></div>
      </div>
    </div>
    <div>
      <h2>The Problem</h2>
      ${para(problem)}
      <h2>Root Cause</h2>
      ${para(rootCause)}
      <h2>The Fix</h2>
      ${para(fix)}
      <h2>Testing</h2>
      ${para(testing)}
      <h2>Explore the Flow</h2>
      ${para(flowDescription)}
      <p><a href="${escapeHtml(flowLink)}">Open Flow Explorer →</a></p>
    </div>
    <div>
      <div class="metadata">
        <div><div><p>Title</p></div><div><p>${escapeHtml(title)} — Chronicle</p></div></div>
        <div><div><p>Description</p></div><div><p>${escapeHtml(metaDescription) || TODO}</p></div></div>
        <div><div><p>project</p></div><div><p>${escapeHtml(project)}</p></div></div>${issueMeta}
        <div><div><p>pr-url</p></div><div><p>${escapeHtml(prUrl)}</p></div></div>
        <div><div><p>flows-url</p></div><div><p>${escapeHtml(flowLink)}</p></div></div>
        <div><div><p>date</p></div><div><p>${escapeHtml(date)}</p></div></div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>`;
}

// ─── Content extraction ───────────────────────────────────────────────────────

/**
 * Given PR data (and optional issue data), produce all the named fields
 * for the HTML template.  Returns an object plus a `review` array of
 * human-readable notes about what was inferred vs. what needs manual review.
 */
function extractContent(pr, issue) {
  const review = [];

  const project   = pr.base.repo.name;
  const prNumber  = pr.number;
  const prUrl     = pr.html_url;
  const body      = pr.body || '';

  // ── Date ───────────────────────────────────────────────────────────────────
  const rawDate   = pr.merged_at || pr.created_at || new Date().toISOString();
  const date      = rawDate.slice(0, 10); // YYYY-MM-DD
  if (!pr.merged_at) {
    review.push('⚠ PR is not merged yet — using created_at for date. Update date when merged.');
  }

  // ── Issue link ─────────────────────────────────────────────────────────────
  const issueNumber = extractIssueNumber(body);
  const issueUrl = issueNumber
    ? `https://github.com/${pr.base.repo.owner.login}/${project}/issues/${issueNumber}`
    : null;

  if (!issueNumber) {
    review.push('⚠ No linked issue found in PR body. Fill in issue-number and issue-url manually if applicable.');
  } else {
    review.push(`✓ Linked issue: #${issueNumber} → ${issueUrl}`);
  }

  // ── Summary (1-2 sentences) ────────────────────────────────────────────────
  // Prefer explicit "Summary" section, fall back to title + first paragraph
  let summary = extractSection(body, 'Summary')
    || extractSection(body, 'Overview')
    || extractSection(body, 'Description');

  if (summary) {
    summary = stripMarkdown(summary).replace(/\n+/g, ' ').split(/[.!?]\s+/).slice(0, 2).join('. ');
    if (!summary.endsWith('.')) summary += '.';
    review.push('✓ Summary extracted from PR body section.');
  } else {
    // Compose from title + first para
    const fp = firstParagraph(body);
    if (fp) {
      const titleClean = stripMarkdown(pr.title);
      const fpClean = stripMarkdown(fp);
      // Avoid duplicating content if first para essentially restates the title
      if (fpClean.toLowerCase().includes(titleClean.toLowerCase().slice(0, 20))) {
        summary = fpClean.split(/[.!?]\s+/).slice(0, 2).join('. ');
      } else {
        summary = `${titleClean}. ${fpClean.split(/[.!?]\s+/)[0]}.`;
      }
    } else {
      summary = stripMarkdown(pr.title);
    }
    review.push('⚠ Summary inferred from title/body — review and refine.');
  }

  // ── The Problem ────────────────────────────────────────────────────────────
  let problem = null;
  const issueBody = issue ? issue.body || '' : '';

  // 1. Explicit section in PR body
  problem = extractSection(body, 'Problem')
    || extractSection(body, 'Motivation')
    || extractSection(body, 'Context')
    || extractSection(body, 'Background');

  // 2. Fall back to issue body first paragraph
  if (!problem && issueBody) {
    problem = firstParagraph(issueBody);
    if (problem) review.push(`✓ "The Problem" sourced from linked issue #${issueNumber} body.`);
  }

  if (problem) {
    problem = stripMarkdown(problem).replace(/\n+/g, ' ');
    if (!problem.includes('<!-- TODO')) review.push('✓ Problem paragraph extracted.');
  } else {
    review.push('⚠ Could not extract "The Problem" — placeholder left. Please fill in.');
  }

  // ── Root Cause ─────────────────────────────────────────────────────────────
  let rootCause = extractSection(body, 'Root Cause')
    || extractSection(body, 'Root cause')
    || extractSection(body, 'Cause');

  if (rootCause) {
    rootCause = stripMarkdown(rootCause).replace(/\n+/g, ' ');
    review.push('✓ Root Cause extracted from PR body section.');
  } else {
    review.push('⚠ No "Root Cause" section found — placeholder left. Please fill in.');
  }

  // ── The Fix ────────────────────────────────────────────────────────────────
  let fix = extractSection(body, 'Fix')
    || extractSection(body, 'Solution')
    || extractSection(body, 'Changes')
    || extractSection(body, 'What changed')
    || extractSection(body, 'Implementation');

  if (fix) {
    fix = stripMarkdown(fix).replace(/\n+/g, ' ');
    review.push('✓ Fix description extracted from PR body section.');
  } else {
    // Try: last substantial paragraph of body as a weak signal
    const lastPara = body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40 && !p.startsWith('#') && !p.startsWith('<!--'))
      .pop();
    if (lastPara) {
      fix = stripMarkdown(lastPara).replace(/\n+/g, ' ');
      review.push('⚠ Fix inferred from PR body — review and refine.');
    } else {
      review.push('⚠ Could not extract "The Fix" — placeholder left. Please fill in.');
    }
  }

  // ── Testing ────────────────────────────────────────────────────────────────
  let testing = extractSection(body, 'Testing')
    || extractSection(body, 'Test')
    || extractSection(body, 'How to test')
    || extractSection(body, 'Verification');

  if (testing) {
    testing = stripMarkdown(testing).replace(/\n+/g, ' ');
    review.push('✓ Testing notes extracted from PR body section.');
  } else {
    review.push('⚠ No "Testing" section found — placeholder left. Please fill in.');
  }

  // ── Flow Explorer ──────────────────────────────────────────────────────────
  // Always a placeholder — author confirms the actual flows URL
  const flowsUrl = `/tools/${project}/flows.html`;
  const flowDescription =
    `Use the Flow Explorer to trace the request path affected by this change ` +
    `and verify the fix in context.`;
  review.push(`ℹ flows-url set to ${flowsUrl} — confirm or update this placeholder.`);

  // ── Title & meta description ───────────────────────────────────────────────
  const title = stripMarkdown(pr.title);
  const metaDescription = summary
    ? summary.slice(0, 160)
    : null;

  return {
    fields: {
      project,
      prUrl,
      prNumber,
      issueUrl,
      issueNumber,
      date,
      title,
      summary,
      problem,
      rootCause,
      fix,
      testing,
      flowsUrl,
      flowDescription,
      metaDescription,
    },
    review,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function die(msg) {
  console.error(`\nError: ${msg}\n`);
  process.exit(1);
}

function printDivider() {
  console.error('─'.repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Parse the PR URL
  const { owner, repo, number } = parsePrUrl(prUrl);

  console.error(`\nChronicle PR Auto-Draft`);
  printDivider();
  console.error(`Fetching PR #${number} from ${owner}/${repo}…`);

  // 2. Fetch PR data
  let pr;
  try {
    pr = await githubGet(`/repos/${owner}/${repo}/pulls/${number}`);
  } catch (err) {
    die(err.message);
  }

  console.error(`✓ PR "${pr.title}"`);

  // 3. Detect linked issue and fetch if present
  const issueNum = extractIssueNumber(pr.body || '');
  let issue = null;

  if (issueNum) {
    console.error(`  Detected linked issue #${issueNum} — fetching…`);
    try {
      issue = await githubGet(`/repos/${owner}/${repo}/issues/${issueNum}`);
      console.error(`  ✓ Issue "${issue.title}"`);
    } catch (err) {
      // Non-fatal: we'll carry on without the issue body
      console.error(`  ⚠ Could not fetch issue #${issueNum}: ${err.message}`);
      console.error(`    (Continuing without issue body)`);
    }
  }

  // 4. Extract content
  const { fields, review } = extractContent(pr, issue);

  // 5. Generate slug
  const slug = generateSlug(fields.project, pr.title);
  const suggestedPath = `content/issues/${slug}.html`;

  // 6. Build HTML
  const html = buildHtml(fields);

  // 7. Output
  printDivider();
  console.error(`Slug:           ${slug}`);
  console.error(`Suggested path: ${suggestedPath}`);

  if (outPath) {
    const dir = path.dirname(outPath);
    if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    console.error(`Output written: ${outPath}`);
  } else {
    console.error(`(No --out specified — writing HTML to stdout)\n`);
    process.stdout.write(html + '\n');
  }

  // 8. Print review summary
  printDivider();
  console.error('Extraction summary:');
  for (const note of review) {
    console.error(`  ${note}`);
  }

  const todos = (html.match(/<!-- TODO: fill in -->/g) || []).length;
  if (todos > 0) {
    console.error(`\n⚠ ${todos} section(s) need manual review (<!-- TODO: fill in --> placeholders).`);
  } else {
    console.error(`\n✓ All sections populated — review content before publishing.`);
  }

  printDivider();
  console.error('');
}

main().catch((err) => {
  console.error(`\nUnexpected error: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
