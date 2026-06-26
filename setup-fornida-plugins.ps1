<#
.SYNOPSIS
    Re-vendor Fornida's curated Claude Code plugins from pinned upstream SHAs,
    then re-apply + verify Fornida overlays. Commits to the current branch; never pushes.

.DESCRIPTION
    Each plugin in $Plugins is vendored (copied in) from a specific upstream repo,
    pinned to an auditable commit SHA. This script:
      1. Resolves the latest upstream SHA on the plugin's branch (gh api).
      2. Downloads the repo tarball at that SHA and extracts the vendored subpath.
      3. Replaces plugins/<name>/ with the fresh tree (clean replace).
      4. Rewrites the matching VENDOR.md provenance line to the new SHA.
      5. Runs apply-overlays.ps1 then verify-overlays.ps1 so Fornida overlays
         (e.g. the caveman forced output style + hook-neutralized plugin.json)
         are restored and validated automatically — an update can never silently
         drop an overlay.
      6. Stages + commits on the CURRENT branch and STOPS. It does NOT push.
         Publishing to the fleet is a human decision (org: no deploy without approval).

    Requires: gh (authenticated), tar (bundled with Windows 10+/pwsh), git.

.PARAMETER Plugin
    Optional. Update only this plugin (e.g. -Plugin caveman). Default: all.

.PARAMETER NoCommit
    Vendor + overlay + verify but do not git-commit (for inspection / dry compare).

.NOTES
    Owner: Fornida MSP / Systems (it@fornida.com)
    Repo:  fornida-claude-plugins
    Provenance + pinned SHAs: VENDOR.md. Overlays: overlays/ + apply-overlays.ps1.

    `claude plugin validate .` MUTATES the working tree (regenerates skill manifests).
    Run it AFTER this script and clean its churn (git checkout -- <path>) before
    committing — the pre-commit guard below aborts if unrelated paths are dirty so
    validate edits can't ride along in a vendor commit.
#>

param(
    [string]$Plugin = '',
    [switch]$NoCommit
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot

# Plugin manifest: name, owner/repo, branch, subpath within the upstream repo
# (empty subpath = whole repo is the plugin). Mirrors .claude-plugin/marketplace.json.
# Optional 'exclude' = dir/glob names skipped during extraction (tar --exclude).
#
# compound-engineering lives at the upstream repo ROOT (subpath '') and ships
# dot-prefixed mirror dirs for OTHER tools (Cursor, Codex, Kimi, OpenCode, Pi, Agy,
# Junie) that the Claude marketplace never uses. One of them (.agy/skills) is a
# symlink that Windows tar.exe rejects ("Invalid argument"). Excluding the foreign
# mirrors removes the symlink AND the bloat, and makes CE vendor cleanly on every
# platform. The real Claude tree (.claude-plugin, .claude, skills, agents, commands,
# src, assets, docs, scripts, .compound-engineering, top-level docs) is kept.
$Plugins = @(
    @{ name = 'compound-engineering'; repo = 'EveryInc/compound-engineering-plugin'; branch = 'main'; subpath = '';
       exclude = @('.agy', '.cursor-plugin', '.codex-plugin', '.kimi-plugin', '.opencode', '.pi', '.agents', '.junie') },
    @{ name = 'caveman';              repo = 'JuliusBrussee/caveman';                branch = 'main'; subpath = '' },
    @{ name = 'superclaude';          repo = 'SuperClaude-Org/SuperClaude_Framework'; branch = 'master'; subpath = 'plugins/superclaude' },
    @{ name = 'github';               repo = 'anthropics/claude-plugins-official';    branch = 'main'; subpath = 'external_plugins/github' },
    @{ name = 'superpowers';          repo = 'obra/superpowers';                     branch = 'main'; subpath = '' },
    @{ name = 'vercel';               repo = 'vercel/vercel-plugin';                 branch = 'main'; subpath = '' }
)

if ($Plugin) {
    $Plugins = $Plugins | Where-Object { $_.name -eq $Plugin }
    if (-not $Plugins) { Write-Error "Unknown plugin: $Plugin"; exit 1 }
}

$vendorMd = Join-Path $repoRoot 'VENDOR.md'
$tmpRoot  = Join-Path $repoRoot '.vendor-tmp'

foreach ($p in $Plugins) {
    Write-Host "=== $($p.name)  <=  $($p.repo) ($($p.branch)) ===" -ForegroundColor Cyan

    # 1. Resolve SHA
    $sha = (gh api "repos/$($p.repo)/commits/$($p.branch)" --jq '.sha').Trim()
    if (-not $sha) { Write-Error "Could not resolve SHA for $($p.repo)"; exit 1 }
    Write-Host "  SHA: $sha"

    # 2. Download tarball at SHA + extract
    if (Test-Path $tmpRoot) { Remove-Item -Recurse -Force $tmpRoot }
    New-Item -ItemType Directory -Path $tmpRoot | Out-Null
    $tarball = Join-Path $tmpRoot 'src.tar.gz'
    gh api "repos/$($p.repo)/tarball/$sha" > $tarball
    # Build --exclude args: skip foreign-tool mirror dirs (and the symlinks inside
    # them) so they never reach the working tree. Patterns anchor under the tarball
    # top dir (entries are <owner>-<repo>-<sha>/<path>).
    $tarArgs = @('-xzf', $tarball, '-C', $tmpRoot)
    if ($p.exclude) {
        foreach ($ex in $p.exclude) {
            $tarArgs += "--exclude=*/$ex"
            $tarArgs += "--exclude=*/$ex/*"
        }
    }
    tar @tarArgs
    $extracted = Get-ChildItem -Path $tmpRoot -Directory | Select-Object -First 1
    $srcPath = if ($p.subpath) { Join-Path $extracted.FullName ($p.subpath -replace '/', [IO.Path]::DirectorySeparatorChar) } else { $extracted.FullName }
    if (-not (Test-Path $srcPath)) { Write-Error "Subpath not found in upstream: $($p.subpath)"; exit 1 }

    # 3. Clean replace plugins/<name>/
    $dest = Join-Path $repoRoot "plugins\$($p.name)"
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    New-Item -ItemType Directory -Path $dest | Out-Null
    Copy-Item -Path (Join-Path $srcPath '*') -Destination $dest -Recurse -Force
    Write-Host "  vendored -> plugins/$($p.name)"

    # 4. Rewrite VENDOR.md provenance line (replace trailing SHA on the matching name line)
    $lines = Get-Content -LiteralPath $vendorMd
    $pattern = "^(- $([regex]::Escape($p.name))\s+<=.*@\s*)[0-9a-f]{7,40}\s*$"
    $updated = $false
    $lines = $lines | ForEach-Object {
        if ($_ -match $pattern) { $updated = $true; "$($Matches[1])$sha" } else { $_ }
    }
    if ($updated) { $lines | Set-Content -LiteralPath $vendorMd; Write-Host "  VENDOR.md updated" }
    else { Write-Warning "  VENDOR.md: no provenance line matched for $($p.name) (left unchanged)" }
}

if (Test-Path $tmpRoot) { Remove-Item -Recurse -Force $tmpRoot }

# 5. Re-apply + verify Fornida overlays (loud-fail on drift)
Write-Host "=== applying overlays ===" -ForegroundColor Cyan
& (Join-Path $repoRoot 'apply-overlays.ps1')
& (Join-Path $repoRoot 'verify-overlays.ps1')
if ($LASTEXITCODE -ne 0) { Write-Error "verify-overlays failed - not committing."; exit 1 }

# 6. Commit on current branch; never push.
#    Scope the commit to ONLY the vendored plugin(s) + VENDOR.md, and abort if any
#    OTHER tracked/untracked path is dirty. This guards against `claude plugin
#    validate` (run separately) mutating the working tree and having its stray edits
#    to unrelated plugins ride along in a vendor commit.
if (-not $NoCommit) {
    # Guard: a vendor commit must contain ONLY the vendored plugin(s) + VENDOR.md.
    # Only TRACKED modifications outside that scope are dangerous (they could be
    # validate-induced churn in unrelated plugins); untracked files ('??') can't
    # ride along because staging below is explicit, so they're ignored here.
    $allowed = @('VENDOR.md') + ($Plugins | ForEach-Object { "plugins/$($_.name)/" })
    $unexpected = git -C $repoRoot status --porcelain | Where-Object { $_ -notmatch '^\?\?' } | ForEach-Object {
        $path = $_.Substring(3).Trim('"')
        if (($allowed | Where-Object { $path -eq 'VENDOR.md' -or $path.StartsWith($_) })) { $null } else { $path }
    } | Where-Object { $_ }
    if ($unexpected) {
        Write-Host "ABORT: tracked changes outside the vendored plugin(s):" -ForegroundColor Red
        $unexpected | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        Write-Host "Resolve these (e.g. 'git checkout -- <path>' to discard validate churn) and re-run." -ForegroundColor Red
        exit 1
    }

    $names = ($Plugins | ForEach-Object { $_.name }) -join ', '
    foreach ($p in $Plugins) { git -C $repoRoot add "plugins/$($p.name)" }
    git -C $repoRoot add VENDOR.md
    git -C $repoRoot commit -m "chore(vendor): re-pin $names to latest upstream; overlays re-applied"
    Write-Host "Committed to current branch (NOT pushed). Publish is a human decision." -ForegroundColor Green
} else {
    Write-Host "NoCommit set - changes staged in working tree only." -ForegroundColor Yellow
}
