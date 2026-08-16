[CmdletBinding()]
param(
    [string]$OutputRoot = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'portable-common.ps1')

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $repoRoot 'artifacts\portable'
}
$outputRootPath = Get-PortableFullPath -Path $OutputRoot -BasePath $repoRoot
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$packageDirectory = Join-Path $outputRootPath $stamp
$diagnosticsDirectory = Join-Path $packageDirectory 'diagnostics'
$diagnosticsFile = Join-Path $diagnosticsDirectory 'package.log'
$packageReady = $false

function Write-Diagnostic {
    param([string]$Message)
    $line = "[$((Get-Date).ToUniversalTime().ToString('o'))] $Message"
    Write-Host $line
    if (Test-Path -LiteralPath $diagnosticsDirectory -PathType Container) {
        Add-Content -Encoding utf8 -LiteralPath $diagnosticsFile -Value $line
    }
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$Description = $FilePath
    )
    Write-Diagnostic "START $Description"
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $FilePath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    foreach ($line in @($output)) {
        Add-Content -Encoding utf8 -LiteralPath $diagnosticsFile -Value ([string]$line)
        Write-Host $line
    }
    if ($exitCode -ne 0) {
        throw "$Description failed with exit code $exitCode."
    }
    Write-Diagnostic "DONE $Description"
    return @($output)
}

function Invoke-CheckedScript {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][hashtable]$Parameters,
        [Parameter(Mandatory = $true)][string]$Description
    )
    Write-Diagnostic "START $Description"
    & $ScriptPath @Parameters
    Write-Diagnostic "DONE $Description"
}

function Get-DockerImageMetadata {
    param([Parameter(Mandatory = $true)][string]$ImageReference)
    $json = (& docker image inspect $ImageReference 2>&1) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect Docker image: $ImageReference`n$json" }
    $image = @($json | ConvertFrom-Json)[0]
    return [ordered]@{
        reference = $ImageReference
        id = [string]$image.Id
        repoDigests = @($image.RepoDigests)
        created = [string]$image.Created
        architecture = [string]$image.Architecture
        os = [string]$image.Os
    }
}

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or is not on PATH.' }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not installed or is not on PATH.' }
    & docker version *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is unavailable. Start Docker Desktop and retry.' }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is unavailable.' }

    $gitRoot = (& git -C $repoRoot rev-parse --show-toplevel 2>&1 | Select-Object -Last 1).Trim()
    if ($LASTEXITCODE -ne 0 -or (Get-PortableFullPath -Path $gitRoot) -ne $repoRoot) {
        throw "The script must run from the Zhixing Studio Git repository: $repoRoot"
    }
    $branch = (& git -C $repoRoot branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) { throw 'Cannot determine the current Git branch.' }
    if ($branch -eq 'main') { throw 'Portable packages must not be created from main. Use an approved feature branch.' }
    $commit = (& git -C $repoRoot rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[0-9a-f]{40}$') { throw 'Cannot determine the current Git commit.' }
    $statusLines = @(& git -C $repoRoot status --short)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot read the Git working tree status.' }
    $workingTreeClean = $statusLines.Count -eq 0

    New-Item -ItemType Directory -Path $diagnosticsDirectory -Force | Out-Null
    Set-Content -Encoding utf8 -LiteralPath $diagnosticsFile -Value "Zhixing Studio portable package diagnostics"
    Write-Diagnostic "Repository: $repoRoot"
    Write-Diagnostic "Branch: $branch"
    Write-Diagnostic "Commit: $commit"
    Write-Diagnostic "Working tree clean: $workingTreeClean"
    if (-not $workingTreeClean) {
        Write-Diagnostic 'WARNING: Uncommitted and untracked files are excluded. source.zip contains only the recorded commit.'
        foreach ($statusLine in $statusLines) { Add-Content -Encoding utf8 -LiteralPath $diagnosticsFile -Value "git-status: $statusLine" }
    }
    Write-Diagnostic 'IMPORTANT: .env, passwords, and keys are not packaged. Store .env separately using encryption.'

    $backupWorkRoot = Join-Path $packageDirectory 'backup-work'
    Invoke-CheckedScript -ScriptPath (Join-Path $repoRoot 'scripts\backup-local.ps1') -Parameters @{ OutputRoot = $backupWorkRoot } -Description 'coordinated database and media backup'
    $backupDirectory = Get-ChildItem -LiteralPath $backupWorkRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if ($null -eq $backupDirectory) { throw 'backup-local.ps1 did not create a backup directory.' }
    Invoke-CheckedScript -ScriptPath (Join-Path $repoRoot 'scripts\verify-backup.ps1') -Parameters @{ BackupDirectory = $backupDirectory.FullName } -Description 'isolated backup verification'

    $backupManifestPath = Join-Path $backupDirectory.FullName 'manifest.json'
    $backupManifest = Get-Content -Raw -Encoding utf8 -LiteralPath $backupManifestPath | ConvertFrom-Json
    $finalBackupDirectory = Join-Path $packageDirectory 'backup'
    Move-Item -LiteralPath $backupDirectory.FullName -Destination $finalBackupDirectory
    Remove-Item -LiteralPath $backupWorkRoot -Force

    $shortCommit = $commit.Substring(0, 12)
    $backendReference = "zhixing-studio-portable/backend:$shortCommit"
    $frontendReference = "zhixing-studio-portable/frontend:$shortCommit"

    $sourceZip = Join-Path $packageDirectory 'source.zip'
    Invoke-CheckedCommand -FilePath 'git' -Arguments @('-C', $repoRoot, 'archive', '--format=zip', "--output=$sourceZip", $commit) -Description 'git archive source.zip' | Out-Null
    Test-PortableSourceArchive -ArchivePath $sourceZip
    $buildContext = Join-Path $packageDirectory 'build-context'
    Expand-Archive -LiteralPath $sourceZip -DestinationPath $buildContext
    Invoke-CheckedCommand -FilePath 'docker' -Arguments @('build', '--tag', $backendReference, '--file', (Join-Path $buildContext 'docker\backend\Dockerfile'), $buildContext) -Description 'build backend image from archived commit' | Out-Null
    Invoke-CheckedCommand -FilePath 'docker' -Arguments @('build', '--tag', $frontendReference, '--file', (Join-Path $buildContext 'docker\frontend\Dockerfile'), $buildContext) -Description 'build frontend image from archived commit' | Out-Null
    Remove-Item -LiteralPath $buildContext -Recurse -Force

    & docker image inspect mysql:8.4 *> $null
    if ($LASTEXITCODE -ne 0) {
        Invoke-CheckedCommand -FilePath 'docker' -Arguments @('pull', 'mysql:8.4') -Description 'pull mysql:8.4 image' | Out-Null
    }

    $imagesDirectory = Join-Path $packageDirectory 'images'
    New-Item -ItemType Directory -Path $imagesDirectory | Out-Null
    Invoke-CheckedCommand -FilePath 'docker' -Arguments @('save', '--output', (Join-Path $imagesDirectory 'backend.tar'), $backendReference) -Description 'export backend image' | Out-Null
    Invoke-CheckedCommand -FilePath 'docker' -Arguments @('save', '--output', (Join-Path $imagesDirectory 'frontend.tar'), $frontendReference) -Description 'export frontend image' | Out-Null
    Invoke-CheckedCommand -FilePath 'docker' -Arguments @('save', '--output', (Join-Path $imagesDirectory 'mysql-8.4.tar'), 'mysql:8.4') -Description 'export mysql:8.4 image' | Out-Null

    $docsDirectory = Join-Path $packageDirectory 'docs'
    New-Item -ItemType Directory -Path $docsDirectory | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot 'docs\PORTABLE_PACKAGE.md') -Destination (Join-Path $docsDirectory 'PORTABLE_PACKAGE.md')

    Write-Diagnostic 'All payload artifacts created; generating package manifest and SHA-256 list.'
    $artifactDefinitions = @(
        @{ role = 'source'; path = 'source.zip' },
        @{ role = 'frontendImage'; path = 'images/frontend.tar' },
        @{ role = 'backendImage'; path = 'images/backend.tar' },
        @{ role = 'mysqlImage'; path = 'images/mysql-8.4.tar' },
        @{ role = 'databaseBackup'; path = 'backup/database.sql' },
        @{ role = 'mediaBackup'; path = 'backup/media.tar.gz' },
        @{ role = 'backupManifest'; path = 'backup/manifest.json' },
        @{ role = 'restoreDocumentation'; path = 'docs/PORTABLE_PACKAGE.md' },
        @{ role = 'diagnostics'; path = 'diagnostics/package.log' }
    )
    $artifacts = foreach ($definition in $artifactDefinitions) {
        $path = Resolve-PortableArtifactPath -PackageDirectory $packageDirectory -RelativePath $definition.path
        [ordered]@{
            role = $definition.role
            path = $definition.path
            sizeBytes = (Get-Item -LiteralPath $path).Length
            sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
        }
    }
    $manifest = [ordered]@{
        formatVersion = 1
        createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
        gitCommit = $commit
        gitBranch = $branch
        workingTreeClean = $workingTreeClean
        sourcePolicy = 'git archive of the recorded commit; ignored and untracked files excluded'
        secretsPolicy = '.env, passwords, and keys are excluded and must be stored separately with encryption'
        backup = [ordered]@{
            createdAtUtc = [string]$backupManifest.createdAtUtc
            databaseTableCount = [int]$backupManifest.databaseTableCount
            mediaFileCount = [int]$backupManifest.mediaFileCount
        }
        images = [ordered]@{
            backend = Get-DockerImageMetadata -ImageReference $backendReference
            frontend = Get-DockerImageMetadata -ImageReference $frontendReference
            mysql = Get-DockerImageMetadata -ImageReference 'mysql:8.4'
        }
        artifacts = @($artifacts)
    }
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $packageDirectory 'manifest.json')
    $artifacts | ForEach-Object { "$($_.sha256)  $($_.path)" } | Set-Content -Encoding utf8 -LiteralPath (Join-Path $packageDirectory 'SHA256SUMS.txt')
    [void](Test-PortablePackage -PackageDirectory $packageDirectory)
    $packageReady = $true
    Write-Host "Portable package complete: $packageDirectory"
    Write-Host 'The package does not contain .env. Store the required .env separately using encryption.'
}
catch {
    if (Test-Path -LiteralPath $diagnosticsDirectory -PathType Container) {
        Write-Diagnostic "FAILED: $($_.Exception.Message)"
        Write-Host "Diagnostics preserved at: $diagnosticsFile"
        Write-Host "Incomplete package preserved at: $packageDirectory"
    }
    throw
}
finally {
    if (-not $packageReady -and (Test-Path -LiteralPath $packageDirectory)) {
        Write-Host 'No existing Docker volume or source data was removed. Inspect diagnostics before retrying.'
    }
}
