<!-- Derived from ui-ux-pro-max-skill ux-guidelines.csv (https://github.com/nextlevelbuilder/ui-ux-pro-max-skill, MIT, Copyright (c) 2024 Next Level Builder) at commit ccce51c. Modified by Fornida: filtered to web, condensed, mapped to ui-check rules. -->
# UX guidelines checklist (web)

Use as a review checklist. Fix [High] first. A rule id in backticks means ui-check reports it; everything else needs a manual check (keyboard, click-through, slow network, empty data). Source "Critical" rows are tagged [High].

## Navigation
- **Smooth scroll** [High] — Do: `scroll-behavior: smooth` on html, off under reduced motion / Don't: jump to anchors with no transition.
- **Sticky nav** [Medium] — Do: offset content by the nav height / Don't: let the nav cover the first section. `overlap`
- **Active state** [Medium] — Do: mark the current nav item (color plus underline or weight) / Don't: give no sign of location.
- **Back button** [High] — Do: keep browser history working in SPAs / Don't: break back.
- **Deep linking** [Medium] — Do: update the URL when view, tab or filter changes / Don't: one static URL for dynamic views.
- **Breadcrumbs** [Low] — Do: use for 3+ levels of depth / Don't: add them to flat sites.

## Animation
- **Excessive motion** [High] — Do: animate 1-2 key elements per view / Don't: animate everything.
- **Duration** [Medium] — Do: use shared motion tokens; keep feedback responsive / Don't: treat any ms cutoff as universal.
- **Reduced motion** [High] — Do: honor `prefers-reduced-motion` / Don't: ignore it.
- **Loading states** [High] — Do: skeleton or spinner / Don't: leave the UI frozen.
- **Hover vs tap** [High] — Do: click/tap for primary actions / Don't: hide important actions behind hover.
- **Continuous animation** [Medium] — Do: only for loading indicators / Don't: loop decorative elements.
- **Transform performance** [Medium] — Do: animate transform and opacity / Don't: animate width, height, top, left.
- **Easing** [Low] — Do: decelerate in, accelerate out, linear for steady progress / Don't: ban linear outright.
- **Auto-rotating content** [High] — Do: prev/next and pause; stop on focus, hover, reduced motion / Don't: auto-advance with no stop.
- **Cancellable transitions** [High] — Do: set final state directly and cancel prior motion / Don't: rely on `transitionend` for correct state.

## Layout
- **Z-index** [High] — Do: use a small z-index scale (10, 20, 30, 50) / Don't: arbitrary huge values. `overlap`
- **Overflow hidden** [Medium] — Do: test that all content fits / Don't: blindly clip. `truncation`
- **Fixed positioning** [Medium] — Do: account for safe areas and other fixed elements / Don't: stack fixed bars carelessly. `overlap`
- **Stacking context** [Medium] — Do: know what creates one / Don't: expect z-index to cross contexts. `overlap`
- **Content jumping** [High] — Do: reserve space for async content / Don't: insert content with no layout plan.
- **Viewport units** [Medium] — Do: use `dvh` / Don't: `100vh` for full-screen mobile layouts.
- **Container width** [Medium] — Do: cap text at 65-75ch / Don't: let text span the viewport. `line-length`
- **Long tokens** [High] — Do: `overflow-wrap: anywhere`; let flex/grid text children shrink (`min-width: 0`) / Don't: `word-break: break-all` on prose. `overflow-x` `truncation`
- **Chip reflow** [High] — Do: wrap chips or use an operable "+n" / Don't: force one clipped row. `truncation`

## Touch
- **Touch spacing** [Medium] — Do: at least 8px between targets on touch screens / Don't: pack clickable elements tightly. `tap-target`

## Interaction
- **Focus states** [High] — Do: visible focus ring on every control, including in modals / Don't: remove outline without replacement. `focus-invisible`
- **Hover states** [Medium] — Do: pointer cursor plus a subtle change / Don't: no hover feedback on clickable elements.
- **Active states** [Medium] — Do: show a pressed state / Don't: no feedback while interacting.
- **Disabled states** [Medium] — Do: reduce opacity, change cursor / Don't: make disabled look enabled.
- **Loading buttons** [High] — Do: disable and show progress / Don't: allow repeat clicks while processing.
- **Error feedback** [High] — Do: clear message next to the problem / Don't: fail silently.
- **Success feedback** [Medium] — Do: message or visible change / Don't: no confirmation.
- **Confirmation dialogs** [High] — Do: confirm deletes and irreversible actions / Don't: delete on one click.

## Accessibility
- **Color contrast** [High] — Do: 4.5:1 minimum for normal text / Don't: low-contrast text. `a11y/color-contrast`
- **Color only** [High] — Do: add icon or text to color / Don't: red/green alone for error/success. `a11y/link-in-text-block`
- **Alt text** [High] — Do: describe meaningful images / Don't: missing alt. `a11y/image-alt`
- **Heading hierarchy** [Medium] — Do: sequential h1-h6 / Don't: skip levels or pick headings for size. `a11y/heading-order`
- **ARIA labels** [High] — Do: `aria-label` on icon-only buttons / Don't: unlabeled icon buttons. `a11y/button-name`
- **Keyboard navigation** [High] — Do: tab order matches visual order; every action works without a mouse / Don't: traps or random order. `a11y/tabindex`
- **Screen reader** [Medium] — Do: semantic HTML, ARIA used correctly / Don't: div soup. `a11y/region` `a11y/landmark-one-main`
- **Form labels** [High] — Do: `<label for>` or wrapping label / Don't: placeholder-only inputs. `a11y/label`
- **Error messages** [High] — Do: `aria-live` or `role=alert` / Don't: visual-only errors.
- **Skip links** [Medium] — Do: "skip to main content" on nav-heavy pages / Don't: omit it. `a11y/bypass`
- **Motion sensitivity** [High] — Do: honor reduced motion; show the final state without parallax / Don't: scroll-jacking.
- **Focus not obscured (AA)** [High] — Do: `scroll-padding` for sticky UI; move or dismiss overlays / Don't: let headers, banners or chat widgets cover focus.
- **Focus not obscured (AAA)** [Medium] — Do: keep the whole focused control visible / Don't: call this AAA rule an AA requirement.
- **Focus appearance (AAA)** [Medium] — Do: 2px-perimeter indicator at 3:1 contrast / Don't: thin low-contrast outline. `focus-invisible`
- **Dragging** [High] — Do: offer buttons, menus or keyboard alternatives / Don't: make drag the only way to reorder or resize.
- **Target size** [High] — Do: at least 24x24 CSS px or equivalent spacing / Don't: treat native 44pt/48dp as the web rule. `tap-target`
- **Consistent help** [Medium] — Do: keep help and contact in the same place on every page / Don't: move it around.
- **Text reflow and spacing** [High] — Do: fluid sizes, content-driven height, unitless line-height / Don't: fixed boxes that clip text. `truncation` `overflow-x`
- **Compact controls** [High] — Do: use a `<button>` exposing pressed/selected state / Don't: clickable div, or the only action shown on hover.
- **Live badge updates** [High] — Do: one atomic status message ("3 items in cart") / Don't: announce a bare number, or make every badge a live region.

## Performance
- **Images** [High] — Do: right size and modern format (WebP/AVIF) / Don't: full-size originals. `broken-image` `stretched-image`
- **Lazy loading** [Medium] — Do: lazy load below-fold images and content / Don't: load everything upfront.
- **Code splitting** [Medium] — Do: split by route or feature / Don't: one large bundle.
- **Caching** [Medium] — Do: set cache headers / Don't: no caching strategy.
- **Font loading** [Medium] — Do: `font-display: swap` or `optional` / Don't: invisible text while fonts load. `failed-request`
- **Third-party scripts** [Medium] — Do: `async` or `defer` non-critical scripts / Don't: synchronous third-party scripts. `console-error` `failed-request`
- **Bundle size** [Medium] — Do: monitor it / Don't: ignore growth.
- **Render blocking** [Medium] — Do: inline critical CSS, defer the rest / Don't: large blocking CSS.

## Forms
- **Input labels** [High] — Do: visible label above or beside the input / Don't: placeholder as the only label. `a11y/label`
- **Error placement** [High] — Do: specific error under the field, linked by `aria-describedby` / Don't: only a generic top-of-form error.
- **Inline validation** [Medium] — Do: validate on blur / Don't: only on submit.
- **Input types** [Medium] — Do: `email`, `tel`, `number`, `url` / Don't: `text` for everything.
- **Mobile keyboards** [Medium] — Do: set `inputmode` / Don't: default keyboard for every input.
- **Autofill** [Medium] — Do: correct `autocomplete` values / Don't: block autofill. `a11y/autocomplete-valid`
- **Required fields** [Medium] — Do: asterisk or "(required)" / Don't: no indication.
- **Password visibility** [Medium] — Do: show/hide toggle / Don't: no toggle.
- **Submit feedback** [High] — Do: loading, then success or error / Don't: nothing after submit.
- **Input affordance** [Medium] — Do: inputs look like inputs / Don't: fields that read as plain text.
- **Redundant entry** [Medium] — Do: prefill or offer earlier values / Don't: make users retype the same data.
- **Accessible authentication** [High] — Do: allow password managers and paste; offer passkey or SSO / Don't: block paste or force manual OTP copying.
- **Error summary** [High] — Do: summary at top, focus it after failed submit, link each item to its field, keep inline errors / Don't: summary only, or move focus on every blur.

## Responsive
- **Mobile first** [Medium] — Do: base styles for mobile, add breakpoints up / Don't: desktop-first that breaks on mobile.
- **Breakpoint testing** [Medium] — Do: test 320, 375, 414, 768, 1024, 1440 / Don't: test only your own screen. `--viewports`
- **Touch friendly** [High] — Do: larger targets on mobile / Don't: the same tiny buttons. `tap-target`
- **Readable font size** [High] — Do: 16px body text on mobile / Don't: tiny text. `text-size`
- **Viewport meta** [High] — Do: `width=device-width, initial-scale=1` / Don't: missing meta or zoom disabled. `a11y/meta-viewport`
- **Horizontal scroll** [High] — Do: fit content to the viewport / Don't: content wider than the screen. `overflow-x`
- **Image scaling** [Medium] — Do: `max-width: 100%` / Don't: fixed-width images that overflow. `overflow-x` `stretched-image`
- **Tables** [Medium] — Do: scroll container or card layout on small screens / Don't: wide tables breaking the page. `overflow-x`

## Typography
- **Line height** [Medium] — Do: 1.5-1.75 for body text / Don't: cramped or excessive. `line-height`
- **Line length** [Medium] — Do: 65-75 characters / Don't: full-width text on large screens. `line-length`
- **Font size scale** [Medium] — Do: consistent modular scale / Don't: random sizes. `too-many` `near-duplicate`
- **Font loading shift** [Medium] — Do: size-matched fallback font / Don't: layout shift when fonts load.
- **Contrast readability** [High] — Do: dark text on light backgrounds / Don't: gray on gray. `a11y/color-contrast`
- **Heading clarity** [Medium] — Do: clear size and weight step from body / Don't: headings that look like body text. `--inventory`
- **Heading line balance** [Medium] — Do: bound the measure and test wrapping across widths / Don't: hard-coded `<br>` or nonbreaking spaces.

## Feedback
- **Loading indicators** [High] — Do: keep layout and focus; expose busy status / Don't: one threshold for all operations, or unexplained long waits.
- **Empty states** [Medium] — Do: helpful message plus an action / Don't: blank screens.
- **Error recovery** [Medium] — Do: clear next steps / Don't: errors with no way out.
- **Progress** [Medium] — Do: steps or a progress bar / Don't: no sign of progress.
- **Toasts** [Medium] — Do: auto-dismiss after 3-5 s / Don't: toasts that never leave.
- **Confirmation messages** [Medium] — Do: brief success message / Don't: silent success.

## Content
- **Truncation** [Medium] — Do: ellipsis with a way to see the full text / Don't: overflow or broken layout. `truncation`
- **Essential truncation** [High] — Do: wrap, stack, or link to full detail / Don't: clamp key meaning to make cards uniform. `truncation`
- **Compact labels** [High] — Do: interactive only when the label acts; status not by color alone / Don't: make every pill clickable.
- **Compact label overflow** [High] — Do: nowrap with a shrinkable label; full text reachable by keyboard and touch / Don't: two-line pills or hover-only tooltips. `truncation`
- **Dates** [Low] — Do: relative or locale-aware dates / Don't: ambiguous formats like 03/04.
- **Numbers** [Low] — Do: thousand separators or abbreviations / Don't: long unformatted numbers.
- **Placeholder content** [Low] — Do: realistic sample data / Don't: lorem ipsum.

## Onboarding, search, data entry
- **User freedom** [Medium] — Do: Skip and Back in tours / Don't: forced linear tours.
- **Autocomplete** [Medium] — Do: show suggestions while typing / Don't: require full entry and Enter.
- **No results** [Medium] — Do: "No results" plus suggestions / Don't: blank screen or bare "0 results".
- **Bulk actions** [Low] — Do: multi-select and bulk edit / Don't: single-row actions only.

## AI features
- **Disclosure** [High] — Do: label AI-generated content / Don't: present it as human.
- **Streaming** [Medium] — Do: stream responses as they arrive / Don't: a spinner for 10 s or more.
- **Feedback loop** [Low] — Do: thumbs up/down or Regenerate / Don't: static output only.

## Sustainability
- **Auto-play video** [Medium] — Do: click-to-play, pause, captions; stop off-screen / Don't: auto-play loops with no pause.
- **Asset weight** [Medium] — Do: compress and lazy load heavy assets (3D, video) / Don't: ship 50MB textures.
