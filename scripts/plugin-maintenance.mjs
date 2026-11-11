#!/usr/bin/env node
// Fornida plugin maintenance check (run by .github/workflows/plugin-updates.yml, or locally).
//
// Runs AFTER setup-fornida-plugins.ps1 has re-vendored the automated plugins and the result is
// committed on a work branch. Read-only on the repo: it inspects, validates and writes a report.
//
//   node scripts/plugin-maintenance.mjs --base <sha> [--osv osv.json --osv-exit N]
//        [--revendor-exit N] [--validate-exit N --validate-log file] [--out report.md] [--json summary.json]
//
// Exit 1 when it finds an ERROR (broken manifest, missing hook script, syntax error, possible
// secret, re-vendor or validator failure). Advisories (CVEs in dev lockfiles, newer pinned tools,
// upstream updates that need a manual re-vendor) are reported but do not fail the run.
//
// Never prints a secret value: secret hits report file:line and the pattern name only.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

// ---------- small helpers ----------

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, ...opts });
}
function tryJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return undefined; } }
function walk(dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.isFile()) out.push(p);
  }
  return out;
}
const rel = (root, p) => path.relative(root, p).split(path.sep).join("/");

// ---------- VENDOR.md ----------

// "- name  <=  github.com/owner/repo (...) @ <sha>" -> { name, repo, sha }
export function parseVendor(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^- (\S+)\s+<=\s+github\.com\/([\w.-]+\/[\w.-]+)\b.*@\s*([0-9a-f]{7,40})\b/);
    if (m) out.push({ name: m[1], repo: m[2], sha: m[3] });
  }
  return out;
}

// ---------- structural checks (mirror the hosted marketplace validator's known rejections) ----------

function frontmatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const l of m[1].split(/\r?\n/)) { const kv = l.match(/^([A-Za-z_-]+):\s*(.*)$/); if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, ""); }
  return fm;
}

// All hook command strings from a hooks object ({ hooks: { Event: [ { hooks: [ {command} ] } ] } }).
export function hookCommands(obj) {
  const cmds = [];
  const events = obj && typeof obj === "object" ? (obj.hooks && typeof obj.hooks === "object" ? obj.hooks : obj) : {};
  for (const list of Object.values(events)) {
    if (!Array.isArray(list)) continue;
    for (const group of list) for (const h of (group && group.hooks) || []) if (h && typeof h.command === "string") cmds.push(h.command);
  }
  return cmds;
}
// Plugin-relative files a hook command runs: anything spelled ${CLAUDE_PLUGIN_ROOT}/<path>.
export function hookFiles(cmd) {
  return [...String(cmd).matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}[\\/]([^"'\s]+)/g)].map((m) => m[1].replace(/\\/g, "/"));
}

export function checkPlugin(root, pluginDir) {
  const errors = [], hookScripts = [];
  const name = path.basename(pluginDir);
  const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  const manifest = tryJson(manifestPath);
  if (!fs.existsSync(manifestPath)) errors.push(`${name}: missing .claude-plugin/plugin.json`);
  else if (!manifest) errors.push(`${name}: .claude-plugin/plugin.json is not valid JSON`);
  else if (!manifest.name) errors.push(`${name}: plugin.json has no "name"`);

  const files = walk(pluginDir);
  // nested plugin manifests (hosted validator: "plugin.json must be at the plugin root")
  for (const f of files) {
    const r = rel(pluginDir, f);
    if (/(^|\/)\.claude-plugin\/plugin\.json$/.test(r) && r !== ".claude-plugin/plugin.json") errors.push(`${name}: nested plugin manifest ${r}`);
  }
  // skills: frontmatter present, names unique (hosted validator: "Duplicate skill name")
  const seen = new Map();
  for (const f of files.filter((x) => path.basename(x) === "SKILL.md")) {
    const r = rel(pluginDir, f);
    if (/(^|\/)(tests?|fixtures|examples?|docs)\//.test(r)) continue;
    const fm = frontmatter(fs.readFileSync(f, "utf8"));
    if (!fm || !fm.name || !fm.description) { errors.push(`${name}: ${r} has no name/description frontmatter`); continue; }
    if (seen.has(fm.name)) errors.push(`${name}: duplicate skill name "${fm.name}" in ${seen.get(fm.name)} and ${r}`);
    else seen.set(fm.name, r);
  }
  // hooks: inline in plugin.json, a path in plugin.json, or hooks/hooks.json
  const hookSources = [];
  if (manifest && manifest.hooks && typeof manifest.hooks === "object") hookSources.push(["plugin.json", manifest.hooks]);
  const hookPaths = new Set([path.join(pluginDir, "hooks", "hooks.json")]);
  if (manifest && typeof manifest.hooks === "string") hookPaths.add(path.join(pluginDir, manifest.hooks));
  for (const hp of hookPaths) {
    if (!fs.existsSync(hp)) { if (manifest && typeof manifest.hooks === "string" && hp === path.join(pluginDir, manifest.hooks)) errors.push(`${name}: plugin.json hooks path ${manifest.hooks} does not exist`); continue; }
    const obj = tryJson(hp);
    if (!obj) { errors.push(`${name}: ${rel(pluginDir, hp)} is not valid JSON`); continue; }
    hookSources.push([rel(pluginDir, hp), obj]);
  }
  for (const [src, obj] of hookSources) {
    for (const cmd of hookCommands(obj)) {
      for (const f of hookFiles(cmd)) {
        const abs = path.join(pluginDir, f);
        if (!fs.existsSync(abs)) errors.push(`${name}: hook in ${src} runs ${f}, which does not exist`);
        else hookScripts.push(rel(root, abs));
      }
    }
  }
  return { errors, hookScripts: [...new Set(hookScripts)] };
}

// Syntax-check a script without running it. Unknown types are skipped (null).
export function syntaxError(file) {
  try {
    if (/\.(m?js|cjs)$/.test(file)) sh(process.execPath, ["--check", file]);
    else if (/\.sh$/.test(file)) sh("bash", ["-n", file]);
    else if (/\.py$/.test(file)) sh("python3", ["-I", "-c", "import ast,sys; ast.parse(open(sys.argv[1], encoding='utf-8').read())", file]);
    else return null;
    return "";
  } catch (e) {
    return String(e.stderr || e.message).split(/\r?\n/).filter(Boolean).slice(0, 2).join(" ").slice(0, 300);
  }
}

// ---------- secrets (high-confidence shapes only; never echo the match) ----------

const SECRET_PATTERNS = [
  ["private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ["Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{30,}/],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9]{40,}\b/],
  ["Slack token", /\bxox[abposr]-[A-Za-z0-9-]{20,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Azure storage key", /AccountKey=[A-Za-z0-9+/]{80,}={0,2}/],
];
export function secretHits(text) {
  const hits = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (line.length > 4000) return; // minified bundles: not a credential file
    for (const [label, re] of SECRET_PATTERNS) if (re.test(line)) hits.push({ line: i + 1, label });
  });
  return hits;
}

// ---------- OSV-Scanner JSON summary ----------

export function summarizeOsv(report, root = "") {
  const rows = [];
  for (const res of (report && report.results) || []) {
    const src = String((res.source && res.source.path) || "").replace(root ? root.replace(/\\/g, "/") + "/" : "", "");
    for (const p of res.packages || []) {
      const vulns = p.vulnerabilities || [];
      if (!vulns.length) continue;
      const sev = (p.groups || []).map((g) => parseFloat(g.max_severity)).filter((n) => !Number.isNaN(n));
      const max = sev.length ? Math.max(...sev) : null;
      rows.push({ source: src, name: p.package.name, version: p.package.version, ecosystem: p.package.ecosystem || "", pkg: `${p.package.name}@${p.package.version}`, ids: vulns.map((v) => v.id), max });
    }
  }
  rows.sort((a, b) => (b.max ?? -1) - (a.max ?? -1));
  return rows;
}
const sevLabel = (n) => (n == null ? "unknown" : n >= 9 ? "critical" : n >= 7 ? "high" : n >= 4 ? "medium" : "low");

// ---------- runtime exposure: does code that runs on staff machines load the vulnerable package? ----------
// Claude Code never installs a plugin's dependencies, so a lockfile entry only matters when the plugin
// SHIPS the package (a vendored node_modules) or its runtime code (hooks, skills, agents, commands, src)
// imports it by name. Dev tooling (root scripts/, src/ CLIs, tests, site/, docs) does not run on staff machines;
// a folder a hook runs from (caveman's src/hooks) does, and run() adds those files.
const RUNTIME_DIRS = /^(hooks|skills|agents|commands)\//;
const NOT_RUNTIME = /(^|\/)(tests?|__tests__|fixtures|examples?|docs|site)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
export function bareSpecifiers(text) {
  const out = new Set();
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']([^"'./][^"']*)["']/gm;
  for (const m of String(text).matchAll(re)) {
    let spec = m[1].replace(/^npm:/, "");
    if (spec.startsWith("node:")) continue;
    const parts = spec.split("/");
    out.add(spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]);
  }
  return out;
}
export function runtimePackages(pluginDir, extraFiles = []) {
  const imported = new Set(), shipped = new Map();
  const files = walk(pluginDir).filter((f) => { const r = rel(pluginDir, f); return RUNTIME_DIRS.test(r) && !NOT_RUNTIME.test(r) && /\.([cm]?js|[cm]?ts|jsx|tsx)$/.test(f); });
  for (const f of [...files, ...extraFiles]) { try { bareSpecifiers(fs.readFileSync(f, "utf8")).forEach((x) => imported.add(x)); } catch { /* unreadable */ } }
  // a shipped node_modules is real runtime code (walk() skips node_modules, so look for it directly)
  (function scan(dir, depth) {
    if (depth > 6) return;
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (!e.isDirectory() || e.name === ".git") continue;
      const p = path.join(dir, e.name);
      if (e.name === "node_modules") {
        for (const pj of walkManifests(p)) { const j = tryJson(pj); if (j && j.name) { if (!shipped.has(j.name)) shipped.set(j.name, new Set()); shipped.get(j.name).add(String(j.version)); } }
      } else scan(p, depth + 1);
    }
  })(pluginDir, 0);
  return { imported, shipped };
}
function walkManifests(nm) {
  const out = [];
  let ents = []; try { ents = fs.readdirSync(nm, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    const p = path.join(nm, e.name);
    if (e.name.startsWith("@")) { for (const s of fs.readdirSync(p, { withFileTypes: true })) if (s.isDirectory()) out.push(path.join(p, s.name, "package.json")); }
    else out.push(path.join(p, "package.json"));
  }
  return out;
}
// row -> "runtime" (shipped or imported by runtime code) | "build"
export function exposureOf(row, runtimeByPlugin) {
  const m = String(row.source).match(/^plugins\/([^/]+)\//);
  const rt = m && runtimeByPlugin.get(m[1]);
  if (!rt || (row.ecosystem && row.ecosystem !== "npm")) return "build";
  if (rt.shipped.has(row.name) && rt.shipped.get(row.name).has(String(row.version))) return "runtime";
  return rt.imported.has(row.name) ? "runtime" : "build";
}

// ---------- network lookups (gh for GitHub, fetch for npm/OSV); failures become warnings ----------

function upstreamHead(repo) {
  try { return sh("gh", ["api", `repos/${repo}/commits/HEAD`, "--jq", ".sha"]).trim(); } catch { return null; }
}
async function npmLatest(pkg) {
  try { const r = await fetch(`https://registry.npmjs.org/${pkg}/latest`); return r.ok ? (await r.json()).version : null; } catch { return null; }
}
async function osvQuery(pkg, version) {
  try {
    const r = await fetch("https://api.osv.dev/v1/query", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ package: { name: pkg, ecosystem: "npm" }, version }) });
    if (!r.ok) return null;
    return ((await r.json()).vulns || []).map((v) => v.id);
  } catch { return null; }
}

// ---------- main ----------

function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) { const k = argv[i].slice(2); a[k] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true"; }
  return a;
}

export async function run(root, opt) {
  const errors = [], warnings = [], advisories = [], review = [];
  const lines = [];
  const base = opt.base;

  // what changed against the base commit
  let changed = [];
  if (base) {
    try {
      changed = sh("git", ["-C", root, "diff", "--name-status", base, "HEAD", "--", "plugins", "VENDOR.md"]).trim().split(/\r?\n/).filter(Boolean)
        .map((l) => { const [st, ...p] = l.split(/\t/); return { status: st[0], file: p[p.length - 1] }; });
    } catch (e) { warnings.push(`could not diff against base ${base}: ${String(e.message).split("\n")[0]}`); }
  }

  if (opt["revendor-exit"] && opt["revendor-exit"] !== "0") errors.push(`setup-fornida-plugins.ps1 failed (exit ${opt["revendor-exit"]}); see the workflow log`);
  if (opt["validate-exit"] && opt["validate-exit"] !== "0") {
    const log = opt["validate-log"] && fs.existsSync(opt["validate-log"]) ? fs.readFileSync(opt["validate-log"], "utf8") : "";
    const detail = log.split(/\r?\n/).filter((l) => /✘|error|invalid/i.test(l)).slice(0, 8).map((l) => l.trim()).join("; ");
    errors.push(`claude plugin validate failed (exit ${opt["validate-exit"]})${detail ? ": " + detail : ""}`);
  }

  // structural checks for every marketplace plugin
  const market = tryJson(path.join(root, ".claude-plugin", "marketplace.json"));
  if (!market) errors.push("`.claude-plugin/marketplace.json` is missing or not valid JSON");
  const hookScripts = new Set();
  for (const p of (market && market.plugins) || []) {
    const dir = path.join(root, String(p.source || "").replace(/^\.\//, ""));
    if (!fs.existsSync(dir)) { errors.push(`marketplace lists ${p.name} at ${p.source}, which does not exist`); continue; }
    const r = checkPlugin(root, dir);
    errors.push(...r.errors);
    r.hookScripts.forEach((s) => hookScripts.add(s));
  }

  // syntax: every hook script, plus every changed script
  const toCheck = new Set([...hookScripts, ...changed.filter((c) => c.status !== "D").map((c) => c.file)]);
  let checked = 0;
  for (const f of toCheck) {
    const abs = path.join(root, f);
    if (!fs.existsSync(abs)) continue;
    const err = syntaxError(abs);
    if (err === null) continue;
    checked++;
    if (err) errors.push(`syntax error in ${f}: ${err}`);
  }

  // secrets in changed files
  for (const c of changed) {
    if (c.status === "D") continue;
    const abs = path.join(root, c.file);
    let text; try { const st = fs.statSync(abs); if (st.size > 2 * 1024 * 1024) continue; text = fs.readFileSync(abs, "utf8"); } catch { continue; }
    if (text.includes("\u0000")) continue; // binary
    for (const h of secretHits(text)) errors.push(`possible ${h.label} in ${c.file}:${h.line} (value not shown; check before merging)`);
  }

  // review-first: changed files that execute or change terms
  for (const c of changed) {
    const f = c.file;
    if (hookScripts.has(f) || /(^|\/)hooks\/hooks\.json$|\/\.claude-plugin\/plugin\.json$|\.(sh|cmd|ps1|bat)$|(^|\/)(bin|scripts)\//.test(f)) review.push(`${c.status} ${f}${hookScripts.has(f) ? " (runs as a hook)" : ""}`);
    else if (/(^|\/)(LICEN[CS]ES?\/|(LICEN[CS]E|COPYING|NOTICE)[^/]*$)/i.test(f)) review.push(`${c.status} ${f} (license/terms changed)`);
    else if (/(^|\/)package\.json$/.test(f)) review.push(`${c.status} ${f} (check "scripts" for install hooks)`);
  }

  // upstream drift: any pin still behind upstream needs a manual re-vendor (skip=$true plugins)
  const vendorNow = parseVendor(fs.readFileSync(path.join(root, "VENDOR.md"), "utf8"));
  let vendorBase = [];
  if (base) { try { vendorBase = parseVendor(sh("git", ["-C", root, "show", `${base}:VENDOR.md`])); } catch { /* first run */ } }
  const repinned = [], manual = [];
  for (const v of vendorNow) {
    const before = vendorBase.find((b) => b.name === v.name);
    if (before && before.sha !== v.sha) repinned.push({ ...v, from: before.sha });
    if (opt["no-network"]) continue;
    const head = upstreamHead(v.repo);
    if (!head) { warnings.push(`could not read upstream HEAD for ${v.repo}`); continue; }
    if (!head.startsWith(v.sha) && !v.sha.startsWith(head)) manual.push({ ...v, head });
  }
  for (const m of manual) advisories.push(`${m.name} has upstream changes not vendored (manual re-vendor: see VENDOR.md): https://github.com/${m.repo}/compare/${m.sha}...${m.head}`);

  // pinned tools in fornida-design: newer releases and known CVEs in the pinned version
  const pins = [];
  try {
    const axe = fs.readFileSync(path.join(root, "plugins/fornida-design/skills/ui-design/vendor/axe.min.js"), "utf8").slice(0, 200).match(/axe v(\d+\.\d+\.\d+)/);
    if (axe) pins.push({ pkg: "axe-core", version: axe[1], where: "plugins/fornida-design/skills/ui-design/vendor/axe.min.js" });
    const pw = fs.readFileSync(path.join(root, "plugins/fornida-design/skills/ui-design/scripts/ui-check.mjs"), "utf8").match(/PINNED_PW\s*=\s*"(\d+\.\d+\.\d+)"/);
    if (pw) pins.push({ pkg: "playwright-core", version: pw[1], where: "ui-check.mjs PINNED_PW (+ README, SKILL.md)" });
  } catch { /* fornida-design absent */ }
  for (const p of pins) {
    if (opt["no-network"]) break;
    const [latest, vulns] = await Promise.all([npmLatest(p.pkg), osvQuery(p.pkg, p.version)]);
    if (vulns && vulns.length) errors.push(`${p.pkg}@${p.version} (pinned in ${p.where}) has known vulnerabilities: ${vulns.join(", ")}`);
    if (vulns === null) warnings.push(`could not query OSV for ${p.pkg}@${p.version}`);
    if (latest && latest !== p.version) advisories.push(`${p.pkg} ${latest} is out (pinned ${p.version} in ${p.where}); bump by hand and run plugins/fornida-design tests`);
  }

  // OSV-Scanner over vendored lockfiles (dev/build deps: Claude plugins do not install them at runtime)
  let osvRows = [];
  if (opt.osv) {
    const code = opt["osv-exit"] || "0";
    const rep = tryJson(opt.osv);
    if (code !== "0" && code !== "1") warnings.push(`osv-scanner did not complete (exit ${code}); lockfile CVEs not checked this run`);
    else if (!rep) warnings.push("osv-scanner output missing or unreadable");
    else osvRows = summarizeOsv(rep, root);
  }
  const runtimeByPlugin = new Map();
  for (const r of osvRows) {
    const m = String(r.source).match(/^plugins\/([^/]+)\//);
    if (m && !runtimeByPlugin.has(m[1])) {
      const dir = path.join(root, "plugins", m[1]);
      // every script in a folder a hook runs from (its local imports live beside it)
      const hookDirs = new Set([...hookScripts].filter((h) => h.startsWith(`plugins/${m[1]}/`)).map((h) => path.dirname(path.join(root, h))));
      const extra = [...hookDirs].flatMap((d) => walk(d)).filter((f) => /\.([cm]?js|[cm]?ts)$/.test(f) && !NOT_RUNTIME.test(rel(dir, f)));
      runtimeByPlugin.set(m[1], runtimePackages(dir, extra));
    }
    r.exposure = exposureOf(r, runtimeByPlugin);
  }
  const runtimeRows = osvRows.filter((r) => r.exposure === "runtime"), buildRows = osvRows.filter((r) => r.exposure === "build");
  for (const r of runtimeRows) {
    const msg = `${r.pkg} (${sevLabel(r.max)}) is loaded by code that runs on staff machines (${r.source.replace(/\/[^/]*$/, "")}): ${r.ids.slice(0, 4).join(", ")}`;
    if (r.max != null && r.max >= 7) errors.push(msg); else advisories.push(msg);
  }
  if (buildRows.length) advisories.push(`${buildRows.length} vulnerable package(s) in vendor build/test dependencies only: not installed or loaded on staff machines; the vendor fixes them (details below)`);

  // ---------- report ----------
  const status = errors.length ? "❌ errors found" : advisories.length ? "⚠️ updates or advisories" : "✅ all current";
  lines.push(`## Plugin maintenance — ${status}`, "");
  lines.push(`Generated by \`scripts/plugin-maintenance.mjs\`. Merge only after a human review; publishing to the fleet stays a human decision (org Owner approves on the Plugins page after merge).`, "");
  if (repinned.length) {
    lines.push("### Re-vendored", "");
    for (const r of repinned) lines.push(`- **${r.name}**: \`${r.from.slice(0, 7)}\` → \`${r.sha.slice(0, 7)}\` — [upstream changes](https://github.com/${r.repo}/compare/${r.from}...${r.sha})`);
    const per = {};
    for (const c of changed) { const m = c.file.match(/^plugins\/([^/]+)\//); if (m) { per[m[1]] = per[m[1]] || { A: 0, M: 0, D: 0, R: 0 }; per[m[1]][c.status] = (per[m[1]][c.status] || 0) + 1; } }
    for (const [n, s] of Object.entries(per)) lines.push(`  - ${n}: ${s.A || 0} added, ${s.M || 0} modified, ${s.D || 0} deleted${s.R ? `, ${s.R} renamed` : ""}`);
    lines.push("");
  }
  lines.push("### Errors", "", ...(errors.length ? errors.map((e) => `- ${e}`) : ["- none"]), "");
  if (review.length) lines.push("### Review these first (code that runs on every machine, or changed terms)", "", ...review.slice(0, 60).map((r) => `- ${r}`), ...(review.length > 60 ? [`- …and ${review.length - 60} more`] : []), "");
  lines.push("### Advisories", "", ...(advisories.length ? advisories.map((a) => `- ${a}`) : ["- none"]), "");
  if (osvRows.length) {
    lines.push("<details><summary>Vulnerable packages in vendored lockfiles (runtime = loaded on staff machines; build = vendor tooling only)</summary>", "", "| Exposure | Severity | Package | Lockfile | IDs |", "|---|---|---|---|---|");
    for (const r of [...runtimeRows, ...buildRows].slice(0, 50)) lines.push(`| ${r.exposure} | ${sevLabel(r.max)} | ${r.pkg} | ${r.source} | ${r.ids.slice(0, 4).join(", ")}${r.ids.length > 4 ? " …" : ""} |`);
    lines.push("", "Exposure is judged from what the plugin ships and what its hooks (and the folders they run from), skills, agents and commands import by name; code bundled into a single file is not detected.", "", "</details>", "");
  }
  if (warnings.length) lines.push("### Warnings (checks that could not run)", "", ...warnings.map((w) => `- ${w}`), "");
  lines.push(`_Checked: ${(market && market.plugins || []).length} plugins, ${hookScripts.size} hook scripts, ${checked} script syntax checks, ${changed.length} changed files._`);

  return { errors, warnings, advisories, review, repinned, manual, osvRows, changed, report: lines.join("\n") + "\n" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const opt = args(process.argv.slice(2));
  const root = path.resolve(opt.root || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
  const res = await run(root, opt);
  if (opt.out) fs.writeFileSync(opt.out, res.report); else process.stdout.write(res.report);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ errors: res.errors.length, advisories: res.advisories.length, warnings: res.warnings.length, changed: res.changed.length, repinned: res.repinned.map((r) => r.name) }, null, 2));
  process.exit(res.errors.length ? 1 : 0);
}
