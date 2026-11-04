Edit via setup-fornida-plugins.ps1. Always validate before pushing. Log intended changes here before acting to avoid multi-agent conflicts.

## 2026-06-24 (brian.over) — add github, superpowers, vercel plugins
Vendoring 3 plugins from anthropics/claude-plugins-official curation:
- github     <= anthropics/claude-plugins-official /external_plugins/github @ bb335391 (thin MCP plugin)
- superpowers<= obra/superpowers @ 896224c4 (matches official pin)
- vercel     <= vercel/vercel-plugin @ b2f2bc09 (official curated pin; upstream main 5f3f0ad is newer but unvetted)
Updating marketplace.json + VENDOR.md. NOTE: setup-fornida-plugins.ps1 is referenced in README but absent from repo — vendored manually this round.

## 2026-06-26 (brian.over via Claude) — revert caveman overlay to raw
Moving the forced caveman output style INTO the kit (fornida-project-kit, already merged v1.17.0).
This repo returns to raw vendored caveman: removing overlays/, apply-overlays.ps1,
verify-overlays.ps1, the overlay calls in setup-fornida-plugins.ps1, the VENDOR.md
overlay section, and restoring upstream caveman plugin.json (hooks). Branch: feat/caveman-raw-revert.

## 2026-11-04 (brian.over via Claude) — add first-party fornida-design plugin
New Fornida-authored plugin `plugins/fornida-design` (NOT vendored; the re-vendor script does not touch it).
Combines: design method adapted from pbakaus/impeccable (Apache-2.0, launcher/live/telemetry/hooks removed),
UX guideline data from nextlevelbuilder/ui-ux-pro-max-skill (MIT), check ideas from creynir/snug + gridproof (MIT,
reimplemented, no code dependency), vendored unmodified axe-core (MPL-2.0). Adds marketplace.json entry, VENDOR.md +
README notes. No hooks. Branch: claude/project-setup-plugins-53bc5a. Draft PR only, no merge/Re-sync (no deploy).
