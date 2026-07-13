# Vendored plugin provenance (upstream + pinned SHA)

- compound-engineering  <=  github.com/EveryInc/compound-engineering-plugin (repo root; upstream moved plugin out of /plugins/compound-engineering into a monorepo root) @ 240b69efcc9832e02036c802c3f65ba2684424b5 (vendored subset: .claude-plugin/ + skills/ + root docs; src/tests/build toolchain excluded)
- caveman  <=  github.com/JuliusBrussee/caveman  @ 0d95a81d35a9f2d123a5e9430d1cfc43d55f1bb0
- superclaude  <=  github.com/SuperClaude-Org/SuperClaude_Framework (/plugins/superclaude) @ 226c45cc93b865108843a669c6545d421784b68c
- github  <=  github.com/anthropics/claude-plugins-official (/external_plugins/github) @ 108f8f429d6e334578bf51d14776b6753a386214
- superpowers  <=  github.com/obra/superpowers  @ d884ae04edebef577e82ff7c4e143debd0bbec99
- vercel  <=  github.com/vercel/vercel-plugin  @ de37d3199cd0f62cd7efdc4a9489e111e2deeedb

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
