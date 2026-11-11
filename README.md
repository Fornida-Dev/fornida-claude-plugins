# fornida-claude-plugins

Private Claude Code / Cowork plugin marketplace for Fornida. Distributed org-wide
via Claude Org Settings > Plugins (GitHub sync). Plugins are vendored (copied in)
and pinned to upstream commit SHAs for auditability - see VENDOR.md.

## Scheduled maintenance (every other Friday)
`.github/workflows/plugin-updates.yml` runs on even ISO weeks, Fridays 14:23 UTC (and on demand:
Actions → plugin-updates → Run workflow). It uses no Claude/API tokens. Each run:

1. Re-vendors the automated plugins with `setup-fornida-plugins.ps1 -NoCommit` (skip-flagged
   plugins are left alone and reported when upstream has moved).
2. Checks every plugin (`scripts/plugin-maintenance.mjs`): manifests parse, no nested
   `plugin.json`, unique skill names, every hook script exists and parses, `claude plugin validate`.
3. Scans changed files for secret shapes (reports `file:line`, never the value), vendored
   lockfiles with OSV-Scanner, and the pinned axe-core / playwright-core for CVEs and new releases.
   Lockfile CVEs are split by exposure: **runtime** (the plugin ships the package, or a hook, skill,
   agent or command imports it; high/critical fails the run) vs **build** (vendor tooling that Claude
   never installs or loads; listed for the record, the vendor fixes it).
4. Opens a **draft PR** (label `plugin-updates`; the previous open one is closed as superseded)
   when the re-vendor changed anything, or comments on the open *Plugin maintenance: action
   needed* issue when only advisories or errors remain. Errors also fail the run, which emails
   whoever last edited the workflow.

The PR lists what to review first: changed hook scripts, scripts, manifests and license files,
i.e. code that will run on every machine. It never merges or publishes. After review: merge,
**Re-sync** in Claude Org Settings → Plugins, then an Owner approves versions marked *needs attention*.

One-time setup: Settings → Actions → General → *Allow GitHub Actions to create and approve pull
requests*. Local check: `node scripts/plugin-maintenance.mjs --no-network`; tests:
`node --test scripts/plugin-maintenance.test.mjs`.

## Update a vendored plugin
Manual, on demand (the scheduled run above does steps 1–2 for the automated plugins).

1. `.\setup-fornida-plugins.ps1` — re-pins each plugin to its latest upstream SHA and
   vendors the tree **RAW** (no overlays), updating VENDOR.md. `-Plugin <name>` updates one.
   `tar --exclude` drops content the **claude.ai-hosted** validator rejects: foreign-tool
   mirror dirs, `tests/` (nested plugin.json), top-level `bin/`, and nested `upstream/`
   skill copies.
2. `claude plugin validate .` (optional). Note it does **not** catch the hosted-only rules
   (nested plugin.json, `bin/`, duplicate skills) — the excludes handle those.
3. The script commits to the current branch and stops — it does **not** push (org rule: no
   deploy without explicit approval). Push to `main`, then click **Re-sync** in Claude Org
   Settings → Plugins to republish to the fleet.

> **superclaude is `skip`-flagged** in the script. Its upstream `plugin.json` declares
> `"agents": "./agents/"` (a directory string) which the validator rejects
> (`agents: Invalid input`), breaking the whole marketplace sync — so RAW auto-re-vendor is
> harmful. Update it manually with `-Plugin superclaude`, then convert `agents` back to an
> explicit file array (one `./agents/<file>.md` per entry) before committing.

## No overlays — force lives in the kit
Plugins are vendored **RAW**; no Fornida edits here. Fornida customization — the forced
caveman terse output style + ultra default — lives in **`fornida-project-kit`** (repo
`fornida-claude-project_instructions`), a Required install. Keeping this repo raw means
plugins re-vendor cleanly with nothing to clobber. See VENDOR.md.

## Add a plugin
Add a `Vendor` line in the script and an entry in `.claude-plugin/marketplace.json`.

## First-party plugins
`plugins/fornida-design` is written by Fornida, not vendored: the "no Fornida edits" rule above applies to vendored
plugins only. It is not in the script, so re-vendoring never touches it. Change it directly, bump its
`plugin.json` version, run `node --test plugins/fornida-design/test/*.test.mjs`, then push + Re-sync as usual.
Third-party content inside it is listed in its `NOTICE.md`.

Provenance + pinned SHAs: see VENDOR.md.