# Chronicle

A working chronicle for Marc's Edge Delivery work — the decisions, fixes, publishing routes, and flow explorers that need to stay visible as the work accelerates.

- **Live:** https://main--chronicle--somarc.aem.live/
- **Preview:** https://main--chronicle--somarc.aem.page/

---

## What is this?

Chronicle is a personal engineering record for EDS and agent-assisted delivery work. It exists so Marc can keep track of what changed, why it changed, how it was shipped, and which route should be reused the next time similar work appears.

The site is intentionally practical. Entries can document shipped fixes, DA publishing runs, block patterns, content decisions, workflow experiments, and interactive Flow Explorers. The common thread is evidence: what broke or needed to move, what route handled it, what checks proved it, and what should not have to be rediscovered later.

This is not a marketing site and not a finished knowledge base. It is a live operating notebook for a fast-moving EDS practice.

---

## Why it exists

EDS work moves through several surfaces at once: DA documents, local source files, GitHub branches, preview and live URLs, browser sessions, MCP-backed research, and command-line tools. When the pace is high, the useful reasoning can disappear even when the code or content ships correctly.

Chronicle is the layer above the merge and the publish. It preserves the context around the work in a form that is readable later, linkable from a thread, and navigable by project, issue, or workflow. A good entry should make tomorrow's delivery pass faster because it explains what actually happened today.

## What gets tracked

- **Route decisions:** why a task used DA, code, browser automation, documentation, MCP, saved sessions, or local CLI tools.
- **Content movement:** which DA-authored pages changed and how the source maps to preview and live.
- **Verification evidence:** lint results, DA dry-run diffs, preview checks, live checks, screenshots, and expected phrases.
- **Flow Explorers:** interactive diagrams that turn code paths and delivery flows into something Marc can step through.
- **Reusable lessons:** commands, patterns, failed routes, and working assumptions worth carrying into the next run.

## Site structure

```
/                            ← Index page (work-catalogue block)
/issues/<slug>               ← Issue detail pages (DA-authored)
/sites                       ← EDS site catalogue (DA-authored)
/tools/<project>/flows.html  ← Flow Explorer apps (code repo)
/tools/index.html            ← Flow Explorer listing (code repo)
/query-index.json            ← Auto-built from helix-query.yaml
```

**Content** lives in DA at `content.da.live/somarc/chronicle/`  
**Code** (blocks, scripts, tools) lives here in this repo

---

## Prerequisites

### da-cli

This repo uses [`da-cli`](https://github.com/somarc/da-cli) — a bespoke CLI for Adobe Edge Delivery Services built on the DA Admin API. This is **not** Adobe's official tooling; it's a custom CLI maintained alongside this project.

```sh
npm install -g @somarc/da-cli
```

First-time setup:

```sh
da auth login       # authenticate against DA
da config init      # interactive setup — writes .da.json in the current directory
```

All `da` commands in this README assume a `.da.json` is present or that `--org somarc --repo chronicle` is passed explicitly.

---

## Adding a new entry

An entry should be specific enough to help later. Start with the outcome and the evidence you want preserved: the issue, the PR, the DA page, the command sequence, the route decision, or the browser-verified result.

### 1. Generate a draft from a PR URL

```sh
node scripts/pr-draft.js https://github.com/adobe/helix-tools-website/pull/369
node scripts/pr-draft.js <pr-url> --out /tmp/my-slug.html
```

The script fetches the PR and any linked issue, extracts Problem / Root Cause / Fix / Testing sections, and outputs a ready-to-review DA content HTML file. Review the `<!-- TODO -->` placeholders before publishing. If the work did not start from a PR, write the entry directly in the same structure: problem, context, route, fix, verification, and reusable lesson.

### 2. Push to DA

```sh
da --org somarc --repo chronicle content put /issues/<slug>.html /tmp/<slug>.html --commit
```

**Slug convention:** `<project>-<brief-description>` — e.g. `page-status-byom`, `helix-admin-cache-ttl`

---

## Adding a Sites entry

The Sites tab tracks EDS properties rather than individual engineering changes. Add a Sites entry when a site becomes part of the working catalogue, when its live URL changes, or when its purpose/status needs to be visible beside the Chronicle entries.

Sites entries live on the DA-authored `/sites.html` page in a `site-library` block. Each row is one site with three required cells, one reserved blank cell, and one optional hero-video cell:

| Cell | Content | Example |
|---|---|---|
| Title | Human-readable site name | `FluffyJaws Financial` |
| URL | Preview or live URL, preferably live when available | `https://main--fluffyjaws-financial--somarc.aem.live/` |
| Description | One concise sentence explaining what the site is for | `Financial-services EDS demo site for advisory and planning flows.` |
| Reserved | Keep blank. Do not hand-author publication dates; they go stale. | |
| Hero video | Optional media-bus `mp4` URL for hover/focus preview | `https://main--da-cli-eds--somarc.aem.live/media/media_...mp4` |

Use this workflow:

1. Fetch the current page before editing:

```sh
da --org somarc --repo chronicle content get /sites.html > /tmp/sites.html
```

2. Add or update one row in the existing `site-library` block. Keep the order grouped by the surrounding heading, avoid duplicate URLs, and add the optional Hero video cell only when the media-bus video is real and publicly reachable.

3. Push the updated page:

```sh
da --org somarc --repo chronicle content put /sites.html /tmp/sites.html --commit
```

4. Preview and publish the Sites page:

```sh
da --org somarc --repo chronicle deploy pages /sites --commit
```

Before publishing, verify that the card renders with the expected title, host label, description, and "Open site" link. If a Hero video is configured, hover and keyboard-focus the card to confirm the muted preview plays, then check that reduced-motion users are not forced into autoplaying motion. If the site is tied to a Chronicle entry or Flow Explorer, keep that relationship in the Chronicle entry body rather than overloading the Sites card.

### 3. Create a Flow Explorer (optional but encouraged)

Flow Explorers are single-page HTML apps that visualize the call flow affected by a change. They are useful when the entry would be clearer as a walkthrough than as prose alone.

**The prompt template:**

```
Create a single-page HTML file that documents the git changes in this feature branch.
Show all the components/packages on the page. I should be able to click on different
artifact surfaces and it will highlight the flow between the packages, annotating how
things are passed between each package to complete the action. Drive this from a JSON
document embedded in the page that defines all the flows.

For inspiration see: https://main--da-cli-eds--somarc.aem.live/tools/da-cli-flows.html

The page should match the Chronicle dark theme (background #0d1117, IBM Plex Mono/Sans,
GitHub-style dark palette). Output a single self-contained HTML file.
```

Feed this prompt, along with the relevant diff, file list, or description of the change, to your AI of choice. The result drops straight into `tools/<project>/flows.html`.

Once generated, commit and push — no DA pipeline needed for code files. Then add a card to `tools/index.html` for the new explorer.

### 4. Preview and publish

```sh
da --org somarc --repo chronicle deploy pages / --commit
```

This previews all DA pages (rebuilding `query-index.json`) and publishes to live in one step.

### 5. Link back from the upstream PR

Add to the PR description:

```
Interactive flow explorer: https://main--chronicle--somarc.aem.live/tools/<project>/flows.html
```

---

## Blocks

| Block | Location | Purpose |
|---|---|---|
| `work-catalogue` | `blocks/work-catalogue/` | Homepage index — Timeline / Project / Issue views, fetches `/query-index.json` |
| `issue-context` | `blocks/issue-context/` | Issue page header — project badge, issue/PR links, date, summary, actions |
| `related-entries` | `blocks/related-entries/` | Bottom-of-page "More from \<project\>" — add `<div class="related-entries"></div>` to any issue page |
| `header` | `blocks/header/` | Site nav — auto-injects breadcrumbs (`project | #issue`) on `/issues/` pages |

---

## Scripts

| Script | Purpose |
|---|---|
| `scripts/chronicle-nav.js` | Nav bar builder — `buildNav()` + `decorateBrowse()` |
| `scripts/pr-draft.js` | CLI — generate DA issue page HTML from a GitHub PR URL |

---

## Development

```sh
npm i
npm run lint
aem up          # local dev server at http://localhost:3000
```

Flow Explorer files (`tools/*/flows.html`) are standalone HTML — open directly in a browser or via `aem up`.

## Working principle

Chronicle should stay useful under pressure. Prefer concise entries, concrete evidence, and links to the surfaces that matter. Do not document everything; document the parts that reduce future friction.

---

## Query index

`helix-query.yaml` indexes all `/issues/**` pages. Fields: `title`, `description`, `project`, `issue-number`, `issue-url`, `pr-url`, `flows-url`, `date`. Rebuilt automatically on every `da preview` call to an `/issues/` page.
