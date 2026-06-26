# Vendored plugin provenance (upstream + pinned SHA)

- compound-engineering  <=  github.com/EveryInc/compound-engineering-plugin (/plugins/compound-engineering) @ 63b6b260c345ba70ce9d9a393eeedefb64e4e0a0
- caveman  <=  github.com/JuliusBrussee/caveman  @ 655b7d9c5431f822264b7732e9901c5578ac84cf
- superclaude  <=  github.com/SuperClaude-Org/SuperClaude_Framework (/plugins/superclaude) @ 226c45cc93b865108843a669c6545d421784b68c
- github  <=  github.com/anthropics/claude-plugins-official (/external_plugins/github) @ bb335391eb831a044ce74d5bd4e30e46fc695096
- superpowers  <=  github.com/obra/superpowers  @ 896224c4b1879920ab573417e68fd51d2ccc9072
- vercel  <=  github.com/vercel/vercel-plugin  @ b2f2bc09dd05b15db9cb2e696f57872e85944aad

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

### Re-vendor MUST re-apply overlays

After any re-pin/re-vendor of caveman, run:

```powershell
.\apply-overlays.ps1     # restore Fornida overlay onto plugins/caveman
.\verify-overlays.ps1    # FAILS LOUD if hooks returned or the style went missing
claude plugin validate . # optional but recommended
```

`verify-overlays.ps1` exists so a forgotten re-apply is a loud failure, not a
silent fleet-wide revert to verbose.

**Follow-up (not yet done):** fold the `apply-overlays.ps1` call into
`setup-fornida-plugins.ps1` once that script is version-controlled in this repo,
so re-apply is automatic rather than a manual checklist step.
