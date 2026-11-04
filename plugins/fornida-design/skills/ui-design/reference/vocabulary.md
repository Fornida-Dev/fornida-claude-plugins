# Vocabulary: vague feedback to measurable causes

"It looks off" is a real signal, but it names a feeling, not a cause. Do not fix from a screenshot impression: turn the words into hypotheses ui-check can confirm or rule out, then fix what the numbers show.

Run: `node "<skill-dir>/scripts/ui-check.mjs" <url>` (add `--inventory` for the design values in use, `--viewports mobile` or `--scheme dark` when the complaint points there). When a reference exists, `--compare <ref-url>` is a separate run.

## Phrase table

Causes ranked most to least likely. Evidence = rules or flags that confirm or rule out each cause.

| They say | Likely causes (ranked) | Evidence | Open |
|---|---|---|---|
| "Looks off", "something's not right" | 1 spacing drift; 2 misalignment; 3 too many sizes/colors; 4 weak hierarchy | `spacing-outlier`, `off-scale`, `near-duplicate`, `too-many`, `--inventory` | critique.md, then the area that fails |
| "Cluttered", "too busy" | 1 too many competing weights/colors; 2 no grouping (equal gaps everywhere); 3 nested boxes; 4 every item emphasized | `too-many`, `nested-card`, `spacing-outlier`, `--inventory` weights/colors | layout.md, typography.md |
| "Overwhelming" | 1 too much shown at once; 2 no clear primary action; 3 labels too long | count primary buttons and sections; `--inventory` colors | clarify.md, layout.md |
| "Cramped" | 1 padding/gap too small; 2 line-height too tight; 3 tap targets packed | `off-scale`, `line-height`, `tap-target`, `--inventory` spacing | layout.md |
| "Too much white space", "feels empty" | 1 gaps not tied to grouping (all large); 2 content too narrow for the screen; 3 oversized type scale | `--inventory` spacing, `--viewports desktop,laptop` | layout.md |
| "Feels cheap", "looks amateur" | 1 off-scale spacing and drifted values; 2 default or mixed fonts; 3 low-contrast text; 4 generic tells | `off-scale`, `near-duplicate`, `too-many`, `a11y/color-contrast`, `gradient-text`, `accent-border` | craft-floor.md, polish.md |
| "Boring", "flat" | 1 headings too close to body size/weight; 2 one color doing everything; 3 no surface separation | `--inventory` type scale, weights, backgrounds, shadows | typography.md, color.md, tone.md |
| "Doesn't pop" | 1 primary action not distinct from secondary; 2 accent overused so nothing stands out; 3 weak contrast | `--inventory` accent usage counts, `a11y/color-contrast` | color.md, typography.md |
| "Hard to read" | 1 text too small; 2 lines too long; 3 line-height tight; 4 low contrast | `text-size`, `line-length`, `line-height`, `a11y/color-contrast` | typography.md |
| "Messy" | 1 uneven gaps; 2 off-grid values; 3 mixed radii/shadows; 4 overlap | `spacing-outlier`, `off-scale`, `near-duplicate` (radii), `overlap` | layout.md, polish.md |
| "Unbalanced", "lopsided" | 1 one column much heavier; 2 uneven side padding; 3 a stray outlier gap | `spacing-outlier`, `--inventory` spacing, each finding's `box` in `--json` | layout.md |
| "Not aligned", "doesn't line up" | 1 different left edges or padding; 2 mixed gaps in a row; 3 icon/text baseline offset | `spacing-outlier`, `off-scale`, `box` in `--json` | layout.md, polish.md |
| "Inconsistent" | 1 near-duplicate colors/sizes/radii; 2 different button styles; 3 page-to-page drift | `near-duplicate`, `too-many`, `--inventory` on two pages | polish.md, craft-floor.md |
| "Too dark" | 1 near-black surfaces with low contrast; 2 heavy shadows; 3 wrong scheme served | `a11y/color-contrast`, `--inventory` backgrounds, `--scheme light` | color.md, modes.md |
| "Washed out", "faded" | 1 gray-on-gray text; 2 desaturated accent; 3 thin weights | `a11y/color-contrast`, `--inventory` text colors and weights | color.md, typography.md |
| "Dark mode looks bad" | 1 colors not redefined for dark; 2 contrast fails in dark; 3 hard-coded white/black | `--scheme dark` (prefers-color-scheme) or `--steps` with `addClass`/`localStorage` for class-based themes, then `a11y/color-contrast`, `--inventory` | color.md, modes.md |
| "Colors clash" | 1 too many hues; 2 near-duplicate tints; 3 status colors reused as decoration | `too-many` colors, `near-duplicate` colors, `--inventory` | color.md |
| "Fonts look weird" | 1 more than two families; 2 fallback font showing (load failed); 3 too many sizes/weights; 4 letter-spacing off | `--inventory` families, `failed-request`, `too-many` sizes | typography.md |
| "Can't find X" | 1 X is below the fold or in a menu; 2 label is not the user's word; 3 X looks like body text | locate X by its `box` in `--json`; read labels | clarify.md, ux-guidelines.md |
| "Confusing", "don't know what to do" | 1 no single primary action; 2 vague labels; 3 missing empty/error states | count primaries; check empty and error views | clarify.md, harden.md |
| "Can't tell where I am / what's selected" | 1 no active nav state; 2 selection shown by color only; 3 invisible focus | `focus-invisible`, `--steps` to reach the selected state, inspect active styles | ux-guidelines.md, polish.md |
| "Buttons don't look clickable" | 1 buttons styled like text or labels; 2 low contrast fill; 3 no hover/focus state; 4 too small | `focus-invisible`, `tap-target`, `a11y/color-contrast`, `--steps` with `hover` | polish.md, ux-guidelines.md |
| "Too small on my phone" | 1 body text under 14-16px; 2 tap targets too small; 3 desktop layout shrunk | `--viewports mobile`: `text-size`, `tap-target`, `a11y/meta-viewport` | responsive.md |
| "Broken on my phone", "scrolls sideways" | 1 fixed-width element or table; 2 long unbroken text; 3 overlap from absolute positioning | `--viewports mobile`: `overflow-x`, `overlap`, `truncation` | responsive.md, harden.md |
| "Text is cut off" | 1 fixed height or width with overflow hidden; 2 nowrap on long values; 3 longer real data than mock data | `truncation`, `overflow-x` | harden.md, layout.md |
| "The table is hard to scan" | 1 row padding off; 2 numbers not right-aligned/tabular; 3 too many columns; 4 weak header contrast | `line-height`, `spacing-outlier`, `overflow-x`, `--scope "table"` | layout.md, typography.md |
| "Jumpy", "janky" | 1 content shifts as data or fonts load; 2 animating width/height/top; 3 spinners replace content | run with and without `--wait`; `failed-request`; inspect CSS transitions | harden.md, polish.md |
| "Slow", "something's broken" | 1 failing requests or scripts; 2 broken images; 3 console errors | `console-error`, `failed-request`, `broken-image` | harden.md |
| "Doesn't match the old one / the mockup" | 1 type size/weight differs; 2 spacing differs; 3 colors differ; 4 missing elements | `--compare <ref>` (separate run): `[parity/style]`, `[parity/values]`, `[parity/missing]`, `[parity/crops]` | match.md |
| "Looks generic", "looks AI-made", "template-y" | 1 known tells (gradient text, colored side borders, card in card); 2 default font, purple-blue gradient; 3 identical card grids | `gradient-text`, `accent-border`, `nested-card`, `--inventory` families and colors | tone.md, craft-floor.md |
| "Looks dated", "wrong vibe", "too corporate/playful" | 1 type family and weight choice; 2 palette saturation; 3 radius and shadow style | `--inventory` families, colors, radii, shadows | tone.md |

## How to translate

1. **Restate.** Turn the complaint into 2-3 measurable hypotheses. "Cluttered" becomes: "over 3 font weights", "gaps between groups equal gaps within groups", "cards in cards".
2. **Measure.** Run ui-check plus `--inventory`. When a reference exists (old version, mockup, a page the user pointed at), also run `--compare <ref-url>` as a separate run. Use the viewport, scheme and state (`--steps`) the person saw.
3. **Keep what the numbers confirm.** Drop the rest. If none survive, test the next-ranked causes before touching anything.
4. **Decide.** If two surviving hypotheses lead to opposite changes (for example "cramped" could mean more padding, or fewer elements), ask ONE clarifying question with the two options in plain words. Otherwise pick the best-supported one and say which you picked and why.
5. **Report back in their words.** "You said it felt cramped. Card padding was 8px vs 24px elsewhere and line-height 1.2; now 24px and 1.5. ui-check: 7 findings before, 0 after." Give numbers, not adjectives.

## Words to give back

Use these to explain a change in one sentence; give the plain meaning the first time.

- **Hierarchy**: what the eye reads first, second, third; set by size, weight and color.
- **Rhythm**: repeating, predictable spacing so the page feels steady.
- **Density**: how much information fits in a given area; dashboards want more, marketing pages less.
- **Contrast**: how much two things differ, such as text against its background, or a heading against body text.
- **Alignment**: things sharing the same edge or center line, so the page looks deliberate.
- **Measure**: the length of a line of text; about 65-75 characters reads best.
- **Weight**: how bold text looks; also how much visual pull an element has.
- **Scale**: the fixed set of sizes (type or spacing) everything is picked from.
- **Whitespace**: empty space used on purpose to group related things and separate unrelated ones.
- **Affordance**: a visual hint of what something does, such as a button that looks pressable.
