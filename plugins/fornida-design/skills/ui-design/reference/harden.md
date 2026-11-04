<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Harden: states, first run, edge cases

## When to use

"Works with test data but breaks in production", "blank screen while loading", "it just shows nothing", "long names break the layout", "new users get lost", "it crashed when the API was down", "double-submitted", "before we ship this". Also before any client-facing release.

A screen that only works with perfect data is not done.

## Measure

Render each state, then measure it. Get there with fixture data, a query param, a feature flag, or by blocking the API in the dev server; do not ship test hooks to production. Quote any URL containing `?` or `&`. States reached by interaction (open dialog, submitted form) need `--steps`.

```
node "<skill-dir>/scripts/ui-check.mjs" "<url>?state=empty" "<url>?state=error" "<url>?state=long" --viewports desktop,mobile --out <scratch>/harden
node "<skill-dir>/scripts/ui-check.mjs" <url> --wait-for "<loaded-content selector>"
```

Rules that matter here:
- `console-error`, `failed-request`: unhandled failures. Each one needs a visible state or an explanation.
- `truncation`, `overflow-x`, `overlap`: long content breaking layout.
- `broken-image`, `stretched-image`: missing avatars, logos, thumbnails.
- `focus-invisible`, `a11y/*`: states and dialogs that keyboard and screen-reader users cannot use.

## Diagnose

Make a state matrix for each data-driven view: rows are components, columns are the states below. Mark each cell rendered-and-fine, broken, or missing.

| State | Test with |
|---|---|
| Loading | Throttled network; initial, refresh, next page |
| Empty | Zero records; first use vs no results vs filtered out |
| Error | 400, 401, 403, 404, 429, 500, timeout, offline |
| Disabled / read-only | User without edit rights |
| Long content | 100+ char names, 60-char hostnames, GUIDs, no spaces |
| Many items | 1,000+ rows, 50+ select options |
| Large numbers | 1,234,567; negative; zero; null |
| i18n | German (+30-40% length), emoji, accents, RTL if used |
| Concurrency | Submit clicked 10 times; stale edit in two tabs |

## Fix

Fix shared components first (data table, empty state, error banner, button loading state, async wrapper) so every screen inherits it. Then patch individual screens.

**Loading**: skeletons matching the final layout for content; a spinner only for actions under ~1s. Name long operations ("Syncing 312 devices"). Keep layout stable so content does not jump.

**Empty**: distinct copy and action per type (first use, no results, no permission, failed). See clarify.md for wording.

**Error**: show it next to what failed, not as a full-page wipe; one broken widget must not blank the dashboard. Map statuses: 400 field errors inline; 401 sign in again; 403 explain who can grant access; 404 not-found state with a way back; 429 say when to retry; 500/timeout plain message plus Retry. Preserve user input on every error.

**Disabled and read-only**: say why ("Requires Admin role"), via visible text or tooltip that also works on focus. Do not hide fields the user can see but not edit.

**Long content**:
- Flex/grid children get `min-width: 0`. Text containers get `overflow-wrap: anywhere` or a marked ellipsis with the full value in a title attribute.
- Multi-line clamp for descriptions: `-webkit-line-clamp: 3`.
- No fixed widths on buttons or labels; size with padding.

**Many items**: paginate or virtualize past ~200 rows; add search or filter past ~10 options.

**Numbers, dates, i18n**: `Intl.NumberFormat` and `Intl.DateTimeFormat`, never hand-built strings. Real plural rules. Logical CSS properties (`margin-inline-start`) if RTL is in scope. UTF-8 throughout.

**Concurrency**: disable the submit button and show progress while a request is in flight; optimistic updates roll back on failure.

**Input**: client-side limits and formats stated up front (`maxlength`, `pattern`, hint text), always re-validated server-side.

**First run** (for apps, not marketing pages):
- Get the user to first value fast: one real task, not a tour of every feature.
- Use the empty state as onboarding: what goes here, why, one button to create the first item, optional template or sample data.
- Ask for the minimum at setup; collect the rest later. Explain why each field is needed if not obvious.
- Tours only for complex tools: 3-7 steps, skippable, replayable from Help, shown once per user (store completion server-side if it must follow the user across devices).
- Do not block the product behind onboarding, and do not show it again to returning users.

## Do not

- Swallow errors silently or show raw stack traces or codes as the message.
- Trust client-side validation alone.
- Block the whole interface when one component fails.

## Verify

Re-run the state URLs. Done when every cell in the matrix is rendered-and-fine or explained, `console-error` and `failed-request` are clean or each is an intended handled failure, and `truncation`/`overflow-x`/`overlap` are clean on the long-content state at desktop and mobile. Show the `--out` screenshots of empty, error and long states to the user. Cap at 3 fix-and-recheck cycles; report what remains.
