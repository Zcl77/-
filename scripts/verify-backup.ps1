[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$backupPath = [System.IO.Path]::GetFullPath($BackupDirectory)
$manifestPath = Join-Path $backupPath 'manifest.json'

function Invoke-Docker {
    param([string[]]$Arguments)

    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed: docker $($Arguments -join ' ')"
    }
}

function Invoke-DockerCapture {
    param([string[]]$Arguments)

    $output = & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed: docker $($Arguments -join ' ')"
    }
    return ($output | Select-Object -Last 1).Trim()
}

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Backup manifest not found: $manifestPath"
}

$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.formatVersion -ne 1) {
    throw "Unsupported backup format version: $($manifest.formatVersion)"
}

$databaseFile = Join-Path $backupPath $manifest.databaseFile
$mediaFile = Join-Path $backupPath $manifest.mediaFile
foreach ($requiredFile in @($databaseFile, $mediaFile)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Backup file not found: $requiredFile"
    }
}

$databaseHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $databaseFile).Hash.ToLowerInvariant()
$mediaHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $mediaFile).Hash.ToLowerInvariant()
if ($databaseHash -ne $manifest.databaseSha256 -or $mediaHash -ne $manifest.mediaSha256) {
    throw 'Backup checksum verification failed.'
}

$suffix = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss') + "_$PID"
$verifyDatabase = "zhixing_restore_verify_$suffix"
$containerDatabaseFile = "/tmp/$verifyDatabase.sql"
$containerMediaFile = "/tmp/$verifyDatabase-media.tar.gz"
$containerMediaDirectory = "/tmp/$verifyDatabase-media"
$databaseCreated = $false

Push-Location $repoRoot
try {
    $runningServices = & docker compose ps --status running --services
    if ($LASTEXITCODE -ne 0 -or $runningServices -notcontains 'db' -or $runningServices -notcontains 'backend') {
        throw 'The local db and backend services must be running before verification.'
    }

    Invoke-Docker @('compose', 'cp', $databaseFile, "db:$containerDatabaseFile")
    $createCommand = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin -uroot create ' + $verifyDatabase
    Invoke-Docker @('compose', 'exec', '-T', 'db', 'sh', '-c', $createCommand)
    $databaseCreated = $true

    $restoreCommand = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot ' + $verifyDatabase + ' < "' + $containerDatabaseFile + '"'
    Invoke-Docker @('compose', 'exec', '-T', 'db', 'sh', '-c', $restoreCommand)
    $tableCountCommand = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -B -uroot ' + $verifyDatabase + ' -e SHOW\ TABLES | wc -l'
    $restoredTableCount = [int](Invoke-DockerCapture @('compose', 'exec', '-T', 'db', 'sh', '-c', $tableCountCommand))
    if ($restoredTableCount -ne [int]$manifest.databaseTableCount) {
        throw "Restored table count mismatch: expected $($manifest.databaseTableCount), got $restoredTableCount."
    }

    Invoke-Docker @('compose', 'cp', $mediaFile, "backend:$containerMediaFile")
    $extractCommand = 'mkdir -p "' + $containerMediaDirectory + '" && tar -xzf "' + $containerMediaFile + '" -C "' + $containerMediaDirectory + '"'
    Invoke-Docker @('compose', 'exec', '-T', 'backend', 'sh', '-c', $extractCommand)
    $mediaCountCommand = 'find "' + $containerMediaDirectory + '" -type f | wc -l'
    $restoredMediaCount = [int](Invoke-DockerCapture @('compose', 'exec', '-T', 'backend', 'sh', '-c', $mediaCountCommand))
    if ($restoredMediaCount -ne [int]$manifest.mediaFileCount) {
        throw "Restored media count mismatch: expected $($manifest.mediaFileCount), got $restoredMediaCount."
    }

    Write-Host "Backup verified in isolation: $restoredTableCount tables, $restoredMediaCount media files."
}
finally {
    if ($databaseCreated) {
        $dropCommand = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin -uroot --force drop ' + $verifyDatabase
        & docker compose exec -T db sh -c $dropCommand 2>$null
    }
    & docker compose exec -T db rm -f $containerDatabaseFile 2>$null
    & docker compose exec -T backend sh -c "rm -rf '$containerMediaDirectory' '$containerMediaFile'" 2>$null
    Pop-Location
}
