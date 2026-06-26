# fornida-claude-plugins

Private Claude Code / Cowork plugin marketplace for Fornida. Distributed org-wide
via Claude Org Settings > Plugins (GitHub sync). Plugins are vendored (copied in)
and pinned to upstream commit SHAs for auditability - see VENDOR.md.

## Update a vendored plugin
1. Re-run setup-fornida-plugins.ps1 (re-pins every plugin to latest upstream SHA).
2. `.\apply-overlays.ps1` — re-apply Fornida overlays clobbered by the re-pin (see VENDOR.md "Fornida overlays").
3. `.\verify-overlays.ps1` — guard; fails loud if an overlay reverted (caveman style missing / Node hooks returned).
4. `claude plugin validate .`  (optional but recommended)
5. The script commits + pushes to `main`. If "Sync automatically" is on, the merge republishes.

> Skipping step 2 silently reverts caveman to verbose fleet-wide. Step 3 catches it.

## Add a plugin
Add a `Vendor` line in the script and an entry in `.claude-plugin/marketplace.json`.

Provenance + pinned SHAs: see VENDOR.md.