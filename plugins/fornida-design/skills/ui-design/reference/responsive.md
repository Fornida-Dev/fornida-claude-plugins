<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Responsive: breakpoints, reflow, touch, zoom

## When to use

"Broken on my phone", "looks weird on the iPad", "have to scroll sideways", "buttons too small", "text cut off", "squished", "the table doesn't fit", "make it work on mobile". Web only, including mobile web; native iOS/Android apps need platform guidelines instead.

Adapting is rethinking for the context, not shrinking pixels. Operate apps are mostly used at a desk, but techs check them on phones in the field: the 2-3 tasks they do there must work fully on mobile.

## Measure

```
node "<skill-dir>/scripts/ui-check.mjs" <url> --viewports desktop,tablet,mobile --out <scratch>/responsive
```

Add `--viewports 320x640` for the smallest phones and `1920x1080` if wide screens matter. Use `--wait-for "<selector>"` when data loads late, or the empty layout will pass. Three viewports take a while: run the check in the background.

Rules that matter here:
- `overflow-x`: page or element wider than the viewport. Always P0 on mobile.
- `tap-target`: under 24x24 warns unless it meets the WCAG 2.5.8 spacing exception (then info). 44x44 is advisory on touch (viewports 480px wide or less); treat it as required for primary actions.
- `truncation`: content clipped by `overflow: hidden`. Intentional ellipsis is marked; the rest is lost content.
- `overlap`: siblings colliding after reflow.
- `text-size`: text under 12px. Use 16px body on mobile; inputs under 16px make iOS zoom in.
- `line-length`: text over 120 characters running over ~95 characters per line on desktop means a missing max-width.

## Diagnose

For each finding, note the viewport where it first appears and the selector. Group by cause:
- Fixed widths (`width: 600px`, `min-width` on a flex child) causing `overflow-x`.
- Flex/grid children without `min-width: 0`, so long strings push the container.
- Wide tables and code blocks with no scroll container.
- Desktop nav or toolbars with too many items for the width.
- Hover-only actions (row actions revealed on hover) that touch users cannot reach.

Find the content breakpoint: narrow the viewport until the layout breaks, and put the breakpoint there.

## Fix

Fix layout primitives and tokens first (container, grid, spacing scale in DESIGN.md), then components.

**Breakpoints and layout**
- Mobile-first: base styles for narrow, `min-width` queries add complexity. Three breakpoints usually suffice: 640, 768, 1024px, or where content breaks.
- Persuade surfaces only: `clamp()` for display type and section spacing, e.g. `font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)`. Operate surfaces keep fixed rem steps (modes.md).
- Use container queries for components that live in panels of varying width (cards, KPI tiles).
- Cap reading width: `max-width: 70ch` for text, `max-width` on the app shell so it does not stretch across 4K.

**Reflow patterns**
- Mobile: single column, full-width controls, primary action reachable at the bottom.
- Tablet: two columns or list + detail; side panel instead of a third column.
- Desktop: persistent side nav, multi-panel views, dense tables.
- Navigation: drawer on mobile, compact on tablet, full labels on desktop. Same information architecture at every size.
- Tables: wrap in a container with `overflow-x: auto` and a sticky first column, or switch rows to stacked cards under 640px. Never let a table widen the page.
- Long strings (emails, hostnames, GUIDs): `overflow-wrap: anywhere` or a marked ellipsis with the full value in a title or tooltip.

**Touch**
- Primary targets 44x44px on mobile; at least 8px between adjacent targets. Pad the hit area rather than the icon.
- Use `@media (pointer: coarse)` for bigger targets and `@media (hover: hover)` for hover effects. Never put a function behind hover only; show row actions or a menu button on touch.
- Respect safe areas on fixed bars: `padding-bottom: max(1rem, env(safe-area-inset-bottom))` with `viewport-fit=cover`.

**Zoom and media**
- Text must survive 200% zoom: use rem units, no fixed heights on text containers.
- Never set `maximum-scale=1` or `user-scalable=no`.
- Responsive images with `srcset` and `sizes`; `<picture>` only when the crop must change.

## Do not

- Hide core functionality on mobile. If a field tech needs it, make it work.
- Use different terminology or navigation structure per device.
- Rely on `display: none` to fix overflow; it hides the symptom.

## Verify

Re-run the same command. Done when `overflow-x`, `overlap` and `tap-target` (24px) are clean at every viewport, primary actions meet 44px on mobile, any remaining `truncation` is intentional ellipsis with the full value reachable, and the `--out` screenshots show a sensible layout at each size for the user to confirm. Emulated viewports verify layout, not real touch gestures or Safari; say which you did not test. Cap at 3 fix-and-recheck cycles; report what remains.
