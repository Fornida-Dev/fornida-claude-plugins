<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Color

Color encodes hierarchy, action, state, and atmosphere. Keep confirmed brand colors and semantic conventions; do not swap the identity while "fixing colors". Needs the brand colors: read DESIGN.md, and ask once only if a binding brand choice cannot be inferred.

## When to use

"Colors look off", "too colorful", "too gray", "dull", "doesn't match the brand", "hard to read", "can't tell what's clickable", "dark mode looks bad".

## Measure

    node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory
    node "<skill-dir>/scripts/ui-check.mjs" <url> --out <dir>
    node "<skill-dir>/scripts/ui-check.mjs" <url> --scheme dark --out <dir>

`--scheme dark` only emulates `prefers-color-scheme`. A class-based theme (`.dark`, next-themes) needs `--steps` with `addClass` or `localStorage` instead.

Rules that matter: `a11y/color-contrast`, `a11y/color-contrast-unverified`, `near-duplicate` and `too-many` (colors), `focus-invisible`, `gradient-text`, `accent-border`. The inventory gives every text, background, and border color with usage counts. For "doesn't match", run `--compare <reference-url>` as a separate run and read `[parity/style]` (match.md).

## Diagnose

- Which colors are brand commitments (DESIGN.md, logo) and which are drift? Near-duplicates (#333 and #343434) are drift.
- Map each inventory color to a role below. Colors with no role are candidates to remove.
- Is the accent spent on decoration, so the primary action no longer stands out?
- Where does grayscale hide state or hierarchy?
- Is any meaning carried by color alone (red/green status with no text or icon)?
- Which contrast failures share one token? Fix the token once.

## Fix

**Palette roles.** Define these as semantic tokens in DESIGN.md; components use roles, never raw hex.

| Role | Tokens |
|---|---|
| Surfaces | canvas, raised (cards, panels), sunken (inputs, wells), shell (sidebar, toolbar) |
| Text | primary, secondary, disabled, on-accent |
| Interactive | accent, accent-hover, focus ring, selection |
| Lines | border, divider |
| Status | success, warning, error, info, each with a text and a subtle-background variant |
| Data | categorical series, sequential scale when charts exist |

**Dosage.** Operate is restrained: neutrals plus one accent for primary action, current selection, and focus. A single surface may go bolder when one color carries meaning. Persuade may let the brand own large regions; the primary action must still be the most findable element.

**Contrast (WCAG AA), measured, not eyeballed:**

| Content | Minimum |
|---|---|
| Body and placeholder text | 4.5:1 |
| Large text (≥24px, or ≥18.66px bold) | 3:1 |
| UI components: icons, control borders, focus indicators | 3:1 |

Check every state and both themes. Hover, disabled, selected and error states are only measured when `--steps` puts the page in that state (`hover`, `click`, `focus`). Text over images or gradients shows as `a11y/color-contrast-unverified`: check it by hand against the lightest and darkest area behind the text, and say so. Disabled text is exempt but should still be legible.

**Secondary text on colored surfaces.** Never use generic gray on a colored or tinted surface; it reads muddy and often fails contrast. Derive it from the surface hue (same hue, lower chroma, shifted lightness) or use the foreground color at reduced lightness, then measure it at ≥4.5:1.

**Building ramps.** Prefer OKLCH for new palettes: step lightness evenly and reduce chroma near white and black. Neutrals may carry a slight brand tint, or stay true gray. Use solid colors, not stacked translucent overlays, for anything behind text, so contrast does not depend on context.

**Meaning beyond color.** Status pairs color with a label or icon. Charts add labels, shape, or pattern. Links in prose are underlined.

**Dark mode.** Design it; do not invert.
- Canvas near-black (for example #121212 to #1a1a1a), not #000. Text near-white (about 87–92% lightness), not #fff.
- Elevation goes lighter: each raised layer is a step lighter. Shadows barely show on dark.
- Lower accent chroma and raise its lightness so it does not vibrate; re-check 4.5:1.
- Remap the same semantic tokens; components should not change.
- Re-check status colors; a green that passes on white often fails on dark.

**Avoid:** gradient text, colored side borders as decoration, full-saturation color on inactive elements.

## Verify

Re-run all three commands. Done = `a11y/color-contrast` is clean in light and dark, color `near-duplicate` and `too-many` are clean or explained, and every inventory color maps to a role. Stop after 3 fix and recheck cycles and report. Give the human the light and dark screenshots to confirm the palette feels right.
