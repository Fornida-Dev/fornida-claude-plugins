---
name: ui-design
description: "Use for ANY frontend or UI work, before editing styles or markup: building, restyling, reviewing or fixing how a page, component, layout, form, table, chart or dashboard looks; matching a reference, mockup or the older version (v1 vs v2); responsive or mobile problems; dark mode, spacing, colors, fonts. Especially when the feedback is vague (looks off, cluttered, cramped, boring, ugly, not polished, doesn't match, hard to read, something is wrong). Turns vague feedback into measured, concrete fixes and verifies them with numbers instead of judging screenshots. Not for backend-only work."
argument-hint: "[critique | polish | layout | type | color | quieter | bolder | clarify | responsive | harden | match <reference-url> | setup] [target]"
---

# UI design

Invoke as `/ui-design` or `/fornida-design:ui-design`, or just ask for UI work. You are weak at judging rendered pixels and strong at fixing numbers. So in this skill you **measure, never eyeball**. Screenshots are for the human to confirm taste; your evidence is what `ui-check` measures.

`<skill-dir>` below means the "Base directory for this skill" path shown when this skill loads (the folder holding this SKILL.md).

## The loop (every visual task)

1. **Translate.** Turn the request or complaint into 2-3 measurable hypotheses with [reference/vocabulary.md](reference/vocabulary.md). Ask at most ONE question, and only when two surviving hypotheses point in opposite directions. Otherwise pick one and say which.
2. **Measure.** Get the page running locally: start the dev server in the background, wait for its URL, and stop it when you are done. Then run:
   ```
   node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory
   ```
   Keep the working directory at the user's project. Add `--viewports desktop,tablet,mobile` or `--scheme dark` when the complaint points there. Pages behind a login: `--storage-state` with a TEST account, file in a temp folder. Hover, open-menu, dialog or class-based dark states: `--steps`. When a reference exists (old version, sibling page, mockup build), run `--compare <reference-url>` as a separate run from the normal check. Flags and rules: [reference/ui-check.md](reference/ui-check.md).
3. **Diagnose** with the playbook the vocabulary table points to (below). Read the relevant source, not just the report.
4. **Fix at the right altitude.** Token or shared component first, container (`gap`, layout) second, single element last. Use values from DESIGN.md or the project's tokens; never invent one-off values (13px, #3a3a3a).
5. **Verify.** Re-run the same ui-check command. A fix is done when its rule is clean or the remaining finding is explained (an intentional ellipsis, say). Stop after 3 fix-and-recheck cycles and report what is left.
6. **Report in their words with numbers**: "You said it felt cramped: card padding was 8px against 24px elsewhere, line-height 1.2; now 24px and 1.5. ui-check went from 7 findings to 0." Then give the human the screenshot path from `--out` to confirm the look.

Skip measurement for non-visual edits (wiring, data, handlers). Bash calls time out at 2 minutes: run long multi-viewport or `--routes` checks in the background and read the result when it finishes. Inside compound-engineering's ce-polish or ce-test-browser, use ui-check for the measurement step.

Before any UI edit, read [reference/craft-floor.md](reference/craft-floor.md) once: the quality floor and the stock patterns to avoid.

## Commands

| Argument | Use when | Playbook |
|---|---|---|
| `critique [target]` | "what's wrong with this", "review it", before a release | [critique.md](reference/critique.md) |
| `polish [target]` | final pass before shipping | [polish.md](reference/polish.md) |
| `layout [target]` | spacing, alignment, grouping, cramped or empty | [layout.md](reference/layout.md) |
| `type [target]` | hard to read, fonts look weird, flat hierarchy | [typography.md](reference/typography.md) |
| `color [target]` | contrast, clashing, washed out, dark mode | [color.md](reference/color.md) |
| `quieter` / `bolder` `[target]` | too busy or loud / boring or flat | [tone.md](reference/tone.md) |
| `clarify [target]` | labels, errors, empty states, "confusing" | [clarify.md](reference/clarify.md) |
| `responsive [target]` | phone or tablet problems, sideways scroll | [responsive.md](reference/responsive.md) |
| `harden [target]` | loading, empty, error, long data, first run | [harden.md](reference/harden.md) |
| `match <reference-url> [target]` | rebuild or port must look like the original | [match.md](reference/match.md) |
| `setup` | no DESIGN.md or tokens yet; add guardrails | [setup.md](reference/setup.md) |

No argument: run the loop above with the vocabulary table. Surface type and audience change the bar: dashboards and admin screens (most Fornida work) favour scanability and consistency over expression; client marketing pages earn more expression. See [modes.md](reference/modes.md). General web UX rules by topic: [ux-guidelines.md](reference/ux-guidelines.md).

## Project context

- **DESIGN.md** at the repo root holds the tokens: spacing scale, type scale, palette roles, radii, shadows, and the mode per surface. Read it first when it exists. When it does not, follow `setup` before a larger redesign; a small fix may proceed on the existing values.
- In a rebuild (v2 of an existing app), the old app is the reference: always use `match`.

## Requirements and safety

- Node 22+ LTS, Playwright, and an installed Chrome or Edge. If ui-check reports Playwright missing, tell the human it is a new tool and ask first, then install it once per user: `npm i -g playwright-core@1.64.1` (pinned; drives the installed Chrome or Edge; no browser download, no change to the client repo).
- Point ui-check at local or dev/test environments only. Never at production with real client data. Screenshots and reports go to a temp folder by default; if `--out` is inside the repo, git-ignore it. Never commit them, or a storage-state file.
- Exit codes: 0 clean, 2 findings, 1 tool error. A tool error is not a clean result: report it. If ui-check cannot run at all, say "unmeasured" and follow "When ui-check cannot run" in ui-check.md.
