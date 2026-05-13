# CLAUDE.md — chronicle

EDS-based engineering work catalogue. See @AGENTS.md for base EDS conventions.

---

## Site Architecture

```
/                          ← DA index page (work-catalogue block)
/issues/<slug>             ← DA entry pages (issue-context block + prose)
/tools/<project>/flows.html ← Static flow explorer apps (code repo)
/tools/index.html          ← Static flow explorer listing (code repo)
/query-index.json          ← Auto-built from helix-query.yaml, indexes /issues/**
```

**Code repo:** `somarc/chronicle` (local: `da/chronicle/`)
**DA content:** `content.da.live/somarc/chronicle/`
**Preview:** `https://main--chronicle--somarc.aem.page/`
**Live:** `https://main--chronicle--somarc.aem.live/`
**DA config:** `da --org somarc --repo chronicle`

---

## Adding a New Entry

A chronicle entry documents a shipped (or PR-open) engineering fix with a traceable call flow.

### Step 1 — Create the flow explorer (code repo)

Create `tools/<project>/flows.html`. Reference `tools/page-status/flows.html` as the canonical template.

Key sections in the DATA object:
- `nodes` — file/module nodes with type (`ext`, `core`, `lib`, `client`, `file`) 
- `edges` — directed connections between nodes
- `scenarios` — named traces with step arrays; each step highlights nodes + edges + annotation
- `groups` — sidebar grouping of scenarios

Commit and push to `main`. Code files are served directly — no DA pipeline needed.
Use `/tools/index.html` for the listing; add a new card there for every new explorer.

### Step 2 — Author the DA entry page

Push `/issues/<slug>.html` via `da content put`:

```
da --org somarc --repo chronicle content put /issues/<slug>.html <file> --commit
```

**`<slug>` convention:** `<project>-<brief-description>` — e.g. `page-status-byom`, `helix-admin-cache-ttl`

**Issue Context block row order:**
1. project name (plain text)
2. issue number (link → issue URL)
3. PR link (link → PR URL — use the actual PR, not branch compare)
4. flows-url (link → `/tools/<project>/flows.html`)
5. date (`YYYY-MM-DD`)
6. summary (1–2 sentence plain text)

**Metadata block properties** (exact names — hyphenated, lowercase):
`title`, `description`, `project`, `issue-number`, `issue-url`, `pr-url`, `flows-url`, `date`

The `pr-url` must be the real PR URL (`/pull/<n>`), not a branch compare link. Update it once the PR is open.

### Step 3 — Preview and publish

```bash
da --org somarc --repo chronicle deploy pages / --commit
```

This previews all DA pages (triggering query-index rebuild) and publishes to live in one step.

### Step 4 — Connect the upstream PR

The upstream PR description should link to the flow explorer:

```markdown
Interactive flow explorer documenting all N classification scenarios:
https://main--chronicle--somarc.aem.page/tools/<project>/flows.html
```

---

## Updating an Existing Entry

If the PR URL was a branch compare and the PR is now open/merged, update via:

```bash
da --org somarc --repo chronicle content get /issues/<slug>.html > /tmp/<slug>.html
# edit the file — change pr-url in both the issue-context block and metadata block
da --org somarc --repo chronicle content put /issues/<slug>.html /tmp/<slug>.html --commit
da --org somarc --repo chronicle deploy pages / --commit
```

---

## DA Content HTML Structure

The DA API returns/expects raw `<body>` HTML with no surrounding document shell. EDS block tables are serialized as nested divs:

```html
<body>
  <header></header>
  <main>
    <div>
      <div class="issue-context">
        <div><div><p>ROW 1 VALUE</p></div><div></div></div>
        <div><div><p><a href="URL">LINK TEXT</a></p></div><div></div></div>
        ...
      </div>
    </div>
    <div>
      <!-- prose sections -->
    </div>
    <div>
      <div class="metadata">
        <div><div><p>key</p></div><div><p>value</p></div></div>
        ...
      </div>
    </div>
  </main>
  <footer></footer>
</body>
```

---

## Block Contracts

**`issue-context`** — row access uses `block.children[idx].children[0]` (EDS converts `<td>` → `<div>` before decorate). Row index map: 0=project, 1=issue, 2=PR, 3=flows-url, 4=date, 5=summary.

**`work-catalogue`** — fetches `/query-index.json`, filters `path.startsWith('/issues/')`. Renders Timeline / Project / Issue views. Index is rebuilt on any `da preview` call to an `/issues/` page.

**`header`** — calls `buildNav(block)` from `scripts/chronicle-nav.js`. Nav renders brand + Explorers link + Browse dropdown.

---

## Static Pages (code repo, not DA)

`tools/index.html` and all `tools/*/flows.html` files live in the code repo. They:
- Load IBM Plex fonts directly from Google Fonts
- Import `buildNav` or `decorateBrowse` from `/scripts/chronicle-nav.js`
- Must be accessed with explicit `.html` extension (EDS routes extensionless paths to DA pipeline)
- Do **not** need `da preview`/`da publish` — code sync handles them automatically after `git push`
