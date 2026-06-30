# Vendored plugin provenance (upstream + pinned SHA)

- compound-engineering  <=  github.com/EveryInc/compound-engineering-plugin (repo root; upstream moved plugin out of /plugins/compound-engineering into a monorepo root) @ 240b69efcc9832e02036c802c3f65ba2684424b5 (vendored subset: .claude-plugin/ + skills/ + root docs; src/tests/build toolchain excluded)
- caveman  <=  github.com/JuliusBrussee/caveman  @ 25d22f864ad68cc447a4cb93aefde918aa4aec9f
- superclaude  <=  github.com/SuperClaude-Org/SuperClaude_Framework (/plugins/superclaude) @ 226c45cc93b865108843a669c6545d421784b68c
- github  <=  github.com/anthropics/claude-plugins-official (/external_plugins/github) @ d0c131bd2b109bd6ff6928b11b28eda1fb5b8a8e
- superpowers  <=  github.com/obra/superpowers  @ 896224c4b1879920ab573417e68fd51d2ccc9072
- vercel  <=  github.com/vercel/vercel-plugin  @ e566f76c2bd89af4158d326186c5c42d8f4f9fa4

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
