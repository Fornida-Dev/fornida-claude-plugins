// node --test scripts/
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseVendor, hookCommands, hookFiles, checkPlugin, syntaxError, secretHits, summarizeOsv } from "./plugin-maintenance.mjs";

function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-maint-"));
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body));
  }
  return root;
}
const skill = (name) => `---\nname: ${name}\ndescription: does ${name}\n---\nbody\n`;

test("parseVendor reads name, repo and pinned SHA", () => {
  const v = parseVendor([
    "- caveman  <=  github.com/JuliusBrussee/caveman  @ 15581d14007fd01fb3f132016741962f34936ca2  (curated: ...)",
    "- github  <=  github.com/anthropics/claude-plugins-official (/external_plugins/github) @ 517b2fcd1b60fa2181ac52dcf8492361ba341180",
    "- fornida-design  (2026-11-04)  first-party",
  ].join("\n"));
  assert.deepStrictEqual(v.map((x) => [x.name, x.repo, x.sha.slice(0, 7)]), [["caveman", "JuliusBrussee/caveman", "15581d1"], ["github", "anthropics/claude-plugins-official", "517b2fc"]]);
});

test("hook commands and the plugin files they run", () => {
  const obj = { hooks: { SessionStart: [{ hooks: [{ type: "command", command: "node \"${CLAUDE_PLUGIN_ROOT}/hooks/a.js\"" }] }], Stop: [{ hooks: [{ command: "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" stop" }] }] } };
  const cmds = hookCommands(obj);
  assert.strictEqual(cmds.length, 2);
  assert.deepStrictEqual(cmds.flatMap(hookFiles), ["hooks/a.js", "hooks/run-hook.cmd"]);
});

test("a clean plugin passes; broken shapes are caught", () => {
  const root = tree({
    "good/.claude-plugin/plugin.json": { name: "good", hooks: { Stop: [{ hooks: [{ command: "node ${CLAUDE_PLUGIN_ROOT}/hooks/x.js" }] }] } },
    "good/hooks/x.js": "console.log(1)\n",
    "good/skills/a/SKILL.md": skill("a"),
    "good/tests/fixtures/p/.claude-plugin/plugin.json": { name: "fixture" },
    "bad/.claude-plugin/plugin.json": { name: "bad", hooks: "./hooks/missing.json" },
    "bad/skills/a/SKILL.md": skill("dup"),
    "bad/skills/b/SKILL.md": skill("dup"),
    "bad/skills/c/SKILL.md": "no frontmatter",
    "bad/hooks/hooks.json": { hooks: { Stop: [{ hooks: [{ command: "node ${CLAUDE_PLUGIN_ROOT}/hooks/gone.js" }] }] } },
    "nomanifest/README.md": "x",
  });
  const good = checkPlugin(root, path.join(root, "good"));
  assert.deepStrictEqual(good.errors, ["good: nested plugin manifest tests/fixtures/p/.claude-plugin/plugin.json"], "nested manifests are rejected even under tests/");
  assert.deepStrictEqual(good.hookScripts, ["good/hooks/x.js"]);
  const bad = checkPlugin(root, path.join(root, "bad")).errors.join("\n");
  assert.match(bad, /duplicate skill name "dup"/);
  assert.match(bad, /skills\/c\/SKILL\.md has no name\/description/);
  assert.match(bad, /hooks path \.\/hooks\/missing\.json does not exist/);
  assert.match(bad, /runs hooks\/gone\.js, which does not exist/);
  assert.match(checkPlugin(root, path.join(root, "nomanifest")).errors.join("\n"), /missing \.claude-plugin\/plugin\.json/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("syntax checks never run the script", () => {
  const root = tree({ "ok.js": "const a = 1;\n", "bad.js": "const = ;\n", "side.js": "require('fs').writeFileSync(__dirname + '/ran', 'x')\n", "ok.sh": "echo hi\n", "bad.sh": "if then fi (\n", "x.txt": "hi" });
  assert.strictEqual(syntaxError(path.join(root, "ok.js")), "");
  assert.ok(syntaxError(path.join(root, "bad.js")));
  assert.strictEqual(syntaxError(path.join(root, "side.js")), "");
  assert.ok(!fs.existsSync(path.join(root, "ran")), "node --check does not execute");
  assert.strictEqual(syntaxError(path.join(root, "ok.sh")), "");
  assert.ok(syntaxError(path.join(root, "bad.sh")));
  assert.strictEqual(syntaxError(path.join(root, "x.txt")), null);
  fs.rmSync(root, { recursive: true, force: true });
});

test("secret shapes are found by line, and the value is never returned", () => {
  const fake = "AKIA" + "Q".repeat(16);
  const hits = secretHits(`a\nkey = "${fake}"\n-----BEGIN ${"OPENSSH"} PRIVATE KEY-----\n`);
  assert.deepStrictEqual(hits, [{ line: 2, label: "AWS access key" }, { line: 3, label: "private key" }]);
  assert.ok(!JSON.stringify(hits).includes(fake));
  assert.deepStrictEqual(secretHits("const AKIA = 'docs mention AKIA keys';\nprocess.env.ANTHROPIC_API_KEY"), []);
});

test("OSV summary sorts by severity and trims the root", () => {
  const rows = summarizeOsv({ results: [{ source: { path: "/r/plugins/x/bun.lock" }, packages: [
    { package: { name: "a", version: "1.0.0" }, vulnerabilities: [{ id: "GHSA-1" }], groups: [{ max_severity: "5.3" }] },
    { package: { name: "b", version: "2.0.0" }, vulnerabilities: [{ id: "GHSA-2" }, { id: "CVE-2" }], groups: [{ max_severity: "9.8" }] },
    { package: { name: "c", version: "3.0.0" }, vulnerabilities: [] },
  ] }] }, "/r");
  assert.deepStrictEqual(rows.map((r) => [r.pkg, r.source, r.max]), [["b@2.0.0", "plugins/x/bun.lock", 9.8], ["a@1.0.0", "plugins/x/bun.lock", 5.3]]);
});
