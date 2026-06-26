<#
.SYNOPSIS
    Re-applies Fornida-authored overlays onto vendored plugins after a re-vendor.

.DESCRIPTION
    Vendored plugins in this marketplace are re-copied from pinned upstream SHAs by
    the re-vendor process (setup-fornida-plugins.ps1). That copy clobbers any
    Fornida-specific edits. This script restores the Fornida overlays from their
    source of truth in overlays/ onto the live vendored plugins in plugins/.

    Current overlays:
      caveman -> forced terse output style (output-styles/caveman.md) +
                 hook-neutralized plugin.json (no Node SessionStart/UserPromptSubmit hooks).
                 See VENDOR.md "Fornida overlays" for why.

    RUN THIS AFTER EVERY RE-VENDOR / RE-PIN. Idempotent: safe to run repeatedly.
    After running, run verify-overlays.ps1 and `claude plugin validate .`.

.NOTES
    Owner: Fornida MSP / Systems (it@fornida.com)
    Repo:  fornida-claude-plugins
    Exits non-zero if an overlay source file is missing.
#>

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot

# Each overlay: source (under overlays/) -> target (live vendored path under plugins/)
$overlays = @(
    @{
        Source = Join-Path $repoRoot 'overlays\caveman\output-styles\caveman.md'
        Target = Join-Path $repoRoot 'plugins\caveman\output-styles\caveman.md'
    },
    @{
        Source = Join-Path $repoRoot 'overlays\caveman\plugin.json'
        Target = Join-Path $repoRoot 'plugins\caveman\.claude-plugin\plugin.json'
    }
)

$applied = 0
foreach ($o in $overlays) {
    if (-not (Test-Path -LiteralPath $o.Source)) {
        Write-Error "Overlay source missing: $($o.Source)"
        exit 1
    }
    $targetDir = Split-Path -Parent $o.Target
    if (-not (Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Copy-Item -LiteralPath $o.Source -Destination $o.Target -Force
    Write-Host "applied: $($o.Source) -> $($o.Target)"
    $applied++
}

Write-Host "apply-overlays: $applied overlay file(s) applied."
