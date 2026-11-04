# fornida-design

Fornida's frontend design plugin. One skill, `ui-design`, plus a local measurement tool, `ui-check`.

**Why:** the coding agent is poor at reading screenshots, and the people asking for fixes are not designers, so
feedback arrives as "looks off" or "doesn't match v1". This plugin turns that into measured hypotheses, fixes the
cause at the token or component level, and verifies with numbers. Screenshots go to the human only to confirm taste.

## What is in it

| Path | What |
|---|---|
| `skills/ui-design/SKILL.md` | entry point: the measure-fix-verify loop and command table |
| `skills/ui-design/reference/` | playbooks (critique, polish, layout, typography, color, tone, clarify, responsive, harden, match, setup), the vague-feedback vocabulary, web UX guidelines, the ui-check reference |
| `skills/ui-design/scripts/ui-check.mjs` | measures a rendered page: overflow, overlap, truncation, spacing outliers and off-scale values, tap targets, text size and measure, color/size/radius drift, keyboard focus visibility, images, console and network errors, axe-core accessibility, and parity against a reference build (grouped style diffs, missing/extra elements, side-by-side crops, pixel diff) |
| `skills/ui-design/vendor/axe.min.js` | axe-core 4.14.0, unmodified |
| `test/` | `node --test plugins/fornida-design/test/*.test.mjs` (needs Playwright and Chrome, Edge or Chromium) |

No hooks, no MCP server, no network calls beyond the page being measured. One skill description in the always-on
context.

## Usage

Install: `/plugin install fornida-design --marketplace Fornida-Dev/fornida-claude-plugins` (or org Settings → Plugins).

`/ui-design` or `/fornida-design:ui-design` (or just ask for UI work; the skill auto-loads). The skill was named
`design` before; it was renamed because SuperClaude ships a `design` command. Arguments: `critique`, `polish`,
`layout`, `type`, `color`, `quieter`, `bolder`, `clarify`, `responsive`, `harden`, `match <reference-url>`, `setup`.

ui-check directly:

    node plugins/fornida-design/skills/ui-design/scripts/ui-check.mjs http://localhost:3000 --inventory
    node .../ui-check.mjs http://localhost:3001 --compare http://localhost:3000 --routes "/,/reports"

Flags, rules and exit codes: `skills/ui-design/reference/ui-check.md`.

Requirements: Node 22+ LTS; Playwright as a pinned user-level install, `npm i -g playwright-core@1.64.1` (drives the
installed Chrome or Edge, downloads no browser, changes nothing in the client repo); Chrome or Edge.

## Data handling

- Run against local or dev/test environments only, never production with client data. Non-local hosts are refused
  unless `--allow-remote` is passed.
- Screenshots, crops and reports go to a new temp folder (folders older than 7 days are cleaned up) or to `--out`. If
  `--out` is inside a repo, git-ignore it. Never commit them.
- Pages behind a login use a Playwright storage-state file made with a test account. It is a credential: keep it in a
  temp folder, never in a repo, and delete it when done.
- Page text in reports is untrusted data and is treated as such by the skill.

## Maintenance

First-party: not vendored and not touched by `setup-fornida-plugins.ps1`. Bump `version` in
`.claude-plugin/plugin.json` on change, run the tests, then the normal push-to-main + Re-sync. To refresh the adapted
content, compare against the upstream commits named in `NOTICE.md` and port what is useful by hand.
Third-party sources and licenses: `NOTICE.md`, `LICENSES/`.
