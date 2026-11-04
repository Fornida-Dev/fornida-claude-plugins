# ui-check reference

    node "<skill-dir>/scripts/ui-check.mjs" <url-or-html-file> [more targets] [options]

Run from the user's project directory (Playwright is resolved from there first, then globally).

## Options

| Flag | Meaning |
|---|---|
| `--viewports desktop,mobile` | default. Names: desktop 1440x900, laptop 1280x800, tablet 834x1112, mobile 390x844, or `WxH` |
| `--scheme light\|dark` | emulate the color scheme |
| `--scope "<css>"` | only check inside one region |
| `--compare <reference-url>` | parity mode against a reference build (one target only) |
| `--inventory` | list design values in use with counts |
| `--base 4` | spacing base unit for `off-scale` |
| `--wait <ms>`, `--wait-for "<css>"` | wait for late content |
| `--max 25` | findings shown per severity; `--json` for everything |
| `--out <dir>` | where screenshots, diff images and the JSON report go (default: a temp folder) |
| `--no-axe` | skip the accessibility engine |

Exit 0 clean, 2 findings, 1 tool error. `info` findings do not fail the run.

## Rules

| Rule | Severity | Meaning |
|---|---|---|
| `overflow-x` | error | page or element wider than the viewport |
| `broken-image` | error | image failed to load |
| `overlap` | warning | in-flow siblings overlap |
| `truncation` | warning (info if ellipsis/clamp) | content clipped by overflow hidden |
| `spacing-outlier` | warning | one gap in a row/column of similar siblings differs |
| `off-scale` | warning | padding/margin/gap not on the base scale (half steps allowed up to 4x base), grouped by value |
| `tap-target` | warning (<24px) / info (<44px on mobile) | small clickable area; inline text links exempt |
| `text-size` | warning | text under 12px |
| `line-length` | warning | long text over ~95 characters per line |
| `line-height` | warning | multi-line body text under 1.3 |
| `near-duplicate` | warning | text/background/border colors, font sizes, spacing or radii that are almost equal |
| `too-many` | warning | more font sizes (9), families (3), text colors (10), radii (5), shadows (5) or spacing values (14) than a coherent system |
| `focus-invisible` | warning | keyboard focus causes no visible change |
| `stretched-image` | warning | rendered aspect ratio differs from the image's |
| `console-error`, `failed-request` | warning/error | script errors, 4xx/5xx, failed assets |
| `gradient-text`, `accent-border`, `nested-card` | info | stock generic-design patterns |
| `a11y/<axe-rule>` | by impact | axe-core findings; `a11y/color-contrast` prints both colors and the ratio |

Parity mode sections: `[parity/style]`, `[parity/values]`, `[parity/missing]`, `[parity/extra]`, `[parity/geometry]`, `[parity/region]` (see match.md).

## Reading the output

Each finding gives a selector, a text snippet (search the source for it), the measured numbers and a fix hint. Identical findings are collapsed ("same on N more"). Selectors are best-effort: confirm the element in source before editing.
