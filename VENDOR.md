# Vendored plugin provenance (upstream + pinned SHA)

- compound-engineering  <=  github.com/EveryInc/compound-engineering-plugin (repo root; upstream moved plugin out of /plugins/compound-engineering into a monorepo root) @ 240b69efcc9832e02036c802c3f65ba2684424b5 (vendored subset: .claude-plugin/ + skills/ + root docs; src/tests/build toolchain excluded)
- caveman  <=  github.com/JuliusBrussee/caveman  @ 25d22f864ad68cc447a4cb93aefde918aa4aec9f
- superclaude  <=  github.com/SuperClaude-Org/SuperClaude_Framework (/plugins/superclaude) @ 226c45cc93b865108843a669c6545d421784b68c
- github  <=  github.com/anthropics/claude-plugins-official (/external_plugins/github) @ d0c131bd2b109bd6ff6928b11b28eda1fb5b8a8e
- superpowers  <=  github.com/obra/superpowers  @ 896224c4b1879920ab573417e68fd51d2ccc9072
- vercel  <=  github.com/vercel/vercel-plugin  @ e566f76c2bd89af4158d326186c5c42d8f4f9fa4

## Fornida overlays (applied ON TOP of the vendored copy)

Some vendored plugins carry Fornida-specific edits that must be re-applied after
every re-vendor, because re-pinning re-copies the upstream tree and clobbers them.
Source of truth lives in `overlays/`; `apply-overlays.ps1` re-applies it.

- **caveman** — Fornida-authored overlay (`overlays/caveman/`):
  - `output-styles/caveman.md` — a **forced** terse output style
    (`force-for-plugin: true`, `keep-coding-instructions: true`). Makes every
    Fornida Claude default to terse output automatically (lower token usage is
    always preferred), with code/commits/security/irreversible actions written
    normally. This is the load-bearing activation mechanism.
  - `plugin.json` — hook-neutralized: the upstream Node `SessionStart`
    (`caveman-activate.js`) and `UserPromptSubmit` (`caveman-mode-tracker.js`)
    hook wiring is removed. The output style replaces them, and dropping the Node
    dependency keeps activation cross-platform-safe (no Node-on-PATH requirement).
    `src/hooks/` files are left on disk; only the `plugin.json` wiring is removed.

  Trade-off: removing the tracker hook means there is no durable per-user opt-out
  while caveman is enabled — `/output-style` and a typed `stop caveman` drop terse
  for the current session only; `force-for-plugin` re-applies next session.

  - `output-styles/caveman-lite.md` + `output-styles/caveman-ultra.md` — selectable
    (NON-forced) intensity tiers that preserve caveman's lite/full/ultra functionality
    without the Node hooks. Users pick them per-session via `/output-style`; only
    `caveman.md` is forced. `verify-overlays.ps1` asserts exactly one forced style.

  - **`.caveman/config.json` is inert here.** Upstream `25d22f86` added a repo-local
    `.caveman/config.json` + natural-language brevity triggers, but they are read
    ONLY by the Node hooks (`src/hooks/caveman-config.js` and the activate/tracker
    hooks) — which our overlay removes. No MCP server, tool, or command reads them.
    So the config mechanism has no effect in the Fornida setup; the forced output
    style is the single source of terse behavior. No conflict.

### Re-vendor re-applies overlays automatically

`setup-fornida-plugins.ps1` (now version-controlled in this repo) runs
`apply-overlays.ps1` + `verify-overlays.ps1` automatically after vendoring, and
aborts before committing if verify fails. So a re-pin can never silently drop the
caveman overlay. To re-apply manually outside a full re-vendor:

```powershell
.\apply-overlays.ps1     # restore Fornida overlay onto plugins/caveman
.\verify-overlays.ps1    # FAILS LOUD if hooks returned or a style went missing
```

## Known limitation — compound-engineering on Windows

Upstream compound-engineering **restructured**: the plugin now lives at the repo
**root** (not under `plugins/compound-engineering`), so its vendoring subpath is `''`
(see `setup-fornida-plugins.ps1`). Its tarball also contains symlinked mirror dirs
(`.agy`, `.cursor-plugin`, `.codex-plugin`, etc.) that Windows `tar.exe` cannot
extract (`Invalid argument`). Updating CE on Windows therefore needs a git-based
fetch or symlink-tolerant extraction rather than the tar path the script uses for
caveman. Until that is added, update CE from a Unix shell (git-bash/WSL/macOS/Linux)
or via `git`. caveman has no symlink issue and vendors cleanly on every platform.
