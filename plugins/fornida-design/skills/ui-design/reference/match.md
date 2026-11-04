# Match a reference

Use when a rebuild, port, framework migration or redesign-in-place must look like an existing build: "v2 doesn't look like v1", "make it match the old one", "something's slightly different but I can't say what". This is where screenshots fail you most: the differences are a few pixels of padding, half a weight, one shade of gray. Measure them.

## Setup

1. Run both builds locally (or the reference on a dev/test host): reference (old) and target (new). Same data on both. If v1 is not running anywhere but its code exists (a v2 repo that still has v1's tag or branch), run it locally from that code: `git -C <repo> worktree add <temp>/v1 <v1-tag-or-branch>`, install, start it on another port. Remove the worktree when done.
2. Pages behind a login: same logged-in state on both via `--storage-state` with a TEST account (ui-check.md, Login). Never production client data.
3. States (open menu, selected tab, dark class): put them in `--steps`; the same steps run on both sides.
4. Pick the routes that matter most (2-5). One route at a time, or `--routes` for several in one run.

## Measure

```
node "<skill-dir>/scripts/ui-check.mjs" http://localhost:3001 --compare http://localhost:3000 --routes "/,/reports" --viewports desktop,mobile --out <scratch>/match
```

Target (v2) first, reference (v1) after `--compare`. Compare is a separate run from the normal check. Several routes and viewports take a while: run it in the background.

Work the sections in this order:

1. `[parity/style]` grouped style differences. A change that repeats on many elements ("padding 8px 16px -> 12px 20px on 23 elements") is one token or one shared component. This is usually most of "looks slightly off".
2. `[parity/values]` design values that exist on only one side: a font family, size, weight or color the target never uses (or invented). Usually a missing token or font import.
3. `[parity/missing]` / `[parity/extra]` elements present on one side only: missing labels, extra wrappers, changed copy.
4. `[parity/crops]` side-by-side crops of the most-changed elements. The only images worth viewing; use them to see an icon, image or background the sections above cannot describe.
5. `[parity/geometry]` size differences, mostly effects of the style differences; fix causes first and these disappear. `[parity/region]` is a hint only: it is unreliable below the first height change.

## Fix

- Fix a grouped difference at its source: the token, theme value, or shared component, not each element.
- Port values exactly from the reference's computed styles (the report shows both sides). Do not "improve" while matching; note improvements separately and ask.
- Fonts: a family showing only in the reference usually means the font file or `@font-face` import was not ported. Check `failed-request` in a normal run.
- Known-different on purpose (new feature, approved redesign)? List it once and move on.

## Verify

Re-run the same command. Done when there are no `[parity/style]` or `[parity/values]` lines except agreed intentional ones, and pixels different is under 1% in the header. Stop after 3 cycles and report what remains, with the crop paths for the human.

Then run a normal ui-check on the target for contrast, overflow and broken states. Treat `off-scale`, `near-duplicate`, `too-many`, `gradient-text`, `accent-border` and `nested-card` findings that also exist on the reference as inherited: list them, do not fix them during a match.

## Lock the match

Add a screenshot test per matched route to the project's tests and CI so later sessions cannot regress it. `@playwright/test` is a new dev dependency if the project lacks it: ask first, pin the version.

```ts
// tests/visual/match-v1.spec.ts
import { test, expect } from "@playwright/test";
test.use({ storageState: process.env.UI_STORAGE_STATE }); // test account, created in CI, never committed
// baseURL comes from playwright.config
for (const route of ["/", "/reports"]) {
  test(`matches v1: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveScreenshot({
      fullPage: true,
      mask: [page.locator("[data-testid=last-updated]"), page.locator(".live-chart")], // dynamic data
    });
  });
}
```

Generate the baseline once the match is done (`npx playwright test --update-snapshots`) on the same OS as CI, since font rendering differs by platform, and commit the baseline images. They must show test data only.
