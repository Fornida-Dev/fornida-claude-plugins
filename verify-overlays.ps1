<#
.SYNOPSIS
    Overlay integrity guard. Fails loudly if a Fornida overlay was reverted.

.DESCRIPTION
    A forgotten apply-overlays.ps1 after a re-vendor silently reverts the fleet to
    verbose (caveman output style gone, Node hooks back). This guard turns that
    silent revert into a loud, non-zero failure. Run it as the last step of the
    re-vendor checklist and (if CI exists) as a marketplace-validation job.

    Checks:
      1. plugins/caveman/output-styles/caveman.md exists with force-for-plugin: true
         and keep-coding-instructions: true.
      2. plugins/caveman/.claude-plugin/plugin.json has NO hook wiring
         (no caveman-activate.js / caveman-mode-tracker.js, no "hooks" block).
      3. No other vendored plugin declares force-for-plugin (load-order ambiguity).

.NOTES
    Owner: Fornida MSP / Systems (it@fornida.com)
    Repo:  fornida-claude-plugins
    Exit 0 = overlay intact. Exit 1 = drift detected (message names the problem).
#>

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$problems = @()

# --- Check 1: forced output style present + correct ---
$stylePath = Join-Path $repoRoot 'plugins\caveman\output-styles\caveman.md'
if (-not (Test-Path -LiteralPath $stylePath)) {
    $problems += "Missing forced output style: $stylePath (run apply-overlays.ps1)"
} else {
    $style = Get-Content -LiteralPath $stylePath -Raw
    if ($style -notmatch '(?m)^\s*force-for-plugin:\s*true\s*$') {
        $problems += "Output style missing 'force-for-plugin: true': $stylePath"
    }
    if ($style -notmatch '(?m)^\s*keep-coding-instructions:\s*true\s*$') {
        $problems += "Output style missing 'keep-coding-instructions: true': $stylePath"
    }
}

# --- Check 2: caveman plugin.json has no hook wiring ---
$cavemanManifest = Join-Path $repoRoot 'plugins\caveman\.claude-plugin\plugin.json'
if (-not (Test-Path -LiteralPath $cavemanManifest)) {
    $problems += "Missing caveman plugin.json: $cavemanManifest"
} else {
    $raw = Get-Content -LiteralPath $cavemanManifest -Raw
    if ($raw -match 'caveman-activate\.js' -or $raw -match 'caveman-mode-tracker\.js') {
        $problems += "Node hooks returned in caveman plugin.json (run apply-overlays.ps1): $cavemanManifest"
    } else {
        $manifest = $raw | ConvertFrom-Json
        if ($manifest.PSObject.Properties.Name -contains 'hooks' -and $manifest.hooks) {
            $problems += "caveman plugin.json still declares a non-empty 'hooks' block: $cavemanManifest"
        }
    }
}

# --- Check 3: no OTHER vendored plugin forces a style ---
$pluginsDir = Join-Path $repoRoot 'plugins'
Get-ChildItem -LiteralPath $pluginsDir -Directory | Where-Object { $_.Name -ne 'caveman' } | ForEach-Object {
    $styleFiles = Get-ChildItem -LiteralPath $_.FullName -Recurse -Filter '*.md' -ErrorAction SilentlyContinue |
        Where-Object { $_.DirectoryName -match 'output-styles' }
    foreach ($f in $styleFiles) {
        if ((Get-Content -LiteralPath $f.FullName -Raw) -match '(?m)^\s*force-for-plugin:\s*true\s*$') {
            $problems += "Another plugin forces a style (load-order ambiguity): $($f.FullName)"
        }
    }
}

if ($problems.Count -gt 0) {
    Write-Host "verify-overlays: FAIL ($($problems.Count) problem(s))" -ForegroundColor Red
    foreach ($p in $problems) { Write-Host "  - $p" -ForegroundColor Red }
    exit 1
}

Write-Host "verify-overlays: OK - Fornida caveman overlay intact." -ForegroundColor Green
exit 0
