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
        throw "当前目录不是 Git 仓库：$projectRoot"
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
        throw "Git 暂存失败。"
    }

    $stagedFiles = @(& git diff --cached --name-only --diff-filter=ACMRTUXB)
    $blockedFiles = @($stagedFiles | Where-Object {
        $_ -match '(^|/)(vault[^/]*|private)(/|$)' -or
        ($_ -match '(^|/)profile[^/]*\.json$' -and $_ -notmatch '(^|/)(extension/profile-example\.json|skill/.*/sample-profile\.json)$') -or
        $_ -match '\.(pdf|docx?|xlsx?|pptx?|jpg|jpeg|webp)$'
    })

    if ($blockedFiles.Count -gt 0) {
        throw "检测到可能包含个人材料或敏感资料的文件，已停止推送：`n$($blockedFiles -join "`n")"
    }

    & git diff --cached --check
    if ($LASTEXITCODE -ne 0) {
        throw "暂存内容存在格式问题，已停止提交。"
    }

    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Output "没有需要同步到 GitHub 的源码变更。"
        return
    }

    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $CommitMessage = "Auto-sync extension $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }

    & git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) {
        throw "Git 提交失败。"
    }

    $branch = (& git branch --show-current).Trim()
    if ([string]::IsNullOrWhiteSpace($branch)) {
        throw "无法确定当前 Git 分支。"
    }

    & git push -u origin $branch
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub 推送失败。为避免覆盖远程内容，脚本不会强制推送；请先处理远程分支差异。"
    }

    Write-Output "已同步到 GitHub：origin/$branch"
}
finally {
    Pop-Location
}
