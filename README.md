# fornida-claude-plugins

Private Claude Code / Cowork plugin marketplace for Fornida. Distributed org-wide
via Claude Org Settings > Plugins (GitHub sync). Plugins are vendored (copied in)
and pinned to upstream commit SHAs for auditability - see VENDOR.md.

## Update a vendored plugin
1. Re-run the matching `Vendor` line in setup-fornida-plugins.ps1 (re-pins to latest upstream SHA).
2. `claude plugin validate .`
3. Commit + push to `main`. If "Sync automatically" is enabled in Org Settings, the merge republishes.

## Add a plugin
Add a folder under `plugins/<name>` (vendored) and an entry in `.claude-plugin/marketplace.json`.
Validate before pushing.

## Distribution
Org Settings > Plugins > this marketplace > set each plugin to
Installed by default / Required / Available / Not available.