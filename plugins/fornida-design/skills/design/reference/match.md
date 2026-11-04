# Match a reference

Use when a rebuild, port, framework migration or redesign-in-place must look like an existing build: "v2 doesn't look like v1", "make it match the old one", "something's slightly different but I can't say what". This is where screenshots fail you most: the differences are a few pixels of padding, half a weight, one shade of gray. Measure them.

## Setup

1. Run both builds locally (or the reference on a dev/test host): reference (old) and target (new). Same data, same logged-in state, same route.
2. If the pages need a login or seeded data, use a test account and test data. Never production client data.
3. Pick the routes that matter most (2-5). Do one route at a time.

## Measure

```
node "<skill-dir>/scripts/ui-check.mjs" <target-url> --compare <reference-url> --viewports desktop,mobile --out <scratch>/match-<route>
```

The report has these sections, in the order you should work them:

1. `[parity/style]` grouped style differences. A change that repeats on many elements ("padding 8px 16px -> 12px 20px on 23 elements") is one token or one shared component. This section is usually 80% of "looks slightly off".
2. `[parity/values]` design values that exist on only one side: a font family, size, weight or color the target never uses (or invented). Usually a missing token or font import.
3. `[parity/missing]` / `[parity/extra]` text elements present on one side only: missing labels, extra wrappers, changed copy.
4. `[parity/geometry]` size differences of matched elements, deepest first. Mostly effects of the style differences; fix causes first and these disappear.
5. `[parity/region]` the areas with the most changed pixels, with coordinates, plus a diff image (red = different). Use it to find what the other sections missed (an icon, an image, a background), not to judge.

## Fix

- Work top-down through the sections. Fix a grouped difference at its source: the token, theme value, or shared component, not each element.
- Port values exactly from the reference's computed styles (the report shows both sides). Do not "improve" while matching; note improvements separately and ask.
- Fonts: a family showing only in the reference usually means the font file or `@font-face` import was not ported. Check `failed-request` in a normal ui-check run.
- Known-different on purpose (new feature, approved redesign)? List it once and move on.

## Verify

Re-run the same command. Done when `[parity/style]` and `[parity/values]` are empty or every remaining line is an agreed intentional change, and `[parity/region]` is under about 1% (anti-aliasing noise). Then run a normal `ui-check` on the target to make sure the match did not import old problems (contrast, overflow). Stop after 3 cycles and report what remains, with the diff image path for the human.
