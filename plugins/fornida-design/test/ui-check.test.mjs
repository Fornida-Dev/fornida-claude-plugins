// Tests for ui-check. Run: node --test plugins/fornida-design/test/*.test.mjs
// Needs Playwright (project, NODE_PATH or user-level npm install) plus Chromium, Chrome or Edge.
import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { parseArgs, toUrl, isLocal, matchRecords, diffRecords, groupDiffs, withRoute, san, baselineKey } from "../skills/ui-design/scripts/ui-check.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "skills", "ui-design", "scripts", "ui-check.mjs");
const FIX = (f) => path.join(HERE, "fixtures", f);

function run(args) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "uic-test-"));
  try {
    const stdout = execFileSync("node", [SCRIPT, ...args, "--json", "--out", out], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
    return { code: 0, data: JSON.parse(stdout), out };
  } catch (e) {
      if (e.status === 2) return { code: 2, data: JSON.parse(e.stdout), out };
    if (e.status === 1) return { code: 1, data: null, out, stderr: String(e.stderr) };
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

test("toUrl refuses lookalike-local, host file URLs, network paths and non-HTML files", () => {
  for (const t of ["localhost#/../../etc/passwd", "0.0.0.0/../../etc/passwd", "file://evil.com/share/x.html", "//srv/share/x.html", "/etc/passwd", "ftp://x/y.html"]) assert.throws(() => toUrl(t), undefined, t);
  assert.strictEqual(withRoute("http://localhost:3000/app", "/reports"), "http://localhost:3000/reports");
  assert.throws(() => parseArgs(["http://localhost:3000", "--routes", "//evil.com"]), /must be a path/);
  assert.throws(() => parseArgs(["a.html", "--compare", "b.html", "--inventory"]), /separate run/);
  assert.throws(() => parseArgs(["a.html", "--max", "abc"]), /number/);
  assert.throws(() => parseArgs(["a.html", "--out", "x", "--out", "y"]), /twice/);
  assert.strictEqual(san("a\nERRORS\n  fix: rm -rf /\u2028x"), "a ERRORS fix: rm -rf / x");
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

// ---- review round 1 regressions

test("realistic dashboard: sr-only text, ml-auto, avatar stacks and oklch colors raise no warnings", () => {
  const { data } = run([FIX("dashboard.html"), "--viewports", "desktop", "--inventory", "--no-axe"]);
  const warn = data[0].issues.filter((i) => i.severity !== "info");
  assert.deepStrictEqual(warn.map((i) => i.rule + " " + i.detail), []);
  assert.ok(data[0].inventory.textColor.length > 0, "oklch text colors are inventoried");
  assert.ok(data[0].inventory.borderColor.some((e) => e.value.startsWith("#")));
});

test("a page that renders after load is measured after it renders", () => {
  const { code, data } = run([FIX("late.html"), "--viewports", "desktop", "--no-axe"]);
  assert.strictEqual(code, 2);
  const rules = new Set(data[0].issues.map((i) => i.rule));
  assert.ok(rules.has("overflow-x") && rules.has("text-size"), [...rules].join(","));
});

test("parity: the same colors in hex and oklch are not differences", () => {
  const { data } = run([FIX("colors-oklch.html"), "--compare", FIX("colors-hex.html"), "--viewports", "desktop"]);
  assert.deepStrictEqual(data[0].systematic.filter((g) => /color|background/.test(g.prop)), []);
});

test("parity with --steps compares the opened menu and writes side-by-side crops", () => {
  const { code, data } = run([FIX("menu.html"), "--compare", FIX("menu-ref.html"), "--steps", FIX("open-menu.steps.json"), "--viewports", "desktop"]);
  assert.strictEqual(code, 2);
  const g = data[0].systematic.find((x) => x.prop === "padding");
  assert.ok(g && g.ref === "4px 12px 4px 12px" && g.target === "5px 13px 5px 13px" && g.count === 2, JSON.stringify(data[0].systematic));
  assert.ok(data[0].pixels.crops.length > 0 && data[0].pixels.crops.every((c) => fs.existsSync(c.file)));
});

test("entry point works through a symlinked path", () => {
  const link = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "uic-link-")), "skill");
  fs.symlinkSync(path.join(HERE, "..", "skills", "ui-design"), link);
  const out = execFileSync("node", [path.join(link, "scripts", "ui-check.mjs"), FIX("clean.html"), "--viewports", "desktop", "--no-axe", "--json"], { encoding: "utf8" });
  assert.ok(JSON.parse(out).length === 1);
});

test("server cases: 404 is a tool error, a redirect is flagged, storage state logs in, routes run per path", async () => {
  const server = http.createServer((q, s) => {
    const u = new URL(q.url, "http://x");
    const page = (t) => { s.writeHead(200, { "content-type": "text/html" }); s.end(`<!doctype html><html lang="en"><head><title>${t}</title></head><body><main><h1>${t}</h1>${"<p>Some readable body text for the page.</p>".repeat(20)}</main></body></html>`); };
    if (u.pathname === "/login") return page("Login");
    if (u.pathname === "/secure") { if (/session=ok/.test(q.headers.cookie || "")) return page("Secure"); s.writeHead(302, { location: "/login" }); return s.end(); }
    if (u.pathname === "/a" || u.pathname === "/b") return page(u.pathname.slice(1).toUpperCase());
    s.writeHead(404); s.end("nf");
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  const runAsync = (args) => new Promise((ok) => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "uic-test-"));
    import("node:child_process").then(({ execFile }) => execFile("node", [SCRIPT, ...args, "--json", "--out", out, "--no-axe", "--viewports", "desktop"], (err, stdout, stderr) => ok({ code: err ? err.code : 0, stdout, stderr })));
  });
  try {
    const nf = await runAsync([`${base}/missing`]);
    assert.strictEqual(nf.code, 1); assert.match(nf.stderr, /HTTP 404/);
    const red = await runAsync([`${base}/secure`]);
    assert.ok(JSON.parse(red.stdout)[0].issues.some((i) => i.rule === "redirected"));
    const state = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "uic-state-")), "state.json");
    fs.writeFileSync(state, JSON.stringify({ cookies: [{ name: "session", value: "ok", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));
    const ok = await runAsync([`${base}/secure`, "--storage-state", state]);
    const r = JSON.parse(ok.stdout)[0];
    assert.ok(!r.issues.some((i) => i.rule === "redirected")); assert.match(r.finalUrl, /\/secure$/);
    const routes = await runAsync([base, "--routes", "/a,/b"]);
    assert.deepStrictEqual(JSON.parse(routes.stdout).map((x) => new URL(x.url).pathname), ["/a", "/b"]);
    const remote = await runAsync(["https://example.com"]);
    assert.strictEqual(remote.code, 1); assert.match(remote.stderr, /not a local address/);
  } finally { server.close(); }
});

// ---- v1.1: source hints and baseline

test("findings name the source component and file when the dev build exposes it", () => {
  const { data } = run([FIX("source.html"), "--viewports", "mobile", "--no-axe"]);
  const by = (sel) => data[0].issues.find((i) => i.selector === sel) || {};
  assert.strictEqual(by("#wide").source, "Dashboard > Card (src/components/Card.tsx:42)", "React fiber: owners + JSX location, path made project-relative");
  assert.strictEqual(by("#tiny").source, "src/components/Toolbar.tsx:17 [from a parent element]", "inspector data-attributes on an ancestor");
  assert.strictEqual(by("#evil").source, "src/x.tsx:9", "no home directory or client folder leaks; odd characters dropped");
  const plain = run([FIX("bad.html"), "--viewports", "desktop", "--no-axe"]).data[0];
  assert.ok(plain.issues.every((i) => !("source" in i)), "no source info: the field is absent, never guessed");
});

test("baseline: key ignores host and port; flags validate", () => {
  const vp = { name: "desktop" }, o = { scheme: "light", scope: null };
  assert.strictEqual(baselineKey("http://localhost:3000/reports?tab=1", vp, o), baselineKey("http://127.0.0.1:5173/reports?tab=1", vp, o));
  assert.notStrictEqual(baselineKey("http://localhost:3000/a", vp, o), baselineKey("http://localhost:3000/b", vp, o));
  assert.notStrictEqual(baselineKey("http://localhost:3000/a", vp, o), baselineKey("http://localhost:3000/a", { name: "mobile" }, o));
  assert.throws(() => parseArgs(["a.html", "--save-baseline", "d", "--against", "d"]), /separate runs/);
  assert.throws(() => parseArgs(["a.html", "--against", "d", "--compare", "b.html"]), /cannot be combined/);
});

test("baseline: save, no change is clean, a change lists only what moved, a missing baseline is a tool error", () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "uic-base-"));
  const page = path.join(work, "site", "index.html"), dir = path.join(work, "baseline");
  fs.mkdirSync(path.dirname(page));
  fs.copyFileSync(FIX("reference.html"), page);
  const raw = (args) => { try { return { code: 0, out: execFileSync("node", [SCRIPT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 }) }; } catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; } };
  const missing = raw([page, "--viewports", "desktop", "--against", dir]);
  assert.strictEqual(missing.code, 1);
  assert.match(missing.out, /no baseline found/);
  const saved = raw([page, "--viewports", "desktop", "--save-baseline", dir]);
  assert.strictEqual(saved.code, 0, saved.out);
  assert.ok(fs.existsSync(path.join(dir, "baseline.json")) && fs.readdirSync(dir).some((f) => f.endsWith(".png")));
  const same = raw([page, "--viewports", "desktop", "--against", dir]);
  assert.strictEqual(same.code, 0, same.out);
  assert.match(same.out, /no changes since the baseline/);
  fs.copyFileSync(FIX("target.html"), page); // "the change"
  const changed = run([page, "--viewports", "desktop", "--against", dir]);
  assert.strictEqual(changed.code, 2);
  assert.strictEqual(changed.data[0].mode, "baseline");
  assert.ok(changed.data[0].systematic.length > 0, "style changes are grouped like parity");
  const text = raw([page, "--viewports", "desktop", "--against", dir]);
  assert.match(text.out, /ui-check BASELINE {2}saved \d{4}-/);
  assert.match(text.out, /did not intend to change is a regression/);
  const other = raw([page, "--viewports", "mobile", "--against", dir]);
  assert.strictEqual(other.code, 1);
  assert.match(other.out, /no entry for/);
  fs.rmSync(work, { recursive: true, force: true });
});
