# fornida-design

Fornida's frontend design plugin. One skill, `design`, plus a local measurement tool, `ui-check`.

**Why:** the coding agent is poor at reading screenshots, and the people asking for fixes are not designers, so
feedback arrives as "looks off" or "doesn't match v1". This plugin turns that into measured hypotheses, fixes the
cause at the token or component level, and verifies with numbers. Screenshots go to the human only to confirm taste.

## What is in it

| Path | What |
|---|---|
| `skills/design/SKILL.md` | entry point: the measure-fix-verify loop and command table |
| `skills/design/reference/` | playbooks (critique, polish, layout, typography, color, tone, clarify, responsive, harden, match, setup), the vague-feedback vocabulary, web UX guidelines, the ui-check reference |
| `skills/design/scripts/ui-check.mjs` | measures a rendered page: overflow, overlap, truncation, spacing outliers and off-scale values, tap targets, text size and measure, color/size/radius drift, keyboard focus visibility, images, console and network errors, axe-core accessibility, and parity against a reference build (grouped style diffs, missing/extra elements, per-region pixel diff) |
| `skills/design/vendor/axe.min.js` | axe-core 4.14.0, unmodified |
| `test/` | `node --test plugins/fornida-design/test/*.test.mjs` (needs Playwright + Chromium) |

No hooks, no MCP server, no network calls beyond the page being measured. One skill description in the always-on
context.

## Usage

Install: `/plugin install fornida-design --marketplace Fornida-Dev/fornida-claude-plugins` (or org Settings → Plugins).

`/design` (or just ask for UI work; the skill auto-loads). Arguments: `critique`, `polish`, `layout`, `type`,
`color`, `quieter`, `bolder`, `clarify`, `responsive`, `harden`, `match <reference-url>`, `setup`.

ui-check directly:

    node plugins/fornida-design/skills/design/scripts/ui-check.mjs http://localhost:3000 --inventory
    node .../ui-check.mjs http://localhost:3001/reports --compare http://localhost:3000/reports

Requirements: Node 20+, Playwright (`playwright` or `playwright-core`) resolvable from the project or globally, and
Chromium, Chrome or Edge.

Data handling: run against local or dev/test environments only, never production with client data. Screenshots and
reports are written to a temp folder (or `--out`) and should never be committed.

## Maintenance

First-party: not vendored and not touched by `setup-fornida-plugins.ps1`. Bump `version` in
`.claude-plugin/plugin.json` on change, run the tests, then the normal push-to-main + Re-sync. To refresh the adapted
content, compare against the upstream commits named in `NOTICE.md` and port what is useful by hand.
Third-party sources and licenses: `NOTICE.md`, `LICENSES/`.
