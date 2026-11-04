<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Typography

Type carries information, hierarchy, and voice. Improve it inside the existing identity; keep the families DESIGN.md names unless the user asked for a new look.

## When to use

"Text looks off", "hard to read", "too small", "headings don't stand out", "everything looks the same", "too many fonts", "looks cramped", "fonts don't match".

## Measure

    node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory
    node "<skill-dir>/scripts/ui-check.mjs" <url> --viewports desktop,mobile --out <dir>

The inventory lists families, sizes, weights, and line-heights in use with counts. Rules that matter: `text-size`, `line-height`, `line-length`, `near-duplicate` and `too-many` (font sizes), `truncation`, `overflow-x`, `a11y/color-contrast`. For "doesn't match", run `--compare <reference-url>` as a separate run and read `[parity/style]` (match.md).

## Diagnose

Answer each with a selector, file, or measured value:

- **Families:** how many? Is each one doing a job no other can? More than 2 is almost always drift.
- **Roles:** can heading, body, label, metadata, and data be told apart by size, weight, or color? Which adjacent sizes are too close to mean different things (15 vs 16px)?
- **Scale:** is there a ratio, or a pile of one-off values? Does the same role use the same size on every screen?
- **Reading:** body size, line-height, and measure against the numbers below.
- **Stress:** long headings, translated or long labels, 200% zoom, narrow containers, missing font weights.
- **Delivery:** are unused weights loaded? Does text flash invisible or reflow on load?

## Fix

Define roles as tokens in DESIGN.md and fix the tokens, not individual elements.

- **Scale.** Operate: ratio 1.125–1.2, fixed rem, 5–8 sizes (ui-check flags more than 8), for example 12 / 14 / 16 / 18 / 20 / 24. Persuade: ratio 1.25–1.333, display may use `clamp()`, max 6rem. Merge near-duplicate sizes to the nearest step.
- **Body.** 16px for reading surfaces; 14–16px for Operate UI and tables; nothing under 12px, and 12px only for metadata.
- **Line-height.** Body 1.4–1.6 (1.4 for dense UI, 1.6 for long reading). Headings 1.1–1.25. Wider lines need more leading.
- **Measure.** Prose 65–75ch via `max-width: 70ch` on the text container. Tables and compact UI may run wider.
- **Weights.** Usually 400, 500 or 600, and 700. Hierarchy uses size, weight, and color together; size alone needs big jumps.
- **Families.** One sans for Operate. Persuade may pair one display face with one text face. Mono only for code, IDs, and aligned figures.
- **Tracking.** Leave body at 0. Large display may tighten, never below -0.04em. All-caps labels get +0.05 to +0.1em.
- **Light text on dark.** Add about 0.05 to line-height, a little tracking, and one weight step if strokes look thin.
- **Numbers.** `font-variant-numeric: tabular-nums` in tables, counters, and anything that updates.
- **Line breaks.** `text-wrap: balance` on headings and short centered text; `text-wrap: pretty` on body. Break headings by hand only between phrases, and check the break at every viewport.
- **Paragraphs.** Use paragraph spacing (about 0.75–1em) or first-line indent, not both.
- **Loading.** Load only used weights, `font-display: swap`, a metric-matched fallback stack, and preload the body face.
- **Zoom.** Size in rem. Never block user font scaling.

Do not add a second family without a job only it can do, and do not make type decorative at the cost of reading.

## Verify

Re-run both commands. Done = `text-size`, `line-height`, `line-length`, and font-size `near-duplicate` and `too-many` are clean, or each remaining finding is explained (for example, a data table intentionally over ~95 characters per line). The inventory should show the token scale and nothing else. Stop after 3 fix and recheck cycles and report. Give the human the `--out` screenshots to confirm the hierarchy reads right.
