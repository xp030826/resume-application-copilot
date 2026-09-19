[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionPath = Join-Path $projectRoot "extension"
$manifestPath = Join-Path $extensionPath "manifest.json"
$releaseDirectory = Join-Path $projectRoot "release"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Extension manifest.json was not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$version = [string]$manifest.version
if ($version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Invalid manifest version: $version"
}

New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
$releasePath = Join-Path $releaseDirectory "resume-application-copilot-v$version.zip"
$stageRoot = Join-Path ([System.IO.Path]::GetTempPath()) "resume-copilot-package-$([guid]::NewGuid().ToString('N'))"
$stagePackage = Join-Path $stageRoot "package"

try {
    New-Item -ItemType Directory -Path $stagePackage -Force | Out-Null
    Get-ChildItem -LiteralPath $extensionPath -Force | Copy-Item -Destination $stagePackage -Recurse -Force

    if (Test-Path -LiteralPath $releasePath -PathType Leaf) {
        Remove-Item -LiteralPath $releasePath -Force
    }

    Compress-Archive -Path (Join-Path $stagePackage "*") -DestinationPath $releasePath -CompressionLevel Optimal
    Write-Output "Created extension package: $releasePath"
}
finally {
    if (Test-Path -LiteralPath $stageRoot) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
}
