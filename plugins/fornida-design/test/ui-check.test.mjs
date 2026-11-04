// Tests for ui-check. Run: node --test plugins/fornida-design/test/
// Needs Playwright resolvable from the repo or globally, plus a Chromium/Chrome/Edge.
import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseArgs, toUrl, isLocal, matchRecords, diffRecords, groupDiffs } from "../skills/design/scripts/ui-check.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "skills", "design", "scripts", "ui-check.mjs");
const FIX = (f) => path.join(HERE, "fixtures", f);

function run(args) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "uic-test-"));
  try {
    const stdout = execFileSync("node", [SCRIPT, ...args, "--json", "--out", out], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
    return { code: 0, data: JSON.parse(stdout), out };
  } catch (e) {
    if (e.status === 2) return { code: 2, data: JSON.parse(e.stdout), out };
    throw new Error(`exit ${e.status}: ${e.stderr}`);
  }
}
const rules = (r) => new Set(r.issues.map((i) => i.rule));

// ---- pure helpers

test("parseArgs: viewports, defaults, validation", () => {
  const o = parseArgs(["a.html", "--viewports", "tablet,1024x768", "--scheme", "dark", "--base", "8"]);
  assert.deepStrictEqual(o.viewports.map((v) => [v.name, v.width, v.height]), [["tablet", 834, 1112], ["1024x768", 1024, 768]]);
  assert.strictEqual(o.scheme, "dark");
  assert.strictEqual(o.base, 8);
  assert.deepStrictEqual(parseArgs(["x"]).viewports.map((v) => v.name), ["desktop", "mobile"]);
  assert.throws(() => parseArgs(["x", "--viewports", "huge"]), /bad viewport/);
  assert.throws(() => parseArgs(["x", "--bogus"]), /unknown option/);
  assert.throws(() => parseArgs(["a", "b", "--compare", "c"]), /exactly one target/);
  assert.throws(() => parseArgs(["a", "--scheme", "sepia"]), /light or dark/);
});

test("toUrl and isLocal", () => {
  assert.strictEqual(toUrl("localhost:3000/x"), "http://localhost:3000/x");
  assert.match(toUrl(FIX("clean.html")), /^file:\/\//);
  assert.throws(() => toUrl("nope-not-here.html"), /not found/);
  for (const u of ["http://localhost:5173", "http://127.0.0.1:8080/a", "http://192.168.1.4", "http://myapp.local", "file:///x.html"]) assert.ok(isLocal(u), u);
  for (const u of ["https://example.com", "https://app.client.com/login"]) assert.ok(!isLocal(u), u);
});

test("parity matching: text, ids, then containers bottom-up; padding diffs merge", () => {
  const S = (o = {}) => ({ fontSize: "16px", fontWeight: "400", lineHeight: "24px", letterSpacing: "normal", fontFamily: "Inter", textTransform: "none", textAlign: "left",
    color: "rgb(0, 0, 0)", backgroundColor: "rgba(0, 0, 0, 0)", borderTopWidth: "0px", borderTopColor: "rgb(0, 0, 0)", borderBottomWidth: "0px", borderBottomColor: "rgb(0, 0, 0)",
    borderLeftWidth: "0px", borderTopLeftRadius: "0px", boxShadow: "none", paddingTop: "8px", paddingRight: "16px", paddingBottom: "8px", paddingLeft: "16px", rowGap: "normal", columnGap: "normal", opacity: "1", ...o });
  const rec = (i, parent, tag, text, s, extra = {}) => ({ i, parent, tag, sel: `${tag}${i}`, text, label: text, id: "", testid: "", aria: "", alt: "", href: "", x: 0, y: i * 10, w: 100, h: 20, s, ...extra });
  const ref = [rec(0, -1, "div", "", S()), rec(1, 0, "button", "Save", S()), rec(2, 0, "button", "Cancel", S()), rec(3, -1, "h1", "Title", S({ fontSize: "32px" }))];
  const tgt = [rec(0, -1, "h1", "Title", S({ fontSize: "28px" })), rec(1, -1, "div", "", S()), rec(2, 1, "button", "Cancel", S({ paddingTop: "12px", paddingBottom: "12px" })), rec(3, 1, "button", "Save", S({ paddingTop: "12px", paddingBottom: "12px" }))];
  const pairs = matchRecords(ref, tgt);
  assert.strictEqual(pairs.get(1), 3, "Save matches Save");
  assert.strictEqual(pairs.get(3), 0, "Title matches Title");
  assert.strictEqual(pairs.get(0), 1, "container matched through its children");
  const groups = groupDiffs(diffRecords(ref, tgt, pairs));
  const pad = groups.find((g) => g.prop === "padding");
  assert.ok(pad && pad.count === 2 && pad.ref === "8px 16px 8px 16px" && pad.target === "12px 16px 12px 16px", JSON.stringify(groups));
  assert.ok(groups.some((g) => g.prop === "font-size" && g.ref === "32px" && g.target === "28px"));
});

// ---- browser runs

test("bad page: every planted problem is reported with numbers", () => {
  const { code, data } = run([FIX("bad.html"), "--viewports", "desktop"]);
  assert.strictEqual(code, 2);
  const r = data[0];
  const got = rules(r);
  for (const rule of ["overflow-x", "overlap", "truncation", "spacing-outlier", "off-scale", "tap-target", "text-size", "near-duplicate",
    "gradient-text", "accent-border", "nested-card", "focus-invisible", "broken-image", "a11y/color-contrast"]) assert.ok(got.has(rule), "missing " + rule);
  const off = r.issues.find((i) => i.rule === "off-scale");
  assert.match(off.detail, /^13px used/);
  const sp = r.issues.find((i) => i.rule === "spacing-outlier");
  assert.deepStrictEqual(sp.data.gaps, [16, 4, 16]);
  const cc = r.issues.find((i) => i.rule === "a11y/color-contrast");
  assert.match(cc.detail, /contrast 1\.9\d?:1/);
  assert.ok(fs.existsSync(r.screenshot));
});

test("clean page: no errors or warnings on desktop or mobile", () => {
  const { code, data } = run([FIX("clean.html")]);
  assert.strictEqual(code, 0, JSON.stringify(data.map((r) => r.issues.filter((i) => i.severity !== "info")), null, 1));
  assert.strictEqual(data.length, 2);
});

test("inventory lists the design values in use", () => {
  const { data } = run([FIX("clean.html"), "--viewports", "desktop", "--inventory"]);
  const inv = data[0].inventory;
  assert.ok(inv.fontSize.some((e) => e.value === "32px"));
  assert.ok(inv.textColor.some((e) => e.value === "#1f2937"));
});

test("scope limits checks to one region", () => {
  const { data } = run([FIX("bad.html"), "--viewports", "desktop", "--scope", ".row", "--no-axe"]);
  const got = rules(data[0]);
  assert.ok(got.has("spacing-outlier"));
  assert.ok(!got.has("broken-image") && !got.has("text-size"));
});

test("parity: reports the token-level change, the extra element and changed regions", () => {
  const { code, data } = run([FIX("target.html"), "--compare", FIX("reference.html"), "--viewports", "desktop"]);
  assert.strictEqual(code, 2);
  const p = data[0];
  assert.ok(p.systematic.some((g) => g.prop === "padding" && g.ref === "8px 16px 8px 16px" && g.target === "12px 20px 12px 20px" && g.count === 2));
  assert.ok(p.systematic.some((g) => g.prop === "font-size" && g.ref === "32px" && g.target === "28px"));
  assert.ok(p.extra.some((e) => e.text === "Brand new line"));
  assert.strictEqual(p.missing.length, 0);
  assert.ok(p.pixels.pct > 0 && p.pixels.cells.length > 0 && fs.existsSync(p.pixels.diffImage));
  assert.notStrictEqual(p.refShot, p.tgtShot, "reference and target screenshots are separate files");
});

test("parity: identical pages report no differences", () => {
  const { code, data } = run([FIX("reference.html"), "--compare", FIX("clean.html"), "--viewports", "desktop"]);
  assert.strictEqual(code, 0, JSON.stringify(data[0].systematic));
});

test("bad input exits 1 with a message", () => {
  assert.throws(() => execFileSync("node", [SCRIPT, "nope.html"], { stdio: "pipe" }), (e) => e.status === 1 && /not found/.test(e.stderr.toString()));
});
