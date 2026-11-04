# Notices

fornida-design is a Fornida plugin. Parts of it are derived from, or bundle, the open-source works below. Each is used
under its own license; full texts are in `LICENSES/`. All may be used commercially.

## Impeccable (Apache-2.0)

- Source: https://github.com/pbakaus/impeccable at commit 5af4319c4e7a7ee3e5e2b9fe899bcfb21c6190cb. Copyright Paul Bakaus.
- Used: design method and playbook content, adapted in `skills/ui-design/reference/` (craft-floor, modes, layout,
  typography, color, polish, critique, tone, clarify, responsive, harden). Each such file starts with a note naming
  the source.
- Modified by Fornida (2026-11): condensed and rewritten; the launcher, binary detector, live mode, hooks, telemetry and
  remote catalog were removed; evidence comes from Fornida's own `ui-check` tool instead.
- Impeccable's own notice: its iOS/Android platform references are distilled from ehmo's platform-design-skills (MIT,
  https://github.com/ehmo/platform-design-skills). Those platform files are not included here.
- License: `LICENSES/impeccable-Apache-2.0.txt`. "Impeccable" is the upstream project's name; this plugin is not
  Impeccable and is not endorsed by its author.

## ui-ux-pro-max-skill (MIT)

- Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill at commit ccce51cba388476d4f403091ddb91636d5cd9fed.
  Copyright (c) 2024 Next Level Builder.
- Used: `ux-guidelines.csv`, filtered to web and condensed into `skills/ui-design/reference/ux-guidelines.md`.
- License: `LICENSES/ui-ux-pro-max-skill-MIT.txt`.

## axe-core (MPL-2.0), bundled unmodified

- `skills/ui-design/vendor/axe.min.js` is axe-core 4.14.0 from npm (integrity
  sha512-9WTZxEjsZ7b13TH8JPmbV2z8CHbl80/2hm3XPEG4JgNdQLK81IBRXmSxHfMAOkSqQeRxT/0dwNDz2GOm3zzpcQ==), unmodified.
  Copyright Deque Systems, Inc. Source: https://github.com/dequelabs/axe-core. Source code of the bundled version
  (MPL-2.0 Section 3.2): https://github.com/dequelabs/axe-core/tree/v4.14.0.
- License: `LICENSES/axe-core-MPL-2.0.txt` (and its third-party notices, `LICENSES/axe-core-3RD-PARTY.txt`).

## Ideas, no code

`ui-check`'s geometry checks (overflow, overlap, truncation, spacing outliers, off-scale spacing) follow ideas from
snug (https://github.com/creynir/snug, MIT) and gridproof (https://github.com/gridproof/gridproof, MIT). No code
from either project is included.
