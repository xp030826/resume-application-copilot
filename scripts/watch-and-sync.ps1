[CmdletBinding()]
param(
    [ValidateRange(2, 3600)]
    [int]$IntervalSeconds = 5,
    [switch]$Once
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageScript = Join-Path $PSScriptRoot "package-extension.ps1"
$syncScript = Join-Path $PSScriptRoot "sync-to-github.ps1"

function Get-WorkingTreeSignature {
    Push-Location $projectRoot
    try {
        $paths = @(
            ".gitignore",
            "LICENSE",
            "README.md",
            "package.json",
            "demo",
            "extension",
            "release",
            "skill",
            "tests"
        )
        return ((& git status --porcelain --untracked-files=all -- @paths) -join "`n")
    }
    finally {
        Pop-Location
    }
}

function Sync-Once {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $packageScript
    if ($LASTEXITCODE -ne 0) {
        throw "Extension packaging failed."
    }

    $message = "Auto-sync extension $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $syncScript -CommitMessage $message
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub sync failed."
    }
}

Write-Output "Watching extension source. Interval: $IntervalSeconds seconds. Press Ctrl+C to stop."
Write-Output "The profile vault is not read or uploaded by this script."
$lastSignature = Get-WorkingTreeSignature

do {
    Start-Sleep -Seconds $IntervalSeconds
    $currentSignature = Get-WorkingTreeSignature

    if ($currentSignature -ne $lastSignature) {
        try {
            Sync-Once
            $lastSignature = Get-WorkingTreeSignature
        }
        catch {
            Write-Warning $_.Exception.Message
            $lastSignature = Get-WorkingTreeSignature
        }
    }
} while (-not $Once)
