---
title: "feat: Fix and merge fornida-claude-plugins updates + automate currency"
type: feat
status: active
date: 2026-06-26
origin: docs/brainstorms/2026-06-26-auto-revendor-plugins-requirements.md
depth: Standard
---

# feat: Fix and merge fornida-claude-plugins updates + automate currency

## Summary

Two deliverables to close out the plugin-marketplace work:

- **A — Merge the pending re-vendor.** Branch `feat/compound-engineering-update`
  (`0a1b1ae`, unpushed) has compound-engineering (→3.14.3), github, and vercel
  refreshed to upstream HEAD, plus exclude-based vendor filtering and a scoped-commit
  guard. `main` (published to the fleet) still has these three stale. Verify, push,
  PR, merge — that publishes the updates.
- **B — Automate currency.** Add a scheduled GitHub Actions workflow that re-vendors
  weekly, re-applies/verifies overlays, and opens a rolling PR on change — so staying
  current never again depends on a human remembering to run the script (see origin:
  `docs/brainstorms/2026-06-26-auto-revendor-plugins-requirements.md`).

Plus light cleanup of stale planning artifacts left from this session's false starts.

---

## Problem Frame

The marketplace work fragmented across parallel sessions: caveman + lite/ultra + the
`setup-fornida-plugins.ps1` engine landed on `main` via PR #1, but the
compound-engineering/github/vercel re-vendor and the exclude-filtering enhancement sit
**unpushed** on `feat/compound-engineering-update`. The fleet is therefore running stale
CE/github/vercel. Separately, the "make updates automatic" goal from the brainstorm was
never built — `.github/workflows/` does not exist. The job now is to land the pending
work cleanly and finish the automation, not to re-vendor again.

Verified current state (read at plan time):
- `feat/compound-engineering-update` @ `0a1b1ae`: CE has no `src/`/`tests/` bloat,
  github = 2 files, vercel = 0.44.0; `claude plugin validate .` passes (2 cosmetic
  no-version warnings); `verify-overlays.ps1` OK. Branch is 2 commits ahead of `main`,
  not pushed.
- `setup-fornida-plugins.ps1` on the branch has exclude support (manifest `exclude`
  list applied as `tar --exclude`).
- `.github/workflows/` absent.

---

## Requirements

- **R1** — The three stale plugins (compound-engineering, github, vercel) reach the
  fleet at their current upstream SHAs, through the human merge gate. (Deliverable A)
- **R2** — The merge introduces no vendor bloat and no overlay regression; caveman's
  forced style and hook-neutralized manifest survive. (Deliverable A; origin Success criteria)
- **R3** — A scheduled job re-vendors and opens a PR on change without human initiation;
  no diff → no PR; never pushes to `main`. (Deliverable B; origin R1/R2)
- **R4** — Overlays are re-applied and verified every automated run; verify failure
  blocks the PR loudly. (Deliverable B; origin R3)
- **R5** — Human approval gate preserved; merge is the only publish. (origin R4)
- **R6** — Stale session artifacts (superseded plan, brainstorm "known issue" already
  fixed) are reconciled so the repo's docs match reality.

---

## Key Technical Decisions

### KTD1 — Ship A and B as two separate PRs, A first
Deliverable A is data (vendored trees); B is tooling (a workflow). They have different
review concerns and B depends on A's exclude-filtering being on `main` first (KTD2).
Keeping them separate keeps each PR reviewable and lets A publish immediately.

### KTD2 — B must merge after A
The automation calls `setup-fornida-plugins.ps1`, whose exclude-filtering for CE lives in
`0a1b1ae` (branch A). If B merged first, the first scheduled run would re-vendor CE as the
full upstream monorepo (the exact bloat just cleaned up) and open a huge noisy PR. Order
is a hard dependency, not a preference.

### KTD3 — Reuse `setup-fornida-plugins.ps1 -NoCommit` as the workflow engine
The script already vendors + applies + verifies overlays and aborts on verify failure
(satisfies R4 for free). The workflow runs it with `-NoCommit`, then a PR action commits.
Single source of truth for vendor logic; no duplication in YAML.

### KTD4 — `peter-evans/create-pull-request`, pinned to a commit SHA, on `ubuntu-latest`
Idempotent (updates one rolling PR instead of weekly duplicates; no-ops on no diff →
satisfies R3). Third-party action — pin to a full commit SHA, not a tag (supply-chain
hardening; org compliance). `ubuntu-latest` because CE's upstream tree historically tripped
Windows `tar.exe` on symlinks; Linux extracts cleanly and pwsh is preinstalled.

### KTD5 — Least-privilege token + one-time repo setting
`permissions: { contents: write, pull-requests: write }`. Requires "Allow GitHub Actions to
create pull requests" enabled once in repo settings; documented as a prereq, not automated.

---

## Implementation Units

### U1. Pre-merge verification of the re-vendor branch

- **Goal:** Confirm `feat/compound-engineering-update` is correct and clean before it
  reaches the fleet — the last gate before publish.
- **Requirements:** R1, R2.
- **Dependencies:** none.
- **Files:** none modified (verification only): `plugins/`, `VENDOR.md`,
  `verify-overlays.ps1`, `.claude-plugin/marketplace.json`.
- **Approach:** On the branch, confirm: (a) `VENDOR.md` SHAs match the vendored trees for
  CE/github/vercel; (b) no build-toolchain bloat in `plugins/compound-engineering`
  (`src/`, `tests/`, `bun.lock`, foreign-tool mirror dirs absent); (c) `verify-overlays.ps1`
  exits 0; (d) `claude plugin validate .` passes; (e) `git diff main..HEAD` touches only
  intended paths. Any failure stops the deliverable and routes back to fix.
- **Patterns to follow:** the existing `verify-overlays.ps1` + `claude plugin validate`
  checks already used in the re-vendor flow.
- **Test scenarios:** `Test expectation: none — verification unit, not behavior-bearing.`
  Verification is the deliverable: all five checks above pass.
- **Verification:** all five checks green; reviewer can read the branch diff and see only
  vendored-plugin + VENDOR.md changes.

### U2. Publish deliverable A (push → PR → merge)

- **Goal:** Get the re-vendor onto `main` so the fleet runs current CE/github/vercel.
- **Requirements:** R1, R5.
- **Dependencies:** U1.
- **Files:** none (git/PR operation).
- **Approach:** Push `feat/compound-engineering-update`, open a PR to `main` describing the
  three SHA bumps + the exclude-filtering/scoped-commit-guard tooling change. Human reviews
  and merges. If "Sync automatically" is enabled on the org marketplace, merge republishes
  to the fleet. No force-push, no direct `main` commit.
- **Patterns to follow:** PR #1's merge flow (same repo, same publish mechanism).
- **Test scenarios:** `Test expectation: none — release operation.`
- **Verification:** PR merged; `origin/main` contains `0a1b1ae`'s content; a fresh
  `claude plugin` install resolves CE 3.14.3.
- **Execution note:** This unit is gated on explicit human approval to push/merge (org: no
  deploy without approval). Do not push without a go-ahead.

### U3. Scheduled re-vendor → PR workflow (deliverable B)

- **Goal:** Weekly + on-demand automated re-vendor that opens/updates a rolling PR on
  change and is silent otherwise.
- **Requirements:** R3, R4, R5.
- **Dependencies:** U2 (KTD2 — exclude-filtering must be on `main` first).
- **Files:** `.github/workflows/auto-revendor.yml`
- **Approach:** `on: { schedule: [weekly Monday AM, UTC cron], workflow_dispatch: {} }`.
  Single `ubuntu-latest` job; `permissions: { contents: write, pull-requests: write }`;
  `concurrency` group to prevent overlap. Steps: checkout → `pwsh ./setup-fornida-plugins.ps1
  -NoCommit` (vendors + applies + verifies overlays; job fails if `verify-overlays.ps1`
  exits non-zero, satisfying R4) → `peter-evans/create-pull-request@<sha>` with a fixed
  branch (`automation/revendor`), templated title/body, and a label. Action no-ops on no
  diff (R3). `gh`/`git`/`tar` are runner-native; `GITHUB_TOKEN` authenticates the script's
  `gh api` calls.
- **Patterns to follow:** standard scheduled-workflow shape; `peter-evans` README usage.
  Greenfield — no existing workflow in this repo.
- **Technical design** (directional, not spec):
  ```
  on: { schedule: [{cron: '0 13 * * 1'}], workflow_dispatch: {} }
  permissions: { contents: write, pull-requests: write }
  concurrency: { group: auto-revendor, cancel-in-progress: false }
  steps:
    - uses: actions/checkout@<sha>
    - run: pwsh ./setup-fornida-plugins.ps1 -NoCommit
    - uses: peter-evans/create-pull-request@<sha>
      with: { branch: automation/revendor, title: '...', labels: 'vendored-update' }
  ```
- **Test scenarios:**
  - `Test expectation: none for the YAML` — validated by execution.
  - Verification (post-merge): `workflow_dispatch` on a deliberately-stale state → exactly
    one PR opened with the SHA bump.
  - All plugins current → run completes, **no PR**.
  - Overlay deliberately broken (forced style removed) → `verify-overlays.ps1` fails → job
    red, **no PR**.
  - Re-trigger when a PR already exists → same `automation/revendor` branch updated, not
    duplicated.
- **Verification:** a dispatch run on a stale state yields one correct PR with overlays
  verified; a current state yields none.

### U4. Docs + artifact reconciliation

- **Goal:** Repo docs match reality; stale session artifacts removed.
- **Requirements:** R6.
- **Dependencies:** U3.
- **Files:** `README.md`, `docs/brainstorms/2026-06-26-auto-revendor-plugins-requirements.md`
- **Approach:** Add an "Automated updates" subsection to README (weekly PR; review+merge to
  publish; manual script remains for ad-hoc runs; note the one-time "Allow GitHub Actions to
  create pull requests" setting and that CI uses ubuntu). Update the brainstorm doc's "Known
  issue to fix" note — the apply-overlays lite/ultra gap is already resolved (PR #1) and CE
  filtering shipped as exclude-based, not the include-list the brainstorm assumed.
- **Patterns to follow:** existing README "Update a vendored plugin" voice.
- **Test scenarios:** `Test expectation: none — docs only.`
- **Verification:** README documents the automated flow + prereq; brainstorm doc no longer
  claims an open issue that's fixed.

---

## Risks & Dependencies

- **Hard ordering U2 → U3** (KTD2): merging the workflow before the exclude-filtering is on
  `main` produces a bloated CE PR on first run. Do not parallelize.
- **One-time repo setting** (KTD5): PR step fails if "Allow GitHub Actions to create pull
  requests" is off. First-run prereq.
- **Third-party action** (KTD4): pin `peter-evans/create-pull-request` to a commit SHA.
- **GITHUB_TOKEN PR-event caveat:** PRs opened by `GITHUB_TOKEN` don't trigger further
  workflows. Fine now (no PR-validation CI depends on it).
- **Parallel-session churn:** this repo saw concurrent edits this session. Before U2, confirm
  no other session has the working tree dirty (org multi-agent coordination rule).

---

## Scope Boundaries

**In scope:** U1–U4.

### Deferred to Follow-Up Work
- Git-based / symlink-tolerant fetch so CE can be re-vendored manually on Windows (CI covers
  the automated path).
- Notification surface beyond the PR (email/Teams on PR open).
- Failing the run (vs. skipping the PR) when an upstream repo is unreachable.

### Out of scope (from origin)
- Auto-merge / auto-publish — human gate stays.
- Azure hosting — repo-native CI is the right home.
- Renovate/Dependabot — cannot model vendored copies + overlays.

---

## Open Questions (deferred to implementation)

- PR body depth for the automation: full per-plugin changelog vs. SHA range + commit count.
- Exact Monday cron time (runner is UTC).
