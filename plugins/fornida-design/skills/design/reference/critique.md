<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Critique

Use when the user asks "what's wrong with this", "review the design", "it looks off", or before a release. Output is a ranked fix list, each item tied to a ui-check rule that proves it fixed.

## Rules

- Run two assessments as two isolated sub-agents, in parallel. A must never see B's output; measurements anchor judgment.
- If no sub-agent tool exists, run A fully, record it, then run B. Start the report with `DEGRADED: single-context (<reason>)`.
- Skipping B is a failed critique unless ui-check crashes after a real attempt; say so in the report.
- Resolve the target to one URL or HTML file. Start the dev server in the background if needed and stop it before you report.
- Read DESIGN.md (tokens) first if it exists; pass its path to both sub-agents.

## Assessment A: design review (sub-agent)

Read the relevant source files and look at the rendered page (screenshot or browser). Return:

1. **Nielsen heuristics, 0-4 each**: 0 = absent/broken, 1 = mostly failing, 2 = partial with major gaps, 3 = good with minor gaps, 4 = excellent, nothing to add. Most real interfaces total 20-32/40. On Persuade pages, 7 and 10 may be `n/a`; total out of 4 x scored count.
   1 System status (loading, save confirmations, active nav) · 2 Real-world language (no jargon) · 3 User control (cancel, undo, clear filters, Esc) · 4 Consistency (same action, same look and word) · 5 Error prevention (confirm destructive, constrained inputs) · 6 Recognition over recall (visible options, labeled icons) · 7 Efficiency (keyboard, bulk actions) · 8 Minimalist design (nothing competes with the main task) · 9 Error recovery (says what failed and how to fix, keeps input) · 10 Help (inline hints at decision points)
2. **Cognitive load**: count failures of: single focus; groups of 4 or fewer; related items grouped; obvious hierarchy; one decision at a time; 4 or fewer visible options per decision; no remembering across screens; progressive disclosure. 0-1 fails = low, 2-3 = moderate, 4+ = high. List every decision point with more than 4 visible options.
3. **Specificity**: could an unrelated product use this layout unchanged? One line.
4. **2-3 strengths, 3-5 priority issues** naming exact elements. For Operate screens also walk the primary task as a power user (keyboard, bulk, speed) and as a keyboard-only user.

## Assessment B: measurement (separate sub-agent)

```
node "<skill-dir>/scripts/ui-check.mjs" <url> --viewports desktop,mobile --out <scratch>/critique
node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory
```

Add `--scheme dark` if the app supports dark mode, and `--scope "<selector>"` if the user named one region. Return counts per rule, each finding's selector, source snippet and measured numbers, the inventory (distinct font sizes, colors, radii, spacing values, near-duplicates), and any findings it judges false positives with the reason. Exit 1 = tool error: report it, do not treat it as clean.

## Synthesis (parent, after both return)

Do not concatenate. Map each A issue to B evidence:

- **Agreed**: A flagged it and a rule measured it. Highest confidence.
- **Measurement only**: rule findings A missed (contrast, off-scale spacing, near-duplicate colors, tap targets). Review is weak at these; trust the numbers.
- **Review only**: judgment issues no rule covers (wrong hierarchy, confusing flow, unclear copy). Keep them, but state the verify step as a re-screenshot or a specific check.
- **False positives**: rule hits that are intentional (marked ellipsis, decorative overlap). Name them so nobody "fixes" them.

Severity: **P0** blocks the task (overflow hiding a control, contrast failure on primary text, broken flow). **P1** causes real difficulty; a user would ask for help. **P2** annoyance with a workaround. **P3** polish. A rule with 20+ hits on drift (off-scale, near-duplicate, too-many) is usually one token fix, rank it by impact not count.

## Report

```
Method: dual-agent (A: <id> / B: <id>)
Heuristics: <table, total N/max, band: 90%+ excellent, 70%+ good, 50%+ acceptable, 30%+ poor, else critical>
Cognitive load: <low/moderate/high, failed items>
Measured: <rule: count> ... ; inventory: <N font sizes, N colors, N radii>
What works: <2-3 lines>

Fix list
[P0] <problem> - <element/selector>
     Change: <concrete edit: token, value, file>
     Proves fixed: <ui-check rule> clean at <viewport>   (or: re-screenshot shows X)
[P1] ...
False positives: <rule + selector + why>
```

Concrete changes only: "raise `--text-muted` from #9CA3AF to #6B7280 (contrast 2.8 -> 4.8)", not "improve contrast". Group findings that share a root cause under one fix. Point each fix at its playbook: tone.md (busy/bland), clarify.md (copy), responsive.md (mobile), harden.md (states), and layout.md, typography.md or color.md where the root cause sits there.

Screenshots are for the human to confirm taste, not for you to grade. Attach the `--out` folder path.

## Close

Write the whole report first. The last thing in the message is one question, with options built from the findings, for example: "Which should I fix: P0 only, P0+P1 (N items), or everything?" Nothing follows the question.

After fixes, re-run B's commands. An item is done when its rule is clean or the remaining finding is explained. Stop after 3 fix-and-recheck cycles and report what is left.
