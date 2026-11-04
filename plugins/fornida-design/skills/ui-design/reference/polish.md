<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Polish

The final pass before shipping. Polish refines; it never hides a redesign. Keep the existing look, content, behavior, and everything outside scope. If the concept itself is wrong, say so and recommend a redesign instead.

## When to use

"Almost done, make it nice", "looks unfinished", "clean it up", "before we ship", "doesn't match the rest of the app", "something is a bit off".

## Measure

Run the full set once, then fix in batches:

    node "<skill-dir>/scripts/ui-check.mjs" <url> [more urls] --viewports desktop,tablet,mobile --out <dir>
    node "<skill-dir>/scripts/ui-check.mjs" <url> --scheme dark --out <dir>       # if dark mode ships
    node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory
    node "<skill-dir>/scripts/ui-check.mjs" <url> --compare <sibling-page-url> --scope "<shared component>"   # for "doesn't match"

The compare is a separate run. A sibling page has different content, so compare only the shared component (header, table, form) with `--scope`. `--scheme dark` covers `prefers-color-scheme` only; a class-based theme needs `--steps`. Run the multi-viewport check in the background.

Every rule matters here. Group findings by rule before fixing; many share one cause.

## Diagnose

Read DESIGN.md, shared components, and one neighboring screen. Classify each drift before fixing it:

- **Missing token:** the value repeats and belongs in DESIGN.md.
- **One-off implementation:** a shared component already exists and should replace it.
- **Conceptual mismatch:** flow, naming, or hierarchy differs from comparable screens.
- **Local defect:** simply incomplete or inconsistent.

Fix at the narrowest correct level. Then triage in this order:

1. Broken or blocked tasks, data loss, misleading state, inaccessible paths (`console-error`, `failed-request`, `a11y/*`, `focus-invisible`).
2. Missing states: loading, empty, error, success, disabled, no-permission.
3. Hierarchy, responsive, and system drift (`overflow-x`, `overlap`, `truncation`, `off-scale`, `spacing-outlier`, `near-duplicate`, `too-many`, `parity/*`).
4. Visual and motion inconsistency.
5. Code and asset cleanup.

Bring the whole path to the same bar; do not perfect one corner.

## Fix: checklist

**Flow and hierarchy**
- Match neighboring screens in terms, save behavior, navigation, and disclosure.
- The primary task and current state are obvious; not everything has equal weight.
- Empty, error, and recovery paths connect back to the task.

**Layout and type** (see layout.md, typography.md)
- All spacing on the scale; groups tight, sections apart.
- Same role, same type style, on every screen.
- Long text, long names, and 200% zoom do not break the layout.

**Color, images, icons** (see color.md)
- Semantic tokens only; contrast passes in every state and theme.
- One icon set, one stroke weight, consistent sizes, optically centered.
- Images have width and height or `aspect-ratio` set (no layout shift), correct crop, real alt text.

**Interaction and state**
- Every control: default, hover, focus, active, disabled, loading, error, success.
- Visible keyboard focus, logical tab order, labels on every input, 24x24 minimum targets (44x44 touch).
- Motion 150–250ms, state only, respects `prefers-reduced-motion`. Do not add animation to make polish visible.
- Tables: sortable headers look sortable, numbers right-aligned with `tabular-nums`, sensible empty state.

**Content and code**
- Consistent terms, capitalization, and punctuation. Ask before changing factual claims.
- Remove debug output, dead code, unused imports, obsolete styles, and duplicate values polish created.
- Replace custom one-offs with the shared component; promote repeated values to tokens, but do not tokenize a single exception.

## Verify

Re-run the same commands. Then walk the path with keyboard only, and on the mobile viewport. Done = every rule is clean, or each remaining finding is listed with its reason; compare-mode differences are each marked intended or fixed; the inventory shows only token values. Stop after 3 fix and recheck cycles and report what remains.

Finish with a review of the diff: remove accidental churn, orphaned code, and temporary files. Give the human the `--out` screenshots to confirm the finish; do not sign off on taste from screenshots yourself.
