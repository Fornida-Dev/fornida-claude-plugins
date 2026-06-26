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
#>

param(
    [string]$Plugin = '',
    [switch]$NoCommit
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot

# Plugin manifest: name, owner/repo, branch, subpath within the upstream repo
# (empty subpath = whole repo is the plugin). Mirrors .claude-plugin/marketplace.json.
# NOTE: compound-engineering restructured upstream — the plugin now lives at the
# repo ROOT (subpath ''), not under plugins/compound-engineering. Its tarball also
# contains symlinked mirror dirs (.agy, .cursor-plugin, etc.) that Windows tar.exe
# cannot extract ("Invalid argument"); vendoring CE on Windows needs a git-based
# fetch or symlink-tolerant extraction — see VENDOR.md "Known limitation". caveman
# has no such issue and extracts cleanly with tar on every platform.
$Plugins = @(
    @{ name = 'compound-engineering'; repo = 'EveryInc/compound-engineering-plugin'; branch = 'main'; subpath = '' },
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
    tar -xzf $tarball -C $tmpRoot
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

# 6. Commit on current branch; never push
if (-not $NoCommit) {
    $names = ($Plugins | ForEach-Object { $_.name }) -join ', '
    git -C $repoRoot add plugins VENDOR.md
    git -C $repoRoot commit -m "chore(vendor): re-pin $names to latest upstream; overlays re-applied"
    Write-Host "Committed to current branch (NOT pushed). Publish is a human decision." -ForegroundColor Green
} else {
    Write-Host "NoCommit set - changes staged in working tree only." -ForegroundColor Yellow
}
