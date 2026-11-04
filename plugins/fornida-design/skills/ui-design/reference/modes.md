<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Modes

The mode names what success looks like for the visitor on one surface. Pick it from the surface, not the product: a tool's landing page is Persuade, its admin screens are Operate, its help pages are Read. Record the mode per surface in DESIGN.md.

- **Operate:** the visitor completes a task. Dashboards, admin, settings, tables, forms, internal tools. Most Fornida work.
- **Persuade:** the visitor decides and acts. Client marketing sites, landing pages, pricing.
- **Read:** the visitor understands something. Docs, runbooks, help, changelogs.
- **Experience:** the work itself leads (portfolio, gallery). Rare here; treat as Persuade with the content first.

## When to use

At the start of any UI task, and when feedback is "feels wrong for what it is", "too flashy", "too plain", "looks like a marketing page" (for an app), or "looks like an admin panel" (for a client site).

## Measure

    node "<skill-dir>/scripts/ui-check.mjs" <url> --inventory

Compare families, size count, scale steps, and color count against the mode's numbers below. `too-many` and `near-duplicate` show drift.

## Operate

The tool should disappear into the task. A user who knows this category should trust every control on sight. The failure is not plainness; it is strangeness: decorated buttons, odd form controls, display fonts on labels, invented affordances.

- **Type:** one sans family. Fixed rem scale, no fluid `clamp()` headings. Ratio 1.125–1.2 between steps, 5–8 sizes total (for example 12, 14, 16, 18, 20, 24). Body and table text 14–16px. Weights 400, 500, 600.
- **Color:** restrained. Neutral surfaces plus one accent used only for primary action, current selection, and focus. A second neutral layer (slightly cooler or warmer) for sidebar, toolbar, panels. Semantic colors (success, warning, error, info) carry state only, always with text or an icon.
- **Layout:** standard shells: top bar plus side nav, breadcrumbs, tabs. Density is allowed: many rows, many labels. Responsive changes are structural (sidebar collapses, table scrolls inside its own container or becomes a list), not fluid type.
- **Components:** each interactive one has default, hover, focus, active, disabled, loading, error. Skeletons for loading, not a spinner in the middle of content. Empty states say what goes here and how to add it. One button shape, one form-control style, one icon set across every screen; if Save looks different in two places, one is wrong.
- **Overlays:** dropdowns and popovers must escape `overflow: hidden` ancestors. Use `<dialog>`, the popover API, `position: fixed`, or a portal.
- **Motion:** 150–250ms, state changes only. No page-load choreography.
- **Data:** numbers right-aligned with `tabular-nums`; units in headers; a headline metric shows its period and change.
- **Avoid:** modal as first choice, custom scrollbars or controls for flavor, saturated color on inactive states.

## Persuade

The first viewport must state the offer in one line, show the primary action in its working form (the booking form, the contact form, not a link to it), and show something specific to this client.

- **Type:** a display face may carry voice. Ratio 1.25–1.333; `clamp()` display sizes are fine. Body 16–18px, measure 65–75ch. Display max 6rem.
- **Color:** the brand may own large regions. Primary action stays the most findable element.
- **Layout:** consistent vertical rhythm between sections (for example 64–128px on desktop, half on mobile). Avoid the stock templates: split hero with a badge row, or a centered headline over three equal cards.
- **Imagery:** real photos or product shots, correct aspect ratio, useful alt text.
- Check `mobile` first; most client traffic is phones.

## Read

The column stays calm; the frame (header, nav rail, headings, code blocks, tables) carries the brand.

- Body 16–18px, line-height 1.4–1.6, measure 65–75ch.
- Clear heading hierarchy, visible contents or sidebar nav, next and previous links.
- Code, tables, and callouts in standard forms. Mono only for code.

## Native apps

Follow the platform's own conventions (Apple Human Interface Guidelines, Material Design) for navigation, type scaling, and touch targets.

## Diagnose

- What mode is this surface? Does DESIGN.md say?
- Does the inventory match the mode (family count, size count, ratio, accent usage)?
- In Operate, is anything decorative competing with the task? In Persuade, is the offer and action visible without scrolling at 390x844?

## Fix

Change tokens and shared components to the mode's numbers before touching single elements. Record the mode and its scale in DESIGN.md.

## Verify

Re-run `--inventory` and the default check. Done = the inventory fits the mode's numbers and `too-many`, `near-duplicate`, and `text-size` are clean or each finding is explained. Stop after 3 cycles and report.
