[CmdletBinding()]
param(
    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
    $isRepository = (& git rev-parse --is-inside-work-tree 2>$null).Trim()
    if ($isRepository -ne "true") {
        throw "The current directory is not a Git repository: $projectRoot"
    }

    $trackedPaths = @(
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

    & git add --all -- @trackedPaths
    if ($LASTEXITCODE -ne 0) {
        throw "Git staging failed."
    }

    $stagedFiles = @(& git diff --cached --name-only --diff-filter=ACMRTUXB)
    $blockedFiles = @($stagedFiles | Where-Object {
        $_ -match '(^|/)(vault[^/]*|private)(/|$)' -or
        ($_ -match '(^|/)profile[^/]*\.json$' -and $_ -notmatch '(^|/)(extension/profile-example\.json|skill/.*/sample-profile\.json)$') -or
        $_ -match '\.(pdf|docx?|xlsx?|pptx?|jpg|jpeg|webp)$'
    })

    if ($blockedFiles.Count -gt 0) {
        $blockedList = $blockedFiles -join [Environment]::NewLine
        throw "Potentially private material was detected; push stopped:`n$blockedList"
    }

    & git diff --cached --check
    if ($LASTEXITCODE -ne 0) {
        throw "The staged content has formatting errors; commit stopped."
    }

    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Output "No source changes need to be synced to GitHub."
        return
    }

    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $CommitMessage = "Auto-sync extension $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }

    & git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) {
        throw "Git commit failed."
    }

    $branch = (& git branch --show-current).Trim()
    if ([string]::IsNullOrWhiteSpace($branch)) {
        throw "Unable to determine the current Git branch."
    }

    & git push -u origin $branch
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub push failed. The script will not force-overwrite the remote; resolve branch differences first."
    }

    Write-Output "Synced to GitHub: origin/$branch"
}
finally {
    Pop-Location
}
