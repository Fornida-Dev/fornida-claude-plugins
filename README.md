# fornida-claude-plugins

Private Claude Code / Cowork plugin marketplace for Fornida. Distributed org-wide
via Claude Org Settings > Plugins (GitHub sync). Plugins are vendored (copied in)
and pinned to upstream commit SHAs for auditability - see VENDOR.md.

## Update a vendored plugin
1. `.\setup-fornida-plugins.ps1` — re-pins each plugin to its latest upstream SHA, vendors
   the tree, updates VENDOR.md, then **automatically runs `apply-overlays.ps1` +
   `verify-overlays.ps1`** so Fornida overlays can never be silently dropped. Use
   `-Plugin <name>` to update just one (e.g. `-Plugin caveman`).
2. `claude plugin validate .`  (optional but recommended).
3. The script **commits to the current branch and stops — it does NOT push** (org rule:
   no deploy without explicit human approval). Open a PR; merging to `main` republishes
   to the fleet if "Sync automatically" is on.

> The script aborts (non-zero) before committing if `verify-overlays.ps1` fails — e.g.
> caveman's forced output style went missing or its Node hooks came back.

**Windows note:** compound-engineering's tarball contains symlinked mirror dirs that
Windows `tar.exe` cannot extract; updating CE on Windows needs a git-based fetch (see
VENDOR.md "Known limitation"). caveman extracts cleanly on every platform. The scheduled
automation (below) runs on a Linux runner, so CI sidesteps this entirely — CI is the
canonical update path.

## Automated updates (scheduled)
`.github/workflows/auto-revendor.yml` runs weekly (Mondays, and on-demand via
**workflow_dispatch**) on a Linux runner. It re-vendors every plugin from latest upstream,
re-applies + verifies overlays, and — only when something changed — opens or updates a
single rolling PR (`automation/revendor`). No change → no PR.

- **Review + merge to publish.** The workflow never pushes to `main`; the merge is the
  human-gated publish (org rule: no deploy without explicit approval).
- **One-time prerequisite:** Settings → Actions → General → Workflow permissions → enable
  **"Allow GitHub Actions to create and approve pull requests"**, or the PR step 403s.
- The manual `setup-fornida-plugins.ps1` flow above still works for ad-hoc / local runs.

## Overlays (Fornida edits on top of vendored plugins)
- `overlays/` — source of truth; `apply-overlays.ps1` copies it onto `plugins/`.
- caveman ships a forced terse output style (`caveman`) plus selectable `caveman-lite` /
  `caveman-ultra` tiers (pick via `/output-style`), and a hook-neutralized `plugin.json`.
  See VENDOR.md "Fornida overlays".

## Add a plugin
Add a `Vendor` line in the script and an entry in `.claude-plugin/marketplace.json`.

Provenance + pinned SHAs: see VENDOR.md.