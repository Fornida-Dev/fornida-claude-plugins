# fornida-claude-plugins

Private Claude Code / Cowork plugin marketplace for Fornida. Distributed org-wide
via Claude Org Settings > Plugins (GitHub sync). Plugins are vendored (copied in)
and pinned to upstream commit SHAs for auditability - see VENDOR.md.

## Update a vendored plugin
1. Re-run setup-fornida-plugins.ps1 (re-pins every plugin to latest upstream SHA).
2. `claude plugin validate .`  (optional but recommended)
3. The script commits + pushes to `main`. If "Sync automatically" is on, the merge republishes.

## Add a plugin
Add a `Vendor` line in the script and an entry in `.claude-plugin/marketplace.json`.

Provenance + pinned SHAs: see VENDOR.md.