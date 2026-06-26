# Requirements: Automatic plugin re-vendor → PR

- **Date:** 2026-06-26
- **Repo:** `fornida-claude-plugins`
- **Status:** Ready for planning
- **Scope tier:** Standard

## Problem

Vendored plugins (compound-engineering, caveman, vercel, github, superclaude, superpowers)
are pinned to upstream SHAs and refreshed by `setup-fornida-plugins.ps1`. The script works,
but staying current depends on **a human remembering to run it**. Nothing is broken — the
risk is silent rot: upstream moves, nobody notices, the fleet drifts behind for weeks.

The toil is *detection*, not execution or review. Remove the need to remember.

## Goal

A scheduled job notices upstream changes and hands a maintainer a ready-to-review PR. The
human-approval gate before fleet-wide publish stays exactly as-is — **merge is what
publishes**. Success = no maintainer ever has to remember to check upstream again.

## Solution shape

A scheduled GitHub Actions workflow (`.github/workflows/auto-revendor.yml`) that:

1. Runs on a **weekly** cron (Monday AM; tunable) and on manual `workflow_dispatch`.
2. Runs on an `ubuntu-latest` runner using PowerShell (`pwsh` is preinstalled).
3. Invokes the existing `setup-fornida-plugins.ps1` as the engine — re-vendor from latest
   upstream SHAs, rewrite `VENDOR.md` provenance, run `apply-overlays.ps1` +
   `verify-overlays.ps1`.
4. If `git diff` shows changes, opens a PR titled e.g. `chore(vendor): re-pin plugins to
   latest upstream` with the per-plugin SHA bumps and upstream changelog excerpts in the body.
5. If there is **no diff**, exits cleanly — no PR, no noise.
6. If `verify-overlays.ps1` fails (overlay drift — e.g. caveman forced style missing or Node
   hooks returned), the run **fails loudly and opens no PR**.

### Why GitHub Actions over Azure

This is pure git/repo work on a GitHub repo. GitHub Actions is its natural home: `gh`, `git`,
and `tar` are native, no external secrets or infra, and the **Linux runner sidesteps the CE
Windows-`tar.exe` symlink limitation** documented in `VENDOR.md` ("Known limitation —
compound-engineering on Windows"). A weekly ~2–3 min run is negligible against the free-tier
minutes budget. The org "prefer Azure" rule targets app/service hosting; reaching into a
GitHub repo *from* Azure would add a GitHub PAT to manage and rotate for zero benefit.

## In scope

- New workflow `.github/workflows/auto-revendor.yml`.
- Reuse `setup-fornida-plugins.ps1` unchanged as the engine where possible.
- PR-only output; branch push only, never a push to `main`.
- Overlay verification gates the PR.
- Manual `workflow_dispatch` trigger alongside the cron, for on-demand runs.

## Explicitly out of scope

- **Auto-merge / auto-publish.** The human approval gate is preserved untouched (org: no
  deploy without explicit human approval).
- **Azure hosting.** Revisit only if org-wide secrets/network ever force it.
- **Renovate / Dependabot.** They cannot model vendored copies + the load-bearing caveman
  overlay; the custom script remains the engine.

## Dependencies / Assumptions

- **Cadence:** weekly (Monday AM). Tunable in the cron expression.
- **Repo setting prerequisite:** "Allow GitHub Actions to create pull requests" must be
  enabled (Settings → Actions → General → Workflow permissions). One-time, manual.
- **Workflow permissions:** `contents: write` (push the branch) + `pull-requests: write`
  (open the PR). It does NOT need or get `main` push rights beyond branch creation.
- **GITHUB_TOKEN caveat:** PRs opened by the default `GITHUB_TOKEN` do not themselves trigger
  further workflows. Acceptable here (no downstream CI depends on the PR-open event); note for
  planning in case PR validation is added later.
- `setup-fornida-plugins.ps1` assumes `gh` is authenticated — satisfied on Actions runners via
  `GITHUB_TOKEN` / `gh auth`.

## Known issue to fix (bundle with this work)

`apply-overlays.ps1` currently copies only `overlays/caveman/output-styles/caveman.md` and
`overlays/caveman/plugin.json`. The overlay source now also contains `caveman-lite.md` and
`caveman-ultra.md` (added alongside this brainstorm). The script does **not** copy them, so
the selectable lite/ultra tiers never reach `plugins/caveman/`. The automation would faithfully
reproduce this gap. Fix `apply-overlays.ps1` to copy all `overlays/caveman/output-styles/*.md`
(or enumerate lite/ultra explicitly) as part of this work.

## Success criteria

- A maintainer never has to remember to check upstream; staleness surfaces as a PR within one
  cadence window of an upstream change.
- Every auto-PR has overlays applied + verified; a drift failure blocks the PR loudly.
- No change to the publish gate: nothing reaches the fleet without a human merge.
- Zero PRs when upstream is unchanged.

## Open questions for planning

- PR body content depth: full changelog vs. just SHA range + commit count per plugin.
- Notification surface beyond the PR (e.g. email/Teams on PR open) — likely unnecessary if
  maintainers watch the repo; decide in planning.
- Whether to also fail the run (not just skip the PR) when an upstream repo is unreachable.
