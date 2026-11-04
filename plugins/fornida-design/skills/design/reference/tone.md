<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Tone: quieter, distill, bolder

## When to use

- **Quieter / distill**: "too busy", "cluttered", "loud", "noisy", "overwhelming", "too much going on", "hard to find anything", "screams at me".
- **Bolder**: "boring", "flat", "bland", "generic", "plain", "looks like a template", "nothing stands out".

Both are hierarchy problems. Busy = too many things at full strength. Bland = nothing at full strength. Ask which region if the user did not say; scope is the named area only.

Mode matters. Operate (dashboards, admin): quieter means the tool disappears into the task; bolder means one clear primary per screen, not decoration. Persuade (marketing): quieter means more air and a tighter palette; bolder means one decisive moment per section.

## Measure

```
node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory
node "<skill-dir>/scripts/ui-check.mjs" <url> --viewports desktop,mobile --scope "<region selector>"
```

Read the inventory as the noise budget. Targets for a coherent system:

| Measure | Busy if | Bland if |
|---|---|---|
| Distinct font sizes | > 6 | <= 3 with steps under 1.2x |
| Font weights | > 3 | 1 |
| Non-neutral colors | > 2 accents + status | 0 accents used |
| Radii | > 3 | n/a |
| Shadows | > 2 levels | n/a |
| Spacing values off the base | any | n/a |

Rules that confirm busy: `too-many`, `near-duplicate`, `spacing-outlier`, `off-scale`, `nested-card`, `gradient-text`, `accent-border`. Bland rarely trips a rule; the evidence is the inventory (sizes bunched together, one weight, accent unused) plus the screenshot.

## Diagnose

Busy, find the sources:
- Color: count saturated hues on screen. Status colors used as decoration count too.
- Weight: count elements at 600+ weight or larger than body. More than one per region is competition.
- Containers: cards in cards, borders plus shadows plus background on the same box.
- Decoration: gradients, glows, icons beside every label, badges on everything.
- Content: repeated info, more than 1 primary and 2 secondary actions in view, intros that restate the heading.

Bland, find what is missing:
- No size jump: largest heading under 1.5x body.
- One weight everywhere.
- Accent color defined in DESIGN.md but never applied, or applied to everything equally.
- Even spacing everywhere, so nothing groups.

## Fix

Start at tokens and containers in DESIGN.md and the shared CSS, then components. One token change beats 30 local overrides.

**Quieter**
- Collapse the type scale to 4-5 sizes, 2-3 weights. Drop 700 to 600 or 500 outside the page title.
- Accent to 10% of the surface: primary action, active nav, key figures. Everything else neutral.
- Desaturate accents to 70-85% saturation. Merge near-duplicate colors to one token.
- Pick one container signal per box: border or shadow or tinted background, not all three. Remove nested cards; use spacing.
- Remove gradient text, side accent borders, decorative icons, glows.
- Snap spacing to the base scale; group with larger gaps between groups (e.g. 8 inside, 24 between).
- Motion: keep functional transitions under 200ms, remove decorative ones.

**Distill** (when quieter is not enough)
- One primary action per view. Move the rest into a menu or row actions.
- Hide rare options behind "More" or a details panel. Max 4 visible choices per decision.
- Delete text the heading already says. Delete duplicate data shown twice.
- Remove a sidebar or column if its content fits inline.

**Bolder**
- Increase the scale ratio: page title 1.6-2x body, section headings 1.25-1.4x. Use 600-700 weight for the top level only.
- Apply the existing accent decisively to the one primary element per region.
- Use spacing contrast: tighter inside groups, more air between them.
- Lift key numbers (KPIs) to 1.5-2x size with a muted label beneath.
- Bring the section up to what its strongest neighbor already does; reuse the system, do not invent new fonts, colors or radii. If the system cannot express it, ask before adding a token.
- Make one decisive move, then quiet the area around it. If everything got louder, it got flatter.

## Do not touch

- Contrast: never drop text below 4.5:1 (3:1 for large text) while softening. `a11y/color-contrast` must stay clean.
- Function: affordances, focus styles, error and status colors keep their meaning.
- Hierarchy: quieter is not uniform. Keep 1 anchor per region.
- Content claims and data: do not remove information a user needs to decide.
- Anything outside the named scope, and DESIGN.md tokens other screens rely on, without saying which screens change.

## Verify

Re-run both commands. Done when: the inventory is within the targets above (or the excess is explained), the busy rules are clean in scope, `a11y/color-contrast` and `focus-invisible` are clean, and no new `overflow-x` or `truncation` appeared. Then show before/after screenshots from `--out` for the user to confirm the feel. Cap at 3 fix-and-recheck cycles; report what remains.
