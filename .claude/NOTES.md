Edit via setup-fornida-plugins.ps1. Always validate before pushing. Log intended changes here before acting to avoid multi-agent conflicts.

## 2026-06-24 (brian.over) — add github, superpowers, vercel plugins
Vendoring 3 plugins from anthropics/claude-plugins-official curation:
- github     <= anthropics/claude-plugins-official /external_plugins/github @ bb335391 (thin MCP plugin)
- superpowers<= obra/superpowers @ 896224c4 (matches official pin)
- vercel     <= vercel/vercel-plugin @ b2f2bc09 (official curated pin; upstream main 5f3f0ad is newer but unvetted)
Updating marketplace.json + VENDOR.md. NOTE: setup-fornida-plugins.ps1 is referenced in README but absent from repo — vendored manually this round.
