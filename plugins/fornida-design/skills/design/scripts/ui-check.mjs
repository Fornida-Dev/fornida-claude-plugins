#!/usr/bin/env node
// ui-check: measure a rendered UI and report problems as numbers, not pictures.
// Geometry, spacing, type, color drift, focus, images, console, accessibility (axe-core),
// and a parity mode that diffs a target against a reference build.
// Part of the fornida-design plugin. Ideas from snug and gridproof (MIT); implementation is original.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AXE_PATH = path.join(HERE, "..", "vendor", "axe.min.js");
const VIEWPORTS = { desktop: [1440, 900], laptop: [1280, 800], tablet: [834, 1112], mobile: [390, 844] };
const SEV_ORDER = { error: 0, warning: 1, info: 2 };

// ---------------------------------------------------------------- args

export function parseArgs(argv) {
  const o = { targets: [], viewports: ["desktop", "mobile"], scheme: "light", scope: null, compare: null, inventory: false,
    base: 4, wait: 0, waitFor: null, max: 25, json: false, out: null, axe: true, timeout: 30000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`); return v; };
    if (a === "--viewports" || a === "--viewport") o.viewports = val().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--scheme") o.scheme = val();
    else if (a === "--scope") o.scope = val();
    else if (a === "--compare") o.compare = val();
    else if (a === "--inventory") o.inventory = true;
    else if (a === "--base") o.base = Number(val());
    else if (a === "--wait") o.wait = Number(val());
    else if (a === "--wait-for") o.waitFor = val();
    else if (a === "--max") o.max = Number(val());
    else if (a === "--json") o.json = true;
    else if (a === "--out") o.out = val();
    else if (a === "--no-axe") o.axe = false;
    else if (a === "--timeout") o.timeout = Number(val());
    else if (a === "-h" || a === "--help") o.help = true;
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else o.targets.push(a);
  }
  if (!["light", "dark"].includes(o.scheme)) throw new Error("--scheme must be light or dark");
  if (!(o.base > 0)) throw new Error("--base must be a positive number");
  if (o.compare && o.targets.length !== 1) throw new Error("--compare takes exactly one target");
  o.viewports = o.viewports.map((v) => {
    if (VIEWPORTS[v]) return { name: v, width: VIEWPORTS[v][0], height: VIEWPORTS[v][1] };
    const m = /^(\d{3,4})x(\d{3,4})$/.exec(v);
    if (!m) throw new Error(`bad viewport "${v}" (use desktop, laptop, tablet, mobile or WxH)`);
    return { name: v, width: +m[1], height: +m[2] };
  });
  return o;
}

export function toUrl(t) {
  if (/^https?:\/\//i.test(t)) { new URL(t); return t; }
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(t)) return "http://" + t;
  if (/^(localhost|127\.|0\.0\.0\.0|\[)/i.test(t)) throw new Error(`ambiguous target "${t}": write it as http://${t}`);
  let p = t;
  if (/^file:/i.test(t)) {
    const u = new URL(t);
    if (u.host && u.host.toLowerCase() !== "localhost") throw new Error(`refusing file URL with a host: ${t}`);
    p = fileURLToPath(u);
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^[a-zA-Z]:[\\/]/.test(t)) throw new Error(`unsupported target "${t}" (use http(s) or an HTML file)`);
  else if (/^[\\/]{2}/.test(t)) throw new Error(`refusing network path: ${t}`);
  p = path.resolve(p);
  if (!/\.html?$/i.test(p)) throw new Error(`not an HTML file: ${t}`);
  if (!fs.existsSync(p)) throw new Error(`target not found: ${t} (give a URL or an HTML file)`);
  return pathToFileURL(p).href;
}

export function isLocal(u) {
  try {
    const { protocol, hostname } = new URL(u);
    if (protocol === "file:") return true;
    return /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[^.]+\.local(host)?)$/i.test(hostname);
  } catch { return false; }
}

// ---------------------------------------------------------------- browser

function loadPlaywright() {
  const bases = [path.join(process.cwd(), "package.json"), path.join(HERE, "package.json")];
  for (const b of bases) {
    const req = createRequire(b);
    for (const name of ["playwright", "playwright-core", "@playwright/test"]) {
      try { const m = req(name); if (m.chromium) return m; } catch { /* next */ }
    }
  }
  return null;
}

async function launch(pw) {
  const tries = [];
  tries.push({}, { channel: "chrome" }, { channel: "msedge" });
  if (fs.existsSync("/opt/pw-browsers/chromium")) tries.push({ executablePath: "/opt/pw-browsers/chromium" });
  let last;
  for (const t of tries) {
    try { return await pw.chromium.launch({ headless: true, ...t }); } catch (e) { last = e; }
  }
  throw new Error("could not start a browser (tried Playwright Chromium, Chrome, Edge). " +
    "Install Chrome or Edge, or run `npx playwright install chromium` in the project.\n" + (last && last.message.split("\n")[0]));
}

// ---------------------------------------------------------------- in-page collector
// Runs inside the page. Must be self-contained (no outer references).

function collect(opts) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sx = window.scrollX, sy = window.scrollY;
  const root = opts.scope ? document.querySelector(opts.scope) : document.body;
  if (!root) return { error: `--scope "${opts.scope}" matched nothing` };
  const SKIP = new Set(["SCRIPT", "STYLE", "HEAD", "META", "LINK", "NOSCRIPT", "TEMPLATE", "BR", "WBR", "TITLE"]);
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const r1 = (n) => Math.round(n * 10) / 10;

  const cssEsc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, "\\$&"));
  const idOk = (id) => id && !/^\d|[:]|^(radix|headlessui|mui|react-aria|rc-)|\d{4,}/i.test(id);
  const clsOk = (c) => c && c.length < 40 && !/^(css|sc|jsx|emotion|svelte)-[\w]+$|^_[\w-]{5,}$|\[|:|\//.test(c);
  function selector(el) {
    if (el.id && idOk(el.id) && document.querySelectorAll("#" + cssEsc(el.id)).length === 1) return "#" + el.id;
    const tid = el.getAttribute("data-testid") || el.getAttribute("data-test");
    if (tid) return `[data-testid="${tid}"]`;
    const parts = [];
    let cur = el;
    for (let depth = 0; cur && cur.nodeType === 1 && depth < 4; depth++) {
      if (cur === document.body) { parts.unshift("body"); break; }
      let s = cur.tagName.toLowerCase();
      if (cur.id && idOk(cur.id)) { parts.unshift("#" + cur.id); break; }
      const cls = [...cur.classList].filter(clsOk).slice(0, 2);
      if (cls.length) s += "." + cls.join(".");
      const p = cur.parentElement;
      if (p) {
        const same = [...p.children].filter((c) => c.tagName === cur.tagName);
        if (same.length > 1) s += `:nth-of-type(${same.indexOf(cur) + 1})`;
      }
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }
  function ownText(el) {
    let t = "";
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    return t.replace(/\s+/g, " ").trim();
  }
  function label(el) {
    const t = (el.innerText || "").replace(/\s+/g, " ").trim()
      || el.getAttribute("aria-label") || el.getAttribute("alt") || el.getAttribute("placeholder") || el.getAttribute("title") || "";
    return t.slice(0, 40);
  }
  function parseColor(c) {
    const m = /rgba?\(([^)]+)\)/.exec(c || "");
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") + (c.a < 1 ? `/${Math.round(c.a * 100)}%` : "");

  // ---- walk
  const els = [];
  const all = root.querySelectorAll("*");
  const list = [root, ...all].slice(0, opts.limit || 6000);
  const truncatedWalk = all.length + 1 > list.length;
  const index = new Map();
  for (const el of list) {
    if (SKIP.has(el.tagName)) continue;
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") continue;
    const rc = el.getBoundingClientRect();
    if (rc.width === 0 && rc.height === 0 && cs.position !== "absolute") continue;
    const rec = {
      i: els.length, el, cs, tag: el.tagName.toLowerCase(),
      x: rc.left + sx, y: rc.top + sy, w: rc.width, h: rc.height,
      text: ownText(el),
    };
    index.set(el, rec.i);
    els.push(rec);
  }
  for (const r of els) {
    let p = r.el.parentElement;
    while (p && !index.has(p)) p = p.parentElement;
    r.parent = p ? index.get(p) : -1;
  }
  const kids = els.map(() => []);
  for (const r of els) if (r.parent >= 0) kids[r.parent].push(r.i);

  const issues = [];
  const add = (sev, rule, r, detail, hint, data) => issues.push({ severity: sev, rule, selector: r ? selector(r.el) : "document", text: r ? label(r.el) : "", detail, hint, data });

  const inFlow = (r) => !["absolute", "fixed"].includes(r.cs.position) && r.cs.float === "none";
  const isInline = (r) => r.cs.display === "inline" || r.cs.display === "contents";
  const scrollsX = (r) => ["auto", "scroll", "hidden", "clip"].includes(r.cs.overflowX);

  // ---- overflow-x
  const docW = document.documentElement.scrollWidth;
  if (!opts.scope && docW > vw + 1) add("error", "overflow-x", null, `page is ${docW}px wide in a ${vw}px viewport (+${docW - vw}px horizontal scroll)`, "find the element below that pokes out; let wide content scroll inside its own container (overflow-x:auto) or wrap/shrink");
  for (const r of els) {
    if (r.x + r.w <= vw + 1 || r.w < 1) continue;
    let p = r.parent, clipped = false, parentPokes = false;
    while (p >= 0) {
      const pr = els[p];
      if (scrollsX(pr)) { clipped = true; break; }
      if (pr.x + pr.w > vw + 1) { parentPokes = true; break; }
      p = pr.parent;
    }
    if (clipped || parentPokes || r.cs.position === "fixed") continue;
    add("error", "overflow-x", r, `right edge at ${Math.round(r.x + r.w)}px, viewport ${vw}px (+${Math.round(r.x + r.w - vw)}px)`, "fixed widths or min-width too large for this viewport; use max-width:100%, flex-wrap, or a scroll container");
  }

  // ---- overlap among in-flow siblings
  for (const r of els) {
    const ch = kids[r.i].map((k) => els[k]).filter((c) => inFlow(c) && !isInline(c) && c.w > 2 && c.h > 2);
    if (ch.length < 2 || ch.length > 80) continue;
    for (let a = 0; a < ch.length; a++) for (let b = a + 1; b < ch.length; b++) {
      const A = ch[a], B = ch[b];
      const ix = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const iy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (ix > 2 && iy > 2) {
        add("warning", "overlap", B, `overlaps sibling ${selector(A.el)} ("${label(A.el)}") by ${Math.round(ix)}x${Math.round(iy)}px`, "usually a negative margin, fixed height, or absolute child sizing; give the container room or use gap", { other: selector(A.el) });
      }
    }
  }

  // ---- truncation
  for (const r of els) {
    const e = r.el;
    if (!(e.innerText || "").trim()) continue;
    const cw = e.scrollWidth - e.clientWidth, ch = e.scrollHeight - e.clientHeight;
    const hidX = ["hidden", "clip"].includes(r.cs.overflowX), hidY = ["hidden", "clip"].includes(r.cs.overflowY);
    const lineClamp = r.cs.webkitLineClamp && r.cs.webkitLineClamp !== "none";
    if (hidX && cw > 2) {
      const ell = r.cs.textOverflow === "ellipsis";
      add(ell ? "info" : "warning", "truncation", r, `${ell ? "ellipsis hides" : "clips"} ${cw}px of content horizontally`, ell ? "intentional ellipsis: make sure the full text is reachable (title/tooltip) and the column is not too narrow" : "content is cut off; allow wrapping, widen the container, or add ellipsis + tooltip on purpose");
    } else if (hidY && ch > 2 && r.h > 0) {
      add(lineClamp ? "info" : "warning", "truncation", r, `${lineClamp ? "line-clamp hides" : "clips"} ${ch}px of content vertically`, lineClamp ? "intentional clamp: confirm the full text is reachable" : "fixed height cuts content off; use min-height or let it grow");
    }
  }

  // ---- spacing outliers between siblings in one row or one column
  for (const r of els) {
    if (["space-between", "space-around", "space-evenly"].includes(r.cs.justifyContent)) continue;
    const all3 = kids[r.i].map((k) => els[k]).filter((c) => inFlow(c) && !isInline(c) && c.w > 0 && c.h > 0);
    if (all3.length < 3) continue;
    const tagCount = new Map();
    for (const c of all3) tagCount.set(c.tag, (tagCount.get(c.tag) || 0) + 1);
    const [, topN] = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topN / all3.length < 0.6) continue; // mixed content (headings, paragraphs, widgets): spacing varies by design
    const ch = all3;
    const sameTop = ch.every((c) => Math.abs(c.y - ch[0].y) < 2);
    const sameLeft = ch.every((c) => Math.abs(c.x - ch[0].x) < 2);
    if (sameTop === sameLeft) continue;
    const sorted = [...ch].sort((a, b) => (sameTop ? a.x - b.x : a.y - b.y));
    const gaps = [];
    for (let k = 0; k < sorted.length - 1; k++) {
      const A = sorted[k], B = sorted[k + 1];
      gaps.push(Math.round(sameTop ? B.x - (A.x + A.w) : B.y - (A.y + A.h)));
    }
    const counts = new Map();
    for (const g of gaps) { const key = [...counts.keys()].find((k) => Math.abs(k - g) <= 2); counts.set(key ?? g, (counts.get(key ?? g) || 0) + 1); }
    const [mode, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n < 2) continue;
    const odd = gaps.map((g, k) => ({ g, k })).filter(({ g }) => Math.abs(g - mode) > Math.max(4, Math.abs(mode) * 0.2));
    if (!odd.length) continue;
    const o = odd[0];
    add("warning", "spacing-outlier", els[sorted[o.k + 1].i], `${sameTop ? "horizontal" : "vertical"} gaps in ${selector(r.el)} are [${gaps.join(", ")}]px; this one is ${o.g}px vs the usual ${mode}px`, "set one gap on the parent (gap) and remove per-child margins, or make the odd spacing intentional (group break) and larger", { gaps, mode });
  }

  // ---- off-scale spacing (aggregated by value)
  const base = opts.base || 4;
  const onScale = (v) => {
    const a = Math.abs(v);
    if (a < 0.5 || a <= 3) return true;
    const near = (m) => Math.abs(a / m - Math.round(a / m)) * m < 0.6;
    return near(base) || (a <= base * 4 && near(base / 2));
  };
  const offScale = new Map();
  const PROPS = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "marginLeft", "marginRight", "rowGap", "columnGap"];
  for (const r of els) {
    if (r.tag === "html" || r.tag === "body") continue;
    for (const p of PROPS) {
      const raw = r.cs[p];
      if (!raw || raw === "normal" || raw === "auto") continue;
      const v = px(raw);
      if (p === "marginLeft" || p === "marginRight") {
        const ml = px(r.cs.marginLeft), mr = px(r.cs.marginRight);
        if (Math.abs(ml - mr) < 1 && ml > 16) continue; // auto-centred
      }
      if ((p === "rowGap" || p === "columnGap") && !/flex|grid/.test(r.cs.display)) continue;
      if (onScale(v)) continue;
      const key = r1(Math.abs(v));
      const ent = offScale.get(key) || { count: 0, examples: [] };
      ent.count++;
      if (ent.examples.length < 3) ent.examples.push({ selector: selector(r.el), prop: p.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()), text: label(r.el) });
      offScale.set(key, ent);
    }
  }
  for (const [v, ent] of [...offScale.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const lo = Math.floor(v / base) * base, hi = lo + base;
    const ex = ent.examples[0];
    issues.push({ severity: "warning", rule: "off-scale", selector: ex.selector, text: ex.text,
      detail: `${v}px used ${ent.count}x (e.g. ${ent.examples.map((e) => `${e.selector} ${e.prop}`).join("; ")})`,
      hint: `not on the ${base}px scale; use ${lo || base}px or ${hi}px (a spacing token), fixing it where the value is defined`, data: { value: v, count: ent.count } });
  }

  // ---- text checks + inventory
  const inv = { fontSize: new Map(), fontFamily: new Map(), fontWeight: new Map(), textColor: new Map(), bgColor: new Map(), borderColor: new Map(), radius: new Map(), shadow: new Map(), spacing: new Map() };
  const bump = (m, k, sel) => { if (k === "" || k == null) return; const e = m.get(k) || { count: 0, example: sel }; e.count++; m.set(k, e); };
  const TEXTY = new Set(["p", "li", "dd", "dt", "td", "th", "blockquote", "figcaption", "label", "span", "a", "div", "h1", "h2", "h3", "h4", "h5", "h6", "button", "small", "strong", "em", "code", "pre"]);
  for (const r of els) {
    const cs = r.cs;
    const hasText = r.text.length > 0;
    if (hasText) {
      const fs = px(cs.fontSize);
      bump(inv.fontSize, r1(fs) + "px", r);
      bump(inv.fontFamily, cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(), r);
      bump(inv.fontWeight, cs.fontWeight, r);
      const c = parseColor(cs.color); if (c && c.a > 0) bump(inv.textColor, hex(c), r);
      if (fs > 0 && fs < 12 && r.text.length > 2) add("warning", "text-size", r, `${r1(fs)}px text`, "12px is the floor for any text and 14px for body copy; use the type scale");
      if (TEXTY.has(r.tag) && r.text.length > 120) {
        const chars = r.w / (fs * 0.5);
        if (["p", "li", "dd", "blockquote", "div", "td"].includes(r.tag) && chars > 95) add("warning", "line-length", r, `about ${Math.round(chars)} characters per line (${Math.round(r.w)}px at ${r1(fs)}px)`, "cap the text column with max-width around 65-75ch");
        const lh = cs.lineHeight === "normal" ? fs * 1.2 : px(cs.lineHeight);
        if (fs > 0 && r.h > lh * 1.8 && lh / fs < 1.3) add("warning", "line-height", r, `line-height ${r1(lh / fs)} on multi-line ${r1(fs)}px text`, "use 1.4-1.6 for body text");
      }
    }
    const bg = parseColor(cs.backgroundColor); if (bg && bg.a > 0) bump(inv.bgColor, hex(bg), r);
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      if (px(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none") { const bc = parseColor(cs[`border${side}Color`]); if (bc && bc.a > 0) bump(inv.borderColor, hex(bc), r); }
    }
    const rad = px(cs.borderTopLeftRadius); if (rad > 0 && rad < 9000) bump(inv.radius, r1(rad) + "px", r);
    if (cs.boxShadow && cs.boxShadow !== "none") bump(inv.shadow, cs.boxShadow.replace(/\s+/g, " ").slice(0, 80), r);
    for (const p of ["paddingTop", "paddingLeft", "rowGap", "columnGap"]) { const v = px(cs[p]); if (v > 0 && (p.startsWith("padding") || /flex|grid/.test(cs.display))) bump(inv.spacing, r1(v) + "px", r); }

    // generic-design tells
    const clip = cs.webkitBackgroundClip || cs.backgroundClip;
    if (clip === "text" && /gradient/.test(cs.backgroundImage) && hasText) add("info", "gradient-text", r, "gradient-filled text", "emphasis reads better through weight or size; solid text is also more legible");
    const bl = px(cs.borderLeftWidth), br = px(cs.borderRightWidth), bt = px(cs.borderTopWidth), bb = px(cs.borderBottomWidth);
    for (const [w, side] of [[bl, "Left"], [br, "Right"]]) {
      if (w >= 2 && bt <= 1 && bb <= 1 && r.h > 24 && cs[`border${side}Style`] !== "none") {
        const c = parseColor(cs[`border${side}Color`]);
        if (c && Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 40) add("info", "accent-border", r, `${w}px colored border-${side.toLowerCase()} stripe`, "a thick colored side stripe is a stock pattern; prefer a subtle background tint, an icon, or a heading");
      }
    }
  }
  // nested cards
  const cardLike = (r) => r.w >= 120 && r.h >= 60 && !/^(input|select|textarea|button|a|img|video|iframe|table|tr|td|th)$/.test(r.tag)
    && px(r.cs.borderTopLeftRadius) >= 4 && px(r.cs.paddingTop) >= 8
    && ((px(r.cs.borderTopWidth) >= 1 && r.cs.borderTopStyle !== "none") || (r.cs.boxShadow && r.cs.boxShadow !== "none"));
  const isCard = els.map(cardLike);
  for (const r of els) {
    if (!isCard[r.i]) continue;
    let p = r.parent;
    while (p >= 0 && !isCard[p]) p = els[p].parent;
    if (p >= 0 && kids[p].length > 0) { add("info", "nested-card", r, `card inside card ${selector(els[p].el)}`, "nested framed boxes add noise; drop the inner border/shadow and group with spacing or a divider"); }
  }

  // ---- interactive sizes
  const interactive = (r) => {
    const e = r.el;
    if (e.matches("a[href],button,select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[role=menuitem]")) return true;
    if (e.tagName === "INPUT" && e.type !== "hidden") return true;
    return false;
  };
  for (const r of els) {
    if (!interactive(r)) continue;
    if (r.tag === "a" && r.el.closest("p,li,td,dd,label") && r.cs.display === "inline") continue; // inline text links are exempt
    if (r.el.tagName === "INPUT" && ["checkbox", "radio"].includes(r.el.type) && r.el.closest("label")) continue;
    if (r.w < 24 || r.h < 24) add("warning", "tap-target", r, `${Math.round(r.w)}x${Math.round(r.h)}px clickable area`, "make the clickable area at least 24x24 (44x44 on touch) with padding, even if the visible mark stays small");
    else if (vw <= 480 && (r.w < 44 || r.h < 44)) add("info", "tap-target", r, `${Math.round(r.w)}x${Math.round(r.h)}px on a touch viewport`, "44x44 is the comfortable touch size");
  }

  // ---- images
  for (const r of els) {
    if (r.tag !== "img") continue;
    const im = r.el;
    if (im.complete && im.naturalWidth === 0 && im.getAttribute("src")) add("error", "broken-image", r, `image failed to load: ${im.getAttribute("src").slice(0, 80)}`, "fix the path or the asset");
    else if (im.naturalWidth > 0 && r.w > 8 && r.h > 8 && ["fill", ""].includes(r.cs.objectFit || "fill")) {
      const nat = im.naturalWidth / im.naturalHeight, ren = r.w / r.h;
      if (Math.abs(ren - nat) / nat > 0.05) add("warning", "stretched-image", r, `rendered ratio ${ren.toFixed(2)} vs natural ${nat.toFixed(2)}`, "set width or height to auto, or object-fit: cover/contain");
    }
  }

  // ---- inventory: near-duplicates and counts
  function lab(h) {
    const m = /^#(..)(..)(..)/.exec(h); if (!m) return null;
    const f = (v) => { v = parseInt(v, 16) / 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; };
    const [R, G, B] = [f(m[1]), f(m[2]), f(m[3])];
    let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const g = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    [X, Y, Z] = [g(X), g(Y), g(Z)];
    return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
  }
  const dE = (a, b) => { const A = lab(a), B = lab(b); return A && B ? Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) : 99; };
  const drift = [];
  const near = (m, kind, close, unit) => {
    const ks = [...m.keys()];
    for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) {
      if (close(ks[a], ks[b])) {
        const [maj, min] = m.get(ks[a]).count >= m.get(ks[b]).count ? [ks[a], ks[b]] : [ks[b], ks[a]];
        drift.push({ severity: "warning", rule: "near-duplicate", selector: selector(m.get(min).example.el), text: label(m.get(min).example.el),
          detail: `${kind} ${min} (${m.get(min).count}x) is almost ${maj} (${m.get(maj).count}x)${unit ? "" : ""}`,
          hint: `pick one: replace ${min} with ${maj} (or the matching token) everywhere`, data: { kind, keep: maj, replace: min } });
      }
    }
  };
  const num = (s) => parseFloat(s);
  near(inv.textColor, "text color", (a, b) => !a.includes("/") && !b.includes("/") && dE(a, b) < 3);
  near(inv.bgColor, "background", (a, b) => !a.includes("/") && !b.includes("/") && dE(a, b) < 1.6); // larger gaps are usually intentional surface tints
  near(inv.borderColor, "border color", (a, b) => !a.includes("/") && !b.includes("/") && dE(a, b) < 3);
  near(inv.fontSize, "font size", (a, b) => Math.abs(num(a) - num(b)) <= 1 && num(a) !== num(b));
  near(inv.spacing, "spacing", (a, b) => Math.abs(num(a) - num(b)) <= 1 && num(a) !== num(b) && Math.min(num(a), num(b)) >= 6);
  near(inv.radius, "radius", (a, b) => Math.abs(num(a) - num(b)) <= 2 && num(a) !== num(b) && Math.max(num(a), num(b)) < 40);
  const limits = [["fontSize", 9, "font sizes", "a type scale usually has 5-8 steps"], ["fontFamily", 3, "font families", "use 1-2 families"], ["textColor", 10, "text colors", "text usually needs 3-5 roles (primary, secondary, muted, accent, danger)"], ["radius", 5, "corner radii", "use 2-4 radius tokens"], ["shadow", 5, "shadows", "use 2-3 elevation levels"], ["spacing", 14, "spacing values", "a spacing scale usually has 8-12 steps"]];
  for (const [k, lim, name, hint] of limits) if (inv[k].size > lim) drift.push({ severity: "warning", rule: "too-many", selector: "document", text: "", detail: `${inv[k].size} distinct ${name}`, hint, data: { kind: k } });
  const invOut = {};
  for (const [k, m] of Object.entries(inv)) invOut[k] = [...m.entries()].map(([v, e]) => ({ value: v, count: e.count })).sort((a, b) => b.count - a.count);

  // ---- records for parity
  let records = null;
  if (opts.records) {
    const PICK = ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "fontFamily", "textTransform", "color", "backgroundColor", "borderTopWidth", "borderTopColor", "borderBottomWidth", "borderBottomColor", "borderLeftWidth", "borderTopLeftRadius", "boxShadow", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "rowGap", "columnGap", "textAlign", "opacity"];
    records = els.map((r) => {
      const s = {};
      for (const p of PICK) s[p] = r.cs[p];
      s.fontFamily = (s.fontFamily || "").split(",")[0].replace(/["']/g, "").trim();
      return { i: r.i, parent: r.parent, tag: r.tag, sel: selector(r.el), text: r.text.slice(0, 80), label: label(r.el),
        id: r.el.id || "", testid: r.el.getAttribute("data-testid") || "", aria: r.el.getAttribute("aria-label") || "", alt: r.el.getAttribute("alt") || "",
        href: r.el.getAttribute("href") || "", x: r1(r.x), y: r1(r.y), w: r1(r.w), h: r1(r.h), s };
    });
  }

  return { viewport: { width: vw, height: vh }, pageHeight: document.documentElement.scrollHeight, elementCount: els.length, truncatedWalk,
    issues: issues.concat(drift), inventory: invOut, records };
}

// ---------------------------------------------------------------- focus visibility (keyboard Tab)

async function focusCheck(page, limit = 40) {
  const n = await page.evaluate(() => {
    const PROPS = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow", "backgroundColor", "borderTopColor", "color", "textDecorationLine"];
    const sel = "a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
    const els = [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    window.__uick = { base: new Map() };
    for (const e of els) { const cs = getComputedStyle(e); window.__uick.base.set(e, PROPS.map((p) => cs[p]).join("|")); }
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    return els.length;
  });
  const out = [];
  const seen = new Set();
  for (let k = 0; k < Math.min(n, limit); k++) {
    await page.keyboard.press("Tab");
    const res = await page.evaluate(() => {
      const PROPS = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow", "backgroundColor", "borderTopColor", "color", "textDecorationLine"];
      const e = document.activeElement;
      if (!e || e === document.body || !window.__uick.base.has(e)) return null;
      const cs = getComputedStyle(e);
      const now = PROPS.map((p) => cs[p]).join("|");
      const visibleOutline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      const sel = (() => { const t = e.tagName.toLowerCase(); const c = [...e.classList].slice(0, 2).join("."); return t + (e.id ? "#" + e.id : c ? "." + c : ""); })();
      return { sel, text: (e.innerText || e.getAttribute("aria-label") || e.getAttribute("placeholder") || "").trim().slice(0, 40), changed: now !== window.__uick.base.get(e) || visibleOutline };
    });
    if (!res) continue;
    if (seen.has(res.sel + res.text)) break;
    seen.add(res.sel + res.text);
    if (!res.changed) out.push({ severity: "warning", rule: "focus-invisible", selector: res.sel, text: res.text, detail: "no visible change when focused with the keyboard", hint: "add a :focus-visible style (2px outline in the accent color with offset) instead of outline:none" });
  }
  return out;
}

// ---------------------------------------------------------------- axe

async function runAxe(page, scope) {
  const src = fs.readFileSync(AXE_PATH, "utf8");
  try { await page.addScriptTag({ content: src }); } catch { await page.evaluate(src); }
  const res = await page.evaluate(async (sc) => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(sc ? document.querySelector(sc) : document, { resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 15).map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 80), data: (n.any[0] && n.any[0].data) || null })), total: v.nodes.length }));
  }, scope);
  const out = [];
  for (const v of res) {
    const sev = v.impact === "critical" || v.impact === "serious" ? "error" : v.impact === "moderate" ? "warning" : "info";
    v.nodes.forEach((n, k) => {
      let detail = v.help;
      let hint = "see the axe rule " + v.id;
      if (v.id === "color-contrast" && n.data) {
        detail = `contrast ${n.data.contrastRatio}:1 (needs ${n.data.expectedContrastRatio}) ${n.data.fgColor} on ${n.data.bgColor}, ${n.data.fontSize} ${n.data.fontWeight}`;
        hint = "darken the text or lighten the background using palette tokens; never fix by lowering font weight";
      }
      if (k === v.nodes.length - 1 && v.total > v.nodes.length) detail += ` (+${v.total - v.nodes.length} more not listed)`;
      out.push({ severity: sev, rule: "a11y/" + v.id, selector: n.target, text: n.html.replace(/\s+/g, " "), detail, hint });
    });
  }
  return out;
}

// ---------------------------------------------------------------- measure one page

async function measure(browser, url, vp, o, { records = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: o.scheme, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const consoleIssues = [];
  page.on("console", (m) => { if (m.type() === "error" && !/^Failed to load resource/.test(m.text()) && consoleIssues.length < 20) consoleIssues.push({ severity: "warning", rule: "console-error", selector: "", text: "", detail: m.text().slice(0, 200), hint: "fix the script error; it can leave UI half-rendered" }); });
  page.on("pageerror", (e) => { if (consoleIssues.length < 20) consoleIssues.push({ severity: "error", rule: "console-error", selector: "", text: "", detail: String(e.message || e).slice(0, 200), hint: "uncaught exception while rendering" }); });
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url()) && consoleIssues.length < 20) consoleIssues.push({ severity: "warning", rule: "failed-request", selector: "", text: "", detail: `${r.status()} ${r.url().slice(0, 120)}`, hint: "missing asset or API error" }); });
  page.on("requestfailed", (r) => { if (!/favicon/.test(r.url()) && consoleIssues.length < 20) consoleIssues.push({ severity: "warning", rule: "failed-request", selector: "", text: "", detail: `failed ${r.url().slice(0, 120)}`, hint: "missing asset or blocked request" }); });
  try { await page.goto(url, { waitUntil: "networkidle", timeout: o.timeout }); }
  catch (e) { if (!/Timeout/i.test(e.message)) throw e; await page.waitForLoadState("load", { timeout: 5000 }).catch(() => {}); }
  if (o.waitFor) await page.waitForSelector(o.waitFor, { timeout: o.timeout });
  if (o.wait) await page.waitForTimeout(o.wait);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  const data = await page.evaluate(collect, { scope: o.scope, base: o.base, records });
  if (data.error) throw new Error(data.error);
  const shotPath = path.join(o.outDir, `${slug(url)}-${vp.name}-${o.scheme}.png`);
  const shot = await page.screenshot({ fullPage: true, path: shotPath });
  let extra = [];
  if (!records) {
    extra = extra.concat(await focusCheck(page).catch(() => []));
    if (o.axe) extra = extra.concat(await runAxe(page, o.scope).catch((e) => [{ severity: "info", rule: "a11y/unavailable", selector: "", text: "", detail: "axe could not run: " + e.message.split("\n")[0], hint: "" }]));
  }
  await ctx.close();
  data.issues = data.issues.concat(extra, consoleIssues);
  return { ...data, url, viewport: vp, scheme: o.scheme, screenshot: shotPath, shot };
}

let shotSeq = 0;
const slug = (u) => {
  const tail = u.replace(/^\w+:\/\//, "").replace(/[?#].*$/, "").split("/").filter(Boolean).slice(-2).join("_");
  return String(++shotSeq).padStart(2, "0") + "-" + (tail.replace(/[^\w.-]+/g, "_").slice(-50) || "page");
};

// ---------------------------------------------------------------- parity

function colorDist(a, b) {
  const p = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); return m ? m[1].split(/[,\s/]+/).filter(Boolean).map(Number) : null; };
  const A = p(a), B = p(b);
  if (!A || !B) return a === b ? 0 : 99;
  const aa = A[3] ?? 1, ba = B[3] ?? 1;
  if (aa === 0 && ba === 0) return 0;
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) + Math.abs(aa - ba) * 255;
}

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

export function matchRecords(ref, tgt) {
  const pairs = new Map(); // ref i -> tgt i
  const used = new Set();
  const pw = Math.max(...ref.map((r) => r.x + r.w), 1), tw = Math.max(...tgt.map((r) => r.x + r.w), 1);
  const keyed = (keyFn) => {
    const byKey = new Map();
    for (const t of tgt) { if (used.has(t.i)) continue; const k = keyFn(t); if (!k) continue; (byKey.get(k) || byKey.set(k, []).get(k)).push(t); }
    for (const r of ref) {
      if (pairs.has(r.i)) continue;
      const k = keyFn(r); if (!k) continue;
      const cands = (byKey.get(k) || []).filter((t) => !used.has(t.i));
      if (!cands.length) continue;
      const rel = (e, W) => [e.x / W, e.y / W];
      const [rx, ry] = rel(r, pw);
      cands.sort((a, b) => { const [ax, ay] = rel(a, tw), [bx, by] = rel(b, tw); return Math.hypot(ax - rx, ay - ry) - Math.hypot(bx - rx, by - ry); });
      pairs.set(r.i, cands[0].i); used.add(cands[0].i);
    }
  };
  keyed((e) => (e.testid ? "t:" + e.testid : null));
  keyed((e) => (e.id && !/\d{3,}/.test(e.id) ? "id:" + e.id : null));
  keyed((e) => (e.text.length >= 2 ? e.tag + ":" + norm(e.text) : null));
  keyed((e) => (e.text.length >= 2 ? "x:" + norm(e.text) : null));
  keyed((e) => (e.aria ? "a:" + norm(e.aria) : e.alt ? "alt:" + norm(e.alt) : null));
  keyed((e) => (e.href && e.href !== "#" ? e.tag + ":h:" + e.href : null));
  // containers: bottom-up, match when all matched children share one unmatched target parent
  for (let pass = 0; pass < 3; pass++) {
    for (let k = ref.length - 1; k >= 0; k--) {
      const r = ref[k];
      if (pairs.has(r.i)) continue;
      const kids = ref.filter((c) => c.parent === r.i && pairs.has(c.i));
      if (!kids.length) continue;
      const parents = new Set(kids.map((c) => tgt[pairs.get(c.i)].parent));
      if (parents.size !== 1) continue;
      const tp = [...parents][0];
      if (tp < 0 || used.has(tp)) continue;
      pairs.set(r.i, tp); used.add(tp);
    }
  }
  return pairs;
}

const STYLE_PROPS = [
  ["fontSize", "font-size", 0.5], ["fontWeight", "font-weight", 0], ["lineHeight", "line-height", 0.5], ["letterSpacing", "letter-spacing", 0.1],
  ["fontFamily", "font-family", null], ["textTransform", "text-transform", null], ["textAlign", "text-align", null],
  ["color", "color", "c"], ["backgroundColor", "background", "c"], ["borderTopWidth", "border-width", 0.5], ["borderTopColor", "border-color", "c"],
  ["borderBottomWidth", "border-bottom-width", 0.5], ["borderBottomColor", "border-bottom-color", "c"],
  ["borderLeftWidth", "border-left-width", 0.5], ["borderTopLeftRadius", "radius", 0.5], ["boxShadow", "shadow", null],
  ["padding", "padding", "box"],
  ["rowGap", "row-gap", 0.5], ["columnGap", "column-gap", 0.5], ["opacity", "opacity", 0.02],
];

export function diffRecords(ref, tgt, pairs) {
  const diffs = [];
  for (const [ri, ti] of pairs) {
    const r = ref[ri], t = tgt[ti];
    const hasText = r.text.length > 0;
    for (const [p, name, tol] of STYLE_PROPS) {
      if (!hasText && ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "fontFamily", "textTransform", "textAlign", "color"].includes(p)) continue;
      const box = (e) => ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map((k) => e.s[k]);
      const a = tol === "box" ? box(r).join(" ") : r.s[p], b = tol === "box" ? box(t).join(" ") : t.s[p];
      if (a === b) continue;
      if (/border.*Color/.test(p) && parseFloat(r.s[p.replace("Color", "Width")]) === 0 && parseFloat(t.s[p.replace("Color", "Width")]) === 0) continue;
      if (/Gap$/.test(p) && (a === "normal" || b === "normal") && (parseFloat(a) || 0) === (parseFloat(b) || 0)) continue;
      let differs;
      if (tol === "box") differs = box(r).some((v, k) => Math.abs((parseFloat(v) || 0) - (parseFloat(box(t)[k]) || 0)) > 0.5);
      else if (tol === "c") differs = colorDist(a, b) > 6;
      else if (tol === null) differs = norm(a) !== norm(b);
      else differs = Math.abs((parseFloat(a) || 0) - (parseFloat(b) || 0)) > tol;
      if (differs) diffs.push({ kind: "style", prop: name, ref: a, target: b, refSel: r.sel, sel: t.sel, text: r.label, area: r.w * r.h });
    }
    const dw = t.w - r.w, dh = t.h - r.h;
    if (Math.abs(dw) > Math.max(2, r.w * 0.02) || Math.abs(dh) > Math.max(2, r.h * 0.02)) diffs.push({ kind: "size", prop: "size", ref: `${r.w}x${r.h}`, target: `${t.w}x${t.h}`, refSel: r.sel, sel: t.sel, text: r.label, area: r.w * r.h, ri });
  }
  // a container that only grew because a child grew is noise: keep the deepest size changes
  const sized = new Set(diffs.filter((d) => d.kind === "size").map((d) => d.ri));
  const styled = new Set(diffs.filter((d) => d.kind === "style").map((d) => d.refSel));
  const hasSizedChild = new Set();
  for (const i of sized) { let p = ref[i].parent; while (p >= 0) { hasSizedChild.add(p); p = ref[p].parent; } }
  return diffs.filter((d) => d.kind !== "size" || !hasSizedChild.has(d.ri) || styled.has(d.refSel));
}

export function groupDiffs(diffs) {
  const groups = new Map();
  for (const d of diffs) {
    if (d.kind !== "style") continue;
    const k = `${d.prop}|${d.ref}|${d.target}`;
    const g = groups.get(k) || { prop: d.prop, ref: d.ref, target: d.target, count: 0, examples: [], area: 0 };
    g.count++; g.area += d.area;
    if (g.examples.length < 3) g.examples.push(d.sel + (d.text ? ` "${d.text}"` : ""));
    groups.set(k, g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.area - a.area);
}

async function pixelRegions(browser, refShot, tgtShot, outPath) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await ctx.newPage();
  const res = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const W = Math.min(A.width, B.width), H = Math.min(A.height, B.height);
    const cv = (im) => { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(im, 0, 0); return x.getImageData(0, 0, W, H).data; };
    const da = cv(A), db = cv(B);
    const out = document.createElement("canvas"); out.width = W; out.height = H;
    const ox = out.getContext("2d"); ox.drawImage(B, 0, 0); ox.fillStyle = "rgba(255,255,255,0.7)"; ox.fillRect(0, 0, W, H);
    const od = ox.getImageData(0, 0, W, H);
    const CW = Math.ceil(W / 4), CH = 200;
    const cells = new Map();
    let total = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      if (d > 48) {
        total++;
        od.data[i] = 230; od.data[i + 1] = 0; od.data[i + 2] = 40; od.data[i + 3] = 255;
        const k = Math.floor(x / CW) + "," + Math.floor(y / CH);
        cells.set(k, (cells.get(k) || 0) + 1);
      }
    }
    ox.putImageData(od, 0, 0);
    const list = [...cells.entries()].map(([k, n]) => { const [cx, cy] = k.split(",").map(Number); const w = Math.min(CW, W - cx * CW), h = Math.min(CH, H - cy * CH); return { x: cx * CW, y: cy * CH, w, h, pct: Math.round((n / (w * h)) * 1000) / 10 }; })
      .filter((c) => c.pct >= 1).sort((a, b) => b.pct - a.pct).slice(0, 10);
    return { width: W, heightA: A.height, heightB: B.height, pct: Math.round((total / (W * H)) * 1000) / 10, cells: list, png: out.toDataURL("image/png") };
  }, ["data:image/png;base64," + refShot.toString("base64"), "data:image/png;base64," + tgtShot.toString("base64")]);
  await ctx.close();
  fs.writeFileSync(outPath, Buffer.from(res.png.split(",")[1], "base64"));
  delete res.png;
  res.diffImage = outPath;
  return res;
}

// ---------------------------------------------------------------- report

function sortIssues(list) {
  return list.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.rule.localeCompare(b.rule));
}

function fmtIssue(i) {
  const t = i.text ? ` "${i.text.slice(0, 40)}"` : "";
  return `  ${i.rule}  ${i.selector}${t}\n      ${i.detail}${i.hint ? `\n      fix: ${i.hint}` : ""}`;
}

function textReport(results, o) {
  const lines = [];
  for (const r of results) {
    const issues = sortIssues(r.issues);
    const c = { error: 0, warning: 0, info: 0 };
    for (const i of issues) c[i.severity]++;
    lines.push(`ui-check  ${r.url}  ${r.viewport.name} ${r.viewport.width}x${r.viewport.height}  ${r.scheme}`);
    lines.push(`  ${c.error} errors, ${c.warning} warnings, ${c.info} info  |  ${r.elementCount} elements${r.truncatedWalk ? " (capped)" : ""}  |  screenshot: ${r.screenshot}`);
    for (const sev of ["error", "warning", "info"]) {
      const s = issues.filter((i) => i.severity === sev);
      if (!s.length) continue;
      lines.push(sev.toUpperCase() + "S");
      // collapse repeats of the same rule + detail into one line
      const groups = [];
      const byKey = new Map();
      for (const i of s) {
        const k = i.rule + "|" + i.detail;
        if (byKey.has(k)) { const g = byKey.get(k); g.n++; if (g.more.length < 3) g.more.push(i.selector); continue; }
        const g = { i, n: 1, more: [] };
        byKey.set(k, g); groups.push(g);
      }
      groups.slice(0, o.max).forEach((g) => lines.push(fmtIssue(g.i) + (g.n > 1 ? (g.more.some(Boolean) ? `\n      same on ${g.n - 1} more: ${g.more.filter(Boolean).join("; ")}${g.n - 1 > g.more.length ? " ..." : ""}` : `\n      repeated ${g.n} times`) : "")));
      if (groups.length > o.max) lines.push(`  ... ${groups.length - o.max} more (use --max or --json)`);
    }
    if (o.inventory) {
      lines.push("INVENTORY (value x uses)");
      for (const [k, v] of Object.entries(r.inventory)) {
        if (!v.length) continue;
        lines.push(`  ${k.padEnd(12)} ` + v.slice(0, 14).map((e) => `${e.value} x${e.count}`).join(", ") + (v.length > 14 ? ` ... (${v.length} total)` : ""));
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function parityReport(p, o) {
  const L = [];
  L.push(`ui-check PARITY  reference ${p.reference}  vs  target ${p.target}  ${p.viewport.name} ${p.viewport.width}x${p.viewport.height}`);
  L.push(`  matched ${p.matched}/${p.refCount} reference elements  |  pixels different ${p.pixels.pct}% (page heights ${p.pixels.heightA} vs ${p.pixels.heightB}px)`);
  L.push(`  screenshots: ${p.refShot} | ${p.tgtShot}  |  diff: ${p.pixels.diffImage}`);
  if (p.systematic.length) {
    L.push("[parity/style] STYLE DIFFERENCES, grouped (the same change on many elements is usually one token or shared component)");
    p.systematic.slice(0, o.max).forEach((g) => L.push(`  ${g.prop}: reference ${g.ref} -> target ${g.target}  on ${g.count} element(s), e.g. ${g.examples.join("; ")}`));
  }
  const sizes = p.diffs.filter((d) => d.kind === "size").sort((a, b) => b.area - a.area);
  if (sizes.length) {
    L.push("[parity/geometry] SIZE DIFFERENCES (largest first; usually caused by the style differences above)");
    sizes.slice(0, Math.min(o.max, 15)).forEach((d) => L.push(`  ${d.sel}${d.text ? ` "${d.text}"` : ""}: ${d.ref} -> ${d.target}`));
  }
  if (p.missing.length) { L.push("[parity/missing] MISSING IN TARGET (text present in reference)"); p.missing.slice(0, o.max).forEach((m) => L.push(`  ${m.tag} "${m.text}"  (reference ${m.sel})`)); }
  if (p.extra.length) { L.push("[parity/extra] EXTRA IN TARGET (text not in reference)"); p.extra.slice(0, o.max).forEach((m) => L.push(`  ${m.tag} "${m.text}"  (${m.sel})`)); }
  if (p.pixels.cells.length) { L.push("[parity/region] MOST CHANGED REGIONS (x,y,w,h in page px: % pixels different)"); p.pixels.cells.forEach((c) => L.push(`  ${c.x},${c.y},${c.w},${c.h}: ${c.pct}%`)); }
  if (p.inventory.length) { L.push("[parity/values] DESIGN VALUES ONLY ON ONE SIDE"); p.inventory.forEach((s) => L.push(`  ${s}`)); }
  L.push("");
  return L.join("\n");
}

function inventoryDelta(a, b) {
  const out = [];
  for (const k of ["fontFamily", "fontSize", "fontWeight", "textColor", "bgColor", "borderColor", "radius"]) {
    const A = new Set(a[k].map((e) => e.value)), B = new Set(b[k].map((e) => e.value));
    const onlyA = [...A].filter((v) => !B.has(v)).slice(0, 8), onlyB = [...B].filter((v) => !A.has(v)).slice(0, 8);
    if (onlyA.length) out.push(`${k} only in reference: ${onlyA.join(", ")}`);
    if (onlyB.length) out.push(`${k} only in target: ${onlyB.join(", ")}`);
  }
  return out;
}

// ---------------------------------------------------------------- main

const HELP = `usage: node ui-check.mjs <url|file.html> [more] [--viewports desktop,mobile] [--scheme light|dark]
  [--scope "<css>"] [--compare <reference-url>] [--inventory] [--base 4] [--wait ms] [--wait-for "<css>"]
  [--max 25] [--json] [--out dir] [--no-axe] [--timeout ms]
exit 0 clean, 2 findings, 1 tool error`;

export async function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.error("ui-check: " + e.message + "\n" + HELP); return 1; }
  if (o.help || !o.targets.length) { console.log(HELP); return o.help ? 0 : 1; }
  const urls = o.targets.map(toUrl);
  const refUrl = o.compare ? toUrl(o.compare) : null;
  for (const u of [...urls, ...(refUrl ? [refUrl] : [])]) if (!isLocal(u)) console.error(`ui-check: note: ${u} is not a local address. Use dev or test data only, never production client data.`);
  o.outDir = o.out ? path.resolve(o.out) : fs.mkdtempSync(path.join(os.tmpdir(), "ui-check-"));
  fs.mkdirSync(o.outDir, { recursive: true });
  const pw = loadPlaywright();
  if (!pw) { console.error("ui-check: Playwright not found. In the project run `npm i -D playwright-core` (uses installed Chrome/Edge) or `npm i -D playwright && npx playwright install chromium`."); return 1; }
  let browser;
  try {
    browser = await launch(pw);
    if (refUrl) {
      const all = [];
      let differs = false;
      for (const vp of o.viewports) {
        const R = await measure(browser, refUrl, vp, { ...o, axe: false }, { records: true });
        const T = await measure(browser, urls[0], vp, { ...o, axe: false }, { records: true });
        const pairs = matchRecords(R.records, T.records);
        const diffs = diffRecords(R.records, T.records, pairs);
        const matchedT = new Set(pairs.values());
        const missing = R.records.filter((r) => r.text.length >= 2 && !pairs.has(r.i)).map((r) => ({ tag: r.tag, text: r.text, sel: r.sel }));
        const extra = T.records.filter((t) => t.text.length >= 2 && !matchedT.has(t.i)).map((t) => ({ tag: t.tag, text: t.text, sel: t.sel }));
        const pixels = await pixelRegions(browser, R.shot, T.shot, path.join(o.outDir, `diff-${vp.name}.png`));
        const p = { reference: refUrl, target: urls[0], viewport: vp, refCount: R.records.length, matched: pairs.size, refShot: R.screenshot, tgtShot: T.screenshot,
          systematic: groupDiffs(diffs), diffs, missing, extra, pixels, inventory: inventoryDelta(R.inventory, T.inventory) };
        if (diffs.length || missing.length || extra.length || pixels.pct > 0.5) differs = true;
        all.push(p);
      }
      fs.writeFileSync(path.join(o.outDir, "parity.json"), JSON.stringify(all, null, 1));
      process.stdout.write(o.json ? JSON.stringify(all, null, 1) + "\n" : all.map((p) => parityReport(p, o)).join("\n") + `full report: ${path.join(o.outDir, "parity.json")}\n`);
      return differs ? 2 : 0;
    }
    const results = [];
    for (const u of urls) for (const vp of o.viewports) {
      const r = await measure(browser, u, vp, o);
      delete r.shot; delete r.records;
      results.push(r);
    }
    fs.writeFileSync(path.join(o.outDir, "report.json"), JSON.stringify(results, null, 1));
    process.stdout.write(o.json ? JSON.stringify(results, null, 1) + "\n" : textReport(results, o) + `full report: ${path.join(o.outDir, "report.json")}\n`);
    return results.some((r) => r.issues.some((i) => i.severity !== "info")) ? 2 : 0;
  } catch (e) {
    console.error("ui-check: " + (e && e.message ? e.message.split("\n")[0] : e));
    return 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
