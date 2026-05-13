# Chronicle

A growing catalogue of engineering work — fixes, patterns, and flow explorers across the AEM toolchain.

- **Live:** https://main--chronicle--somarc.aem.live/
- **Preview:** https://main--chronicle--somarc.aem.page/

---

## What is this?

Chronicle documents shipped engineering work as structured entries: each fix gets a detail page (problem → root cause → fix → testing) and an interactive Flow Explorer that traces the call path affected by the change. Entries are authored in [DA](https://da.live) and indexed automatically.

---

## Site structure

```
/                            ← Index page (work-catalogue block)
/issues/<slug>               ← Issue detail pages (DA-authored)
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

### 1. Generate a draft from a PR URL

```sh
node scripts/pr-draft.js https://github.com/adobe/helix-tools-website/pull/369
node scripts/pr-draft.js <pr-url> --out /tmp/my-slug.html
```

The script fetches the PR (and any linked issue), extracts Problem / Root Cause / Fix / Testing sections, and outputs a ready-to-review DA content HTML file. Review the `<!-- TODO -->` placeholders before publishing.

### 2. Push to DA

```sh
da --org somarc --repo chronicle content put /issues/<slug>.html /tmp/<slug>.html --commit
```

**Slug convention:** `<project>-<brief-description>` — e.g. `page-status-byom`, `helix-admin-cache-ttl`

### 3. Create a Flow Explorer (optional but encouraged)

Flow Explorers are single-page HTML apps that visualise the call flow affected by a change. They're **AI-generated in one shot** from a prompt — no manual HTML authoring required.

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

Feed this prompt — along with the relevant diff, file list, or description of the change — to your AI of choice. The result drops straight into `tools/<project>/flows.html`.

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

---

## Query index

`helix-query.yaml` indexes all `/issues/**` pages. Fields: `title`, `description`, `project`, `issue-number`, `issue-url`, `pr-url`, `flows-url`, `date`. Rebuilt automatically on every `da preview` call to an `/issues/` page.
