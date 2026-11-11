# Vendored plugin provenance (upstream + pinned SHA)

- compound-engineering  <=  github.com/EveryInc/compound-engineering-plugin (repo root; RAW, foreign-tool mirror dirs + tests/ excluded) @ 74df0e0778819995d19837a918c68966ec9320f1
- caveman  <=  github.com/JuliusBrussee/caveman  @ 3dc497a7f858c774d6e15b25e8c6120ef3a0eda8  (curated: only the plugin surface — .claude-plugin/ src/ commands/ skills/ agents/ + LICENSE, LICENSE-MIT, NOTICE, LICENSING.md, TRADEMARKS.md, README, GEMINI.md. Upstream is a large monorepo; its engine/proxy/browse/mcp/shrink/Go product dirs are not needed for the plugin and stay out. Since caveman 3.0.0 the whole repo is Apache-2.0 (formerly MIT + BSL-1.1); pre-3.0 MIT text kept in LICENSE-MIT. skip=$true in the script so the RAW automated re-vendor can't pull the monorepo in; update manually via the curated clone+copy.)
- superclaude  <=  github.com/SuperClaude-Org/SuperClaude_Framework (/plugins/superclaude) @ 1b81e51db955126ec8983769b96dec575d730c05
- github  <=  github.com/anthropics/claude-plugins-official (/external_plugins/github) @ e37d307bd9f85dab6fea5dfb5e3dc146753b2d2d
- superpowers  <=  github.com/obra/superpowers  @ 22f0b463e7a5e579904dd6211a520321035526f7
- vercel  <=  github.com/vercel/vercel-plugin  @ a51b34618683929ee83c5a6e001c2da8261b3479

## First-party plugins (Fornida-authored, not vendored)

- fornida-design  (2026-11-04)  Fornida's frontend design skill + `ui-check` measurement tool. Not in
  `setup-fornida-plugins.ps1`; the re-vendor script never touches it. Contains content adapted from
  pbakaus/impeccable @ 5af4319 (Apache-2.0) and nextlevelbuilder/ui-ux-pro-max-skill @ ccce51c (MIT), and bundles
  axe-core 4.14.0 (MPL-2.0) unmodified. Provenance, changes and licenses: `plugins/fornida-design/NOTICE.md`.

## No Fornida overlays — plugins are vendored RAW

These plugins carry **no** Fornida-specific edits. Force/customization (e.g. the
forced caveman terse output style, ultra default) lives in the **kit**
(`fornida-project-kit`, repo `fornida-claude-project_instructions`) via its own
`output-styles/` — `force-for-plugin` applies from any enabled plugin, and the kit
is a required install. Keeping this repo raw means plugins re-vendor to current
upstream with no overlay to clobber or re-apply.

(Earlier versions overlaid a forced output style + hook-neutralized `plugin.json`
onto caveman here; that was moved to the kit so this repo stays a clean passthrough.)

## Known limitation — compound-engineering on Windows

Upstream compound-engineering **restructured**: the plugin now lives at the repo
**root** (not under `plugins/compound-engineering`), so its vendoring subpath is `''`
(see `setup-fornida-plugins.ps1`). Its tarball also contains symlinked mirror dirs
(`.agy`, `.cursor-plugin`, `.codex-plugin`, etc.) that Windows `tar.exe` cannot
extract (`Invalid argument`). Updating CE on Windows therefore needs a git-based
fetch or symlink-tolerant extraction rather than the tar path the script uses for
caveman. Until that is added, update CE from a Unix shell (git-bash/WSL/macOS/Linux)
or via `git`. caveman has no symlink issue and vendors cleanly on every platform.
