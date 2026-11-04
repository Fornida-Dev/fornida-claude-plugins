<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Craft floor

The minimum every UI change meets, in every mode. It sets no visual direction; DESIGN.md and the mode do that. Read it before any UI edit. Apply it without announcing the checklist.

## When to use

Before editing UI, and as the last gate on "is it done?", "looks unfinished", "looks generic", "looks like a template".

## Measure

    node "<skill-dir>/scripts/ui-check.mjs" <url> --out <dir>

Add `--scheme dark` if the app ships dark mode and `--scope "<selector>"` to limit to the changed region.

## Diagnose: floor checks

| Check | Threshold | Rule |
|---|---|---|
| Contrast | body and placeholder ≥4.5:1; large text (≥24px, or ≥18.66px bold) and UI components (icons, control borders, focus indicators) ≥3:1 | a11y/color-contrast |
| Text size | body ≥14px Operate, ≥16px Read and Persuade; nothing under 12px | text-size |
| Leading | multi-line body 1.4–1.6 | line-height |
| Measure | prose 65–75ch (the rule flags text over 120 characters at over ~95 characters per line) | line-length |
| Spacing | every padding, margin, gap on the 4px scale; sibling gaps consistent | off-scale, spacing-outlier |
| System drift | no near-identical colors, sizes, radii; 5–8 font sizes | near-duplicate, too-many |
| Fit | no horizontal scroll, overlap, or unintended clipping at desktop and mobile | overflow-x, overlap, truncation |
| Targets | ≥24x24 (or the WCAG 2.5.8 spacing exception); 44x44 on touch | tap-target |
| Focus | keyboard focus visibly changes every focusable element (the rule detects any change; aim for a clear ring) | focus-invisible, focus-limit |
| Media | no broken or distorted images | broken-image, stretched-image |
| Runtime | no console errors or failed requests | console-error, failed-request |
| Semantics | names, labels, roles | a11y/* |

Not measured; check in source and say how you checked:

- **Hierarchy space:** more space above a heading than below it. Check the heading margins or spacing classes in source; no rule measures this.
- **States:** default, hover, focus, active, disabled, loading, error, empty. To measure one, reach it with `--steps`.
- **Depth:** shadows have a y-offset and soft blur. No zero-offset colored glow.
- **Copy:** buttons name the action; errors name the problem and the fix.
- **Browser surfaces:** selection color, focus ring, link underline offset, and `font-variant-numeric: tabular-nums` in numeric columns all come from the palette, not browser defaults.
- **Motion:** conveys state only; 150–250ms ease-out in Operate; honors `prefers-reduced-motion`.

## Fix: refuse list

Generic defaults. Do not use them unless DESIGN.md or the request explicitly asks.

- Gradient text (gradient-text). Emphasis comes from weight or size.
- A colored `border-left` or `border-right` over 1px on cards, alerts, list items (accent-border).
- Cards inside cards (nested-card). Use spacing or a divider for inner grouping.
- A grid of identical icon + heading + text cards as the page structure.
- A big-number tile with no unit, period, or comparison. A number that matters shows its trend or target.
- An eyebrow or kicker label above a heading.
- Section numbers (01 / 02 / 03) unless the order carries meaning.
- A modal for a task that needs no interruption. Prefer inline or a side panel.
- Glass and blur as decoration; hard offset shadows (`4px 4px 0`).
- Monospace as a "technical" look. Mono is for code, IDs, and aligned data.
- Emoji or unicode glyphs as icons. One icon library, one stroke weight.
- Dark or light chosen by category. Choose from where and when it is used.

Fix at the source: a token, a shared component, or a container rule, not per-element overrides.

## Verify

Re-run the same command. Done = every rule above is clean, or each remaining finding is listed with its reason (for example, an intended ellipsis). Stop after 3 fix and recheck cycles and report what remains. Give the human the screenshots from `--out` to confirm taste; do not judge taste from screenshots yourself.
