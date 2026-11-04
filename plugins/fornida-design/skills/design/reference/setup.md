# Setup: tokens, DESIGN.md and guardrails

Use when a project has no DESIGN.md or design tokens, before a larger redesign, or when ui-check keeps finding drift (`off-scale`, `near-duplicate`, `too-many`). Most "looks slightly off" problems come from one-off values. Tokens plus a linter stop them at the source, so they never reach the screen.

## 1. Inventory what exists

```
node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory --viewports desktop
```

Run it on 2-3 representative pages. It lists every font family, size, weight, text/background/border color, spacing value, radius and shadow in use, with counts, and flags near-duplicates. The most-used values are the de facto system.

## 2. Write DESIGN.md (repo root)

Collapse the inventory into a small system. Keep values the app already uses most; merge near-duplicates into the dominant one.

```
# Design system
Mode: Operate (dashboards/admin)    # or Persuade for marketing pages; per surface if mixed
## Spacing (base 4px)
4, 8, 12, 16, 24, 32, 48, 64
## Type scale
12 caption / 14 body-sm / 16 body / 18 lead / 20 h4 / 24 h3 / 30 h2 / 36 h1; weights 400, 500, 600; line-height 1.5 body, 1.2 headings
## Fonts
<family> for UI; <mono> for code and tabular data only
## Color roles
text #..., text-muted #... (>=4.5:1 on surface), surface #..., surface-raised #..., border #..., accent #..., danger #..., success #...
dark mode: same roles, redefined
## Radii / shadows
radius 4 (inputs), 8 (cards), 9999 (pills); shadow sm, md
```

Then make the code match: CSS custom properties or the Tailwind theme, named by role (`--text-muted`, not `--gray-500`). Replace near-duplicates with the token (the ui-check `near-duplicate` hint names the keeper).

## 3. Add a guardrail linter (with the user's OK: it is a new dev dependency)

- **Tailwind v4 + shadcn/ui projects:** `@shadcn/lint` (MIT) with ESLint or Oxlint. Turn on `no-arbitrary-values`, `no-raw-colors`, `no-inline-styles`, `no-restyle`. Its errors name the correct token, so they are cheap to fix. Setup per the package README; run it in CI with the other lint.
- **Plain CSS / CSS modules / SCSS:** `stylelint` with `stylelint-declaration-strict-value` set to require variables for `color`, `background-color`, `border-color`, `font-size`, `/^(margin|padding|gap)/`.
- Pin exact versions, follow the project's install and CI standards, and note the new dependency in the README.

## 4. Verify

Re-run the inventory. Target: font sizes <= 8, text colors <= 5 roles, radii <= 4, shadows <= 3, no `near-duplicate`, no `off-scale`. Lint passes in CI.
