# fornida-claude-plugins

Private Claude Code / Cowork plugin marketplace for Fornida. Distributed org-wide
via Claude Org Settings > Plugins (GitHub sync). Plugins are vendored (copied in)
and pinned to upstream commit SHAs for auditability - see VENDOR.md.

## Update a vendored plugin
Manual, on demand (no scheduled automation).

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

Provenance + pinned SHAs: see VENDOR.md.