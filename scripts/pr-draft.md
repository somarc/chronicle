# pr-draft.js — Chronicle PR Auto-Draft Generator

A Node.js CLI tool that turns a GitHub Pull Request URL into a ready-to-push
**DA content HTML file** for a Chronicle issue entry page.

## Requirements

- Node.js 16+ (no external npm dependencies — uses `https`, `fs`, `path` only)
- Network access to `api.github.com`
- Optional: `GITHUB_TOKEN` env var for private repos or higher API rate limits

## Usage

```bash
# Print generated HTML to stdout (inspect before committing)
node scripts/pr-draft.js https://github.com/adobe/helix-tools-website/pull/369

# Write directly to a file
node scripts/pr-draft.js https://github.com/adobe/helix-tools-website/pull/369 \
  --out content/issues/helix-tools-website-my-fix.html

# Private repo or avoiding rate limits
GITHUB_TOKEN=ghp_yourTokenHere node scripts/pr-draft.js <pr-url> --out out.html
```

## What it does

1. **Parses** the GitHub PR URL to extract `owner/repo` and PR number.
2. **Fetches** the PR via the GitHub REST API (`GET /repos/{owner}/{repo}/pulls/{number}`).
3. **Detects** a linked issue by scanning the PR body for patterns like
   `Fixes #123`, `Closes #340`, `Resolves #7`, or bare `#NNN` references.
4. **Fetches the linked issue** (if found) to use its body as a source for
   "The Problem" section.
5. **Extracts content** from structured `### Section` headings in the PR body:
   - `### Summary` / `### Overview` / `### Description` → Summary
   - `### Problem` / `### Motivation` / `### Context` → The Problem
   - `### Root Cause` / `### Cause` → Root Cause
   - `### Fix` / `### Solution` / `### Changes` → The Fix
   - `### Testing` / `### How to Test` → Testing
   - Falls back to first paragraphs and intelligent inference when headings are absent.
6. **Generates** a Chronicle DA-content HTML file in the exact `<body>` format
   expected by the EDS issue entry page template.
7. **Reports** a per-section extraction summary so you know exactly what was
   confidently extracted vs. what was inferred or still needs manual review.

## Output format

The generated file is a raw `<body>` HTML fragment (no `<html>` or `<head>` tags)
with three EDS block sections:

| Section | Content |
|---|---|
| `issue-context` block | Project, issue link, PR link, Flow Explorer link, date, summary |
| Content area | The Problem, Root Cause, The Fix, Testing, Explore the Flow |
| `metadata` block | Title, Description, project, issue-number, issue-url, pr-url, flows-url, date |

Sections that could not be extracted are left with `<!-- TODO: fill in -->` so
they're easy to find and complete before publishing.

## Slug convention

`<project>-<brief-description>`

The project name is taken from the GitHub repo name of the PR's target repository.
The description is derived from the PR title (lowercased, alphanumeric + hyphens,
capped at 8 words).

**Examples:**
- Repo `helix-tools-website`, title "Fix cache TTL regression" → `helix-tools-website-fix-cache-ttl-regression`
- Repo `chronicle`, title "Add BYOM support to page status" → `chronicle-add-byom-support-to-page-status`

## flows-url

The `flows-url` metadata field is always generated as a placeholder:

```
/tools/{project}/flows.html
```

This is intentional — the author should confirm or update this path before
publishing.  The script prints a reminder in its extraction summary.

## Error handling

| Situation | Behaviour |
|---|---|
| Invalid PR URL | Prints usage hint and exits |
| 404 Not Found | Explains it may be a private repo, suggests `GITHUB_TOKEN` |
| 403 Forbidden | Shows rate-limit reset time, suggests `GITHUB_TOKEN` |
| Linked issue fetch fails | Warns but continues — issue body is optional |
| PR not yet merged | Uses `created_at` for date, warns to update after merge |
| Any section missing | Leaves `<!-- TODO: fill in -->` and counts them in summary |

## Example terminal output

```
Chronicle PR Auto-Draft
────────────────────────────────────────────────────────────
Fetching PR #369 from adobe/helix-tools-website…
✓ PR "Fix cache TTL to respect admin overrides"
  Detected linked issue #340 — fetching…
  ✓ Issue "Cache TTL ignores admin-set max-age"
────────────────────────────────────────────────────────────
Slug:           helix-tools-website-fix-cache-ttl-to-respect-admin-overrides
Suggested path: content/issues/helix-tools-website-fix-cache-ttl-to-respect-admin-overrides.html
Output written: content/issues/helix-tools-website-fix-cache-ttl-to-respect-admin-overrides.html
────────────────────────────────────────────────────────────
Extraction summary:
  ✓ Linked issue: #340 → https://github.com/adobe/helix-tools-website/issues/340
  ✓ Summary extracted from PR body section.
  ✓ "The Problem" sourced from linked issue #340 body.
  ✓ Root Cause extracted from PR body section.
  ✓ Fix description extracted from PR body section.
  ⚠ No "Testing" section found — placeholder left. Please fill in.
  ℹ flows-url set to /tools/helix-tools-website/flows.html — confirm or update this placeholder.

✓ All sections populated — review content before publishing.
────────────────────────────────────────────────────────────
```

## Tips

- **Structured PR bodies** (with `### Root Cause`, `### Fix`, etc.) produce the
  best results with minimal manual review.
- Run without `--out` first to inspect the HTML in your terminal before writing.
- Set `DEBUG=1` for a full stack trace on unexpected errors.
- The script writes all informational output to **stderr** and the HTML to
  **stdout**, so piping to a file works cleanly: `node scripts/pr-draft.js <url> > draft.html`
