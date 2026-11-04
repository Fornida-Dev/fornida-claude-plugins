<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Layout

Layout turns priority into reading order, grouping, rhythm, and usable space. Diagnose the structure before moving boxes. Keep the existing visual identity; this playbook changes structure inside it.

## When to use

"Cluttered", "cramped", "too much white space", "nothing lines up", "feels off", "hard to scan", "everything looks the same", "broken on mobile", "doesn't match the other page".

## Measure

    node "<skill-dir>/scripts/ui-check.mjs" <url> --viewports desktop,laptop,tablet,mobile --out <dir>
    node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory
    node "<skill-dir>/scripts/ui-check.mjs" <url> --compare <reference-url>   # for "doesn't match"

Use `--scope "<selector>"` to focus on one region. Use `--base 8` only if DESIGN.md defines an 8px base.

Rules that matter: `spacing-outlier`, `off-scale`, `near-duplicate` and `too-many` (spacing values), `overflow-x`, `overlap`, `truncation`, `tap-target`, `nested-card`, and in the separate compare run `[parity/geometry]`, `[parity/missing]`, `[parity/extra]`, `[parity/crops]` (`[parity/region]` is a hint only).

## Diagnose

Answer each from numbers or source, not from a screenshot:

- **Reading order:** what is the primary element, the secondary, and the major groups? Does DOM order match visual order?
- **Grouping:** are related items closer to each other than to unrelated items? Or are borders and cards doing the work proximity should?
- **Rhythm:** how many distinct spacing values does the inventory show? One value everywhere means no rhythm; a dozen values means no system.
- **Structure:** are repeated cards or columns really equivalent content, or a framework default?
- **Density:** does information per region fit how often it is used? Operate can be dense; Persuade needs air.
- **Adaptation:** what reflows, collapses, or scrolls at each viewport? Which element causes `overflow-x`?
- **Extremes:** long names, empty lists, 100+ rows, sticky headers, open dropdowns.

## Fix

Prefer token and container fixes over per-element patches.

- **One spacing scale** in DESIGN.md on a 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Replace off-scale values with the nearest step. Merge near-duplicates (14 and 16 become 16).
- **Proximity first.** Inside a group: 4–12px. Between groups: 24–48px. Between page sections: 48–96px. The step between levels should be visible, roughly 2x.
- **Headings:** space above at least 1.5–2x the space below, so the heading binds to its content.
- **Use `gap`** on flex and grid parents for sibling spacing instead of margins on children. This removes most `spacing-outlier` findings at once.
- **Fewer containers.** Remove a card when spacing alone groups the content. Never nest cards; use a divider or background tint inside.
- **Alignment:** pick one content edge and one grid (12 columns or a fixed sidebar plus fluid main). Align labels, inputs, and table columns to it.
- **Width:** cap prose at 65–75ch; let tables and dashboards use full width.
- **Responsive is structural:** collapse the sidebar, stack columns, move secondary panels below. Wide tables scroll inside their own container (`overflow-x: auto` on the wrapper), not the page.
- **Overflow:** fix `overflow-x` at the cause (fixed widths, long unbroken strings, `100vw` with a scrollbar). Use `min-width: 0` on flex and grid children; `overflow-wrap: anywhere` for IDs and URLs.
- **Overlap:** remove negative margins and absolute positioning used for layout; use grid areas.
- **Truncation:** ellipsis is fine for single-line table cells with the full value in a `title` or tooltip. Clipped multi-line text is a bug.
- **Targets:** keep 24x24 minimum hit area (44x44 on touch) with padding, even if the icon is 16px.
- **Overlays** escape clipping containers: `<dialog>`, popover API, `position: fixed`, or a portal.
- **Depth** only to show layering or state, not to decorate.

## Verify

Re-run the same commands. Done = the named rules are clean at every viewport, or each remaining finding is explained (intended ellipsis, intended table scroll). In compare mode, list each remaining parity difference as intended or fixed. Stop after 3 fix and recheck cycles and report what remains. Give the human the `--out` screenshots to confirm the result reads in the right order.
