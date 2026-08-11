[CmdletBinding()]
param(
    [string]$OutputRoot = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $repoRoot 'backups'
}
$outputRootPath = [System.IO.Path]::GetFullPath($OutputRoot)
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$backupDirectory = Join-Path $outputRootPath $stamp
$databaseFile = Join-Path $backupDirectory 'database.sql'
$mediaFile = Join-Path $backupDirectory 'media.tar.gz'
$manifestFile = Join-Path $backupDirectory 'manifest.json'
$containerDatabaseFile = "/tmp/zhixing-$stamp-database.sql"
$containerMediaFile = "/tmp/zhixing-$stamp-media.tar.gz"

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

Push-Location $repoRoot
try {
    $runningServices = & docker compose ps --status running --services
    if ($LASTEXITCODE -ne 0 -or $runningServices -notcontains 'db' -or $runningServices -notcontains 'backend') {
        throw 'The local db and backend services must be running before backup.'
    }

    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

    $dumpCommand = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --quick --triggers --hex-blob --default-character-set=utf8mb4 -uroot "$MYSQL_DATABASE" > "' + $containerDatabaseFile + '"'
    Invoke-Docker @('compose', 'exec', '-T', 'db', 'sh', '-c', $dumpCommand)
    Invoke-Docker @('compose', 'cp', "db:$containerDatabaseFile", $databaseFile)

    $mediaCommand = 'tar -czf "' + $containerMediaFile + '" -C /data/media .'
    Invoke-Docker @('compose', 'exec', '-T', 'backend', 'sh', '-c', $mediaCommand)
    Invoke-Docker @('compose', 'cp', "backend:$containerMediaFile", $mediaFile)

    $tableCountCommand = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -B -uroot "$MYSQL_DATABASE" -e SHOW\ TABLES | wc -l'
    $tableCount = [int](Invoke-DockerCapture @('compose', 'exec', '-T', 'db', 'sh', '-c', $tableCountCommand))
    $mediaCount = [int](Invoke-DockerCapture @('compose', 'exec', '-T', 'backend', 'sh', '-c', 'find /data/media -type f | wc -l'))

    $manifest = [ordered]@{
        formatVersion = 1
        createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
        databaseFile = 'database.sql'
        databaseSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $databaseFile).Hash.ToLowerInvariant()
        databaseTableCount = $tableCount
        mediaFile = 'media.tar.gz'
        mediaSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $mediaFile).Hash.ToLowerInvariant()
        mediaFileCount = $mediaCount
    }
    $manifest | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath $manifestFile

    Write-Host "Backup complete: $backupDirectory"
}
finally {
    & docker compose exec -T db rm -f $containerDatabaseFile 2>$null
    & docker compose exec -T backend rm -f $containerMediaFile 2>$null
    Pop-Location
}
