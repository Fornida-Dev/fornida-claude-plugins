<!-- Adapted from Impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable, Apache-2.0) at commit 5af4319. Modified by Fornida: condensed, rewritten, launcher/live mode/detector replaced by ui-check. -->
# Clarify: labels, errors, empty states

## When to use

"Confusing", "users don't know what to do", "what does this button do", "the error is useless", "too wordy", "jargon", "people keep calling support about this screen", "blank page when there's no data".

Read the whole flow, not single strings. Keep product terms, factual claims and legal wording; ask before changing any of them.

## Measure

```
node "<skill-dir>/scripts/ui-check.mjs" <url> --viewports desktop,mobile
node "<skill-dir>/scripts/ui-check.mjs" <url> --viewports mobile --scope "<form or panel selector>"
```

Relevant rules:
- `a11y/label`, `a11y/button-name`, `a11y/link-name`, `a11y/image-alt`: controls with no accessible name, usually icon-only buttons or placeholder-as-label inputs.
- `truncation`: labels or messages clipped at narrow widths. Copy too long for its container, or a fixed width.
- `line-length` over ~90 characters: helper or body text that will not be read.
- `text-size` under 12px: fine print carrying real information.

Also grep the source for weak strings: `OK`, `Submit`, `Yes`, `No`, `Click here`, `Learn more`, `Something went wrong`, `Error`, `Invalid`, `No data`, raw status codes, and placeholder attributes with no matching label.

## Diagnose

For each screen state, write down:
1. The one fact the user needs now.
2. The next action.
3. Context that changes the decision (cost, irreversibility, who else is affected).

Then mark each string: vague verb, internal jargon, missing consequence, missing recovery, repeated idea, or inconsistent term (same thing called "ticket", "case" and "request").

## Fix

Fix shared strings first (button component defaults, error helper, empty-state component), then individual screens. If terms drift across the product, add a short glossary to DESIGN.md and use it.

**Actions**
- Verb + object: "Save policy", "Assign technician", "Export 24 devices". Not "Submit", "OK", "Go".
- Destructive: name the object and the consequence. "Delete 3 users? They lose access immediately." Buttons: "Delete users" / "Keep users". Prefer undo over a confirm dialog when undo is safe.
- Same concept, same word everywhere. Sentence case for labels.

**Forms**
- Persistent visible labels. Placeholders are examples ("e.g. contoso.com"), never the label.
- State format and limits before submit ("8+ characters, one number").
- Validation next to the field: what is wrong and how to fix it. "Enter a date after 01/15/2026", not "Invalid date". Keep the user's input.

**Errors**
- Answer: what failed, why (if known and useful), what to do now. "Couldn't sync 4 devices. The tenant token expired. Reconnect Intune."
- Error codes go in a secondary detail line for support, never as the headline.
- Do not guess causes the system cannot know. No jokes on errors involving access, money, deletion or customer data.

**Empty states** (distinguish them; each needs its own copy)
- First use: what will appear here, one-line why, one primary action. "No alerts yet. Alerts appear when a monitored device goes offline. Add a device."
- No results: say the filter or query, offer "Clear filters".
- No permission: say who can grant access.
- Failed to load: what failed and a Retry button.

**Loading and success**
- Name the operation: "Loading 1,240 tickets", not "Loading...". Show real progress only.
- Success: confirm the outcome briefly ("Policy saved"). Mention next steps only if the user must act.

**Help text**
- Answers a question the label leaves open; does not restate the label.
- Link text makes sense alone ("View billing history", not "Learn more").
- Icon-only buttons get an `aria-label` that matches the tooltip.

**Localization and length**
- Full sentences, not concatenated fragments. Use placeholders translators can reorder and a real plural function.
- Leave 30-40% width headroom; do not abbreviate to fit.

## Do not touch

Domain terms the audience uses daily (an MSP tech knows "RMM", "tenant", "SLA"); legal, compliance or contract text; numbers and facts. Flag these instead of rewriting.

## Verify

Re-run the same commands. Done when the `a11y/*` name rules and `truncation` are clean in scope, the grep list returns no generic strings in changed screens, and each state (empty, error, loading, success) has been rendered once and read in context. Check 200% zoom on the main form. Cap at 3 fix-and-recheck cycles; report anything left.
