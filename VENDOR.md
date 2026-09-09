# Vendored plugin provenance (upstream + pinned SHA)

- compound-engineering  <=  github.com/EveryInc/compound-engineering-plugin (repo root; RAW, foreign-tool mirror dirs + tests/ excluded) @ b36047e1b4b2123df2f3529bf04b5f2a7c5f84e4
- caveman  <=  github.com/JuliusBrussee/caveman  @ 15581d14007fd01fb3f132016741962f34936ca2  (curated: only the MIT plugin surface — .claude-plugin/ src/ commands/ skills/ agents/ + LICENSE docs. Upstream is now a ~1300-file monorepo; the engine/proxy/rewriter/browse/mcp/shrink/shared-platform product dirs are excluded — not needed for the plugin, and BSL-1.1. skip=$true in the script so the RAW automated re-vendor can't re-bloat it; update manually via the curated clone+copy.)
- superclaude  <=  github.com/SuperClaude-Org/SuperClaude_Framework (/plugins/superclaude) @ 1b81e51db955126ec8983769b96dec575d730c05
- github  <=  github.com/anthropics/claude-plugins-official (/external_plugins/github) @ 517b2fcd1b60fa2181ac52dcf8492361ba341180
- superpowers  <=  github.com/obra/superpowers  @ b36e0829c6d0140e93cfef2ca599b1b07d4a7797
- vercel  <=  github.com/vercel/vercel-plugin  @ dca8da784e876cbb8e81bd98cb5b2b87323449ca

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
