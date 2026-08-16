[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$PackageDirectory,
    [Parameter(Mandatory = $true)][string]$TargetDirectory,
    [Parameter(Mandatory = $true)][string]$TargetProjectName,
    [Parameter(Mandatory = $true)][string]$EnvFile,
    [ValidateRange(1, 65535)][int]$FrontendHostPort = 3000,
    [ValidateRange(1, 65535)][int]$BackendHostPort = 8000,
    [ValidateRange(1, 65535)][int]$MySqlHostPort = 3307
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'portable-common.ps1')

$sourceRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packagePath = Get-PortableFullPath -Path $PackageDirectory
$targetPath = Get-PortableFullPath -Path $TargetDirectory
$envSourcePath = Get-PortableFullPath -Path $EnvFile
$targetCreated = $false
$restoreStarted = $false
$restoreLog = Join-Path $targetPath 'restore-diagnostics.log'

function Write-RestoreLog {
    param([string]$Message)
    $line = "[$((Get-Date).ToUniversalTime().ToString('o'))] $Message"
    Write-Host $line
    if ($targetCreated) { Add-Content -Encoding utf8 -LiteralPath $restoreLog -Value $line }
}

function Invoke-DockerChecked {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Description
    )
    Write-RestoreLog "START $Description"
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & docker @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    foreach ($line in @($output)) {
        if ($targetCreated) { Add-Content -Encoding utf8 -LiteralPath $restoreLog -Value ([string]$line) }
        Write-Host $line
    }
    if ($exitCode -ne 0) { throw "$Description failed with exit code $exitCode." }
    Write-RestoreLog "DONE $Description"
    return @($output)
}

function Get-EnvSetting {
    param([string]$Path, [string]$Name)
    $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match "^$([regex]::Escape($Name))=" } | Select-Object -Last 1
    if ($null -eq $line) { return '' }
    return ($line -split '=', 2)[1].Trim()
}

function Set-EnvSetting {
    param([string]$Path, [string]$Name, [string]$Value)
    $lines = @(Get-Content -LiteralPath $Path)
    $pattern = "^$([regex]::Escape($Name))="
    $found = $false
    $updated = foreach ($line in $lines) {
        if ($line -match $pattern) {
            if (-not $found) { "$Name=$Value" }
            $found = $true
        }
        else { $line }
    }
    if (-not $found) { $updated += "$Name=$Value" }
    $updated | Set-Content -Encoding utf8 -LiteralPath $Path
}

function Get-ActiveProjectName {
    if (-not [string]::IsNullOrWhiteSpace($env:COMPOSE_PROJECT_NAME)) {
        return $env:COMPOSE_PROJECT_NAME
    }
    $activeEnv = Join-Path $sourceRepoRoot '.env'
    if (Test-Path -LiteralPath $activeEnv -PathType Leaf) {
        $name = Get-EnvSetting -Path $activeEnv -Name 'COMPOSE_PROJECT_NAME'
        if (-not [string]::IsNullOrWhiteSpace($name)) { return $name }
    }
    return 'zhixing-studio'
}

function Get-ComposeArguments {
    param([string[]]$Tail)
    return @('compose', '--project-name', $TargetProjectName, '--env-file', (Join-Path $targetPath '.env'), '-f', (Join-Path $targetPath 'compose.yaml'), '-f', (Join-Path $targetPath 'compose.portable.override.yaml')) + $Tail
}

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or is not on PATH.' }
    & docker version *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is unavailable. Start Docker Desktop and retry.' }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is unavailable.' }
    if (-not (Test-Path -LiteralPath $packagePath -PathType Container)) { throw "PackageDirectory not found: $packagePath" }
    if (-not (Test-Path -LiteralPath $envSourcePath -PathType Leaf)) { throw "EnvFile not found: $envSourcePath" }
    if ($targetPath -eq $sourceRepoRoot) { throw 'TargetDirectory cannot be the active source repository.' }
    if (@(@($FrontendHostPort, $BackendHostPort, $MySqlHostPort) | Select-Object -Unique).Count -ne 3) {
        throw 'FrontendHostPort, BackendHostPort, and MySqlHostPort must be distinct.'
    }

    $activeProjectName = Get-ActiveProjectName
    Assert-PortableProjectName -ProjectName $TargetProjectName -ActiveProjectName $activeProjectName
    [void](Assert-EmptyPortableTarget -TargetDirectory $targetPath)
    $manifest = Test-PortablePackage -PackageDirectory $packagePath

    $projectContainers = @(& docker ps -a --filter "label=com.docker.compose.project=$TargetProjectName" --format '{{.Names}}')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing Docker containers.' }
    $allContainers = @(& docker ps -a --format '{{.Names}}')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Docker container names.' }
    $existingContainers = @($projectContainers + @($allContainers | Where-Object { $_ -like "$TargetProjectName-*" }) | Select-Object -Unique)
    $expectedVolumes = @('mysql_data', 'media_data', 'static_data', 'frontend_node_modules') | ForEach-Object { "${TargetProjectName}_$_" }
    $allVolumes = @(& docker volume ls --format '{{.Name}}')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing Docker volumes.' }
    $projectVolumes = @(& docker volume ls --filter "label=com.docker.compose.project=$TargetProjectName" --format '{{.Name}}')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect project-labeled Docker volumes.' }
    $existingVolumes = @($projectVolumes + @($allVolumes | Where-Object { $_ -in $expectedVolumes }) | Select-Object -Unique)
    Assert-NoPortableDockerResources -ProjectName $TargetProjectName -ExistingContainers $existingContainers -ExistingVolumes $existingVolumes

    $requiredEnvNames = @('MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD', 'DJANGO_SECRET_KEY')
    foreach ($name in $requiredEnvNames) {
        $value = Get-EnvSetting -Path $envSourcePath -Name $name
        if ([string]::IsNullOrWhiteSpace($value) -or $value -like '*change-me*') {
            throw "EnvFile must define a non-placeholder value for $name."
        }
    }

    if (-not (Test-Path -LiteralPath $targetPath -PathType Container)) {
        New-Item -ItemType Directory -Path $targetPath | Out-Null
    }
    $targetCreated = $true
    Set-Content -Encoding utf8 -LiteralPath $restoreLog -Value 'Zhixing Studio portable restore diagnostics'
    Write-RestoreLog "Validated package commit: $($manifest.gitCommit)"
    Write-RestoreLog "Target Compose project: $TargetProjectName"
    Write-RestoreLog "Ports: frontend=$FrontendHostPort backend=$BackendHostPort mysql=$MySqlHostPort"

    $sourceArtifact = Get-PortableArtifact -Manifest $manifest -Role 'source'
    Expand-Archive -LiteralPath (Resolve-PortableArtifactPath -PackageDirectory $packagePath -RelativePath ([string]$sourceArtifact.path)) -DestinationPath $targetPath
    Copy-Item -LiteralPath $envSourcePath -Destination (Join-Path $targetPath '.env')
    Set-EnvSetting -Path (Join-Path $targetPath '.env') -Name 'COMPOSE_PROJECT_NAME' -Value $TargetProjectName
    Set-EnvSetting -Path (Join-Path $targetPath '.env') -Name 'FRONTEND_HOST_PORT' -Value ([string]$FrontendHostPort)
    Set-EnvSetting -Path (Join-Path $targetPath '.env') -Name 'BACKEND_HOST_PORT' -Value ([string]$BackendHostPort)
    Set-EnvSetting -Path (Join-Path $targetPath '.env') -Name 'MYSQL_HOST_PORT' -Value ([string]$MySqlHostPort)

    $backendTargetImage = "${TargetProjectName}-backend:latest"
    $frontendTargetImage = "${TargetProjectName}-frontend:latest"
    $override = @"
services:
  db:
    image: mysql:8.4
    ports: !override
      - '127.0.0.1:${MySqlHostPort}:3306'
  backend:
    image: $backendTargetImage
    ports: !override
      - '127.0.0.1:${BackendHostPort}:8000'
  frontend:
    image: $frontendTargetImage
    ports: !override
      - '127.0.0.1:${FrontendHostPort}:3000'
"@
    Set-Content -Encoding utf8 -LiteralPath (Join-Path $targetPath 'compose.portable.override.yaml') -Value $override

    foreach ($role in @('backendImage', 'frontendImage', 'mysqlImage')) {
        $artifact = Get-PortableArtifact -Manifest $manifest -Role $role
        Invoke-DockerChecked -Arguments @('load', '--input', (Resolve-PortableArtifactPath -PackageDirectory $packagePath -RelativePath ([string]$artifact.path))) -Description "load $role" | Out-Null
    }
    Invoke-DockerChecked -Arguments @('image', 'tag', ([string]$manifest.images.backend.reference), $backendTargetImage) -Description 'tag target backend image' | Out-Null
    Invoke-DockerChecked -Arguments @('image', 'tag', ([string]$manifest.images.frontend.reference), $frontendTargetImage) -Description 'tag target frontend image' | Out-Null

    $restoreStarted = $true
    foreach ($volumeName in $expectedVolumes) {
        $logicalName = $volumeName.Substring($TargetProjectName.Length + 1)
        Invoke-DockerChecked -Arguments @('volume', 'create', '--label', "com.docker.compose.project=$TargetProjectName", '--label', "com.docker.compose.volume=$logicalName", $volumeName) -Description "create volume $volumeName" | Out-Null
    }

    Invoke-DockerChecked -Arguments (Get-ComposeArguments -Tail @('up', '-d', '--no-build', 'db')) -Description 'start isolated MySQL' | Out-Null
    $dbContainer = ((Invoke-DockerChecked -Arguments (Get-ComposeArguments -Tail @('ps', '-q', 'db')) -Description 'resolve isolated MySQL container') | Select-Object -Last 1).ToString().Trim()
    if ([string]::IsNullOrWhiteSpace($dbContainer)) { throw 'Cannot resolve the isolated MySQL container.' }
    $healthy = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $dbContainer 2>$null | Select-Object -Last 1).Trim()
        if ($health -eq 'healthy') { $healthy = $true; break }
        Start-Sleep -Seconds 3
    }
    if (-not $healthy) { throw 'Isolated MySQL did not become healthy within 180 seconds.' }

    $databaseArtifact = Get-PortableArtifact -Manifest $manifest -Role 'databaseBackup'
    Invoke-DockerChecked -Arguments @('cp', (Resolve-PortableArtifactPath -PackageDirectory $packagePath -RelativePath ([string]$databaseArtifact.path)), "${dbContainer}:/tmp/portable-database.sql") -Description 'copy database backup' | Out-Null
    Invoke-DockerChecked -Arguments @('exec', $dbContainer, 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$MYSQL_DATABASE" < /tmp/portable-database.sql') -Description 'restore MySQL backup' | Out-Null
    $tableOutput = Invoke-DockerChecked -Arguments @('exec', $dbContainer, 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -B -uroot "$MYSQL_DATABASE" -e SHOW\ TABLES | wc -l') -Description 'count restored database tables'
    $restoredTableCount = [int](($tableOutput | Select-Object -Last 1).ToString().Trim())
    if ($restoredTableCount -ne [int]$manifest.backup.databaseTableCount) {
        throw "Restored table count mismatch: expected $($manifest.backup.databaseTableCount), got $restoredTableCount."
    }

    $mediaHelper = "${TargetProjectName}-media-restore"
    Invoke-DockerChecked -Arguments @('create', '--name', $mediaHelper, '--entrypoint', 'sh', '--mount', "type=volume,source=${TargetProjectName}_media_data,target=/data/media", $backendTargetImage, '-c', 'tar -xzf /tmp/media.tar.gz -C /data/media && find /data/media -type f | wc -l') -Description 'create media restore helper' | Out-Null
    $mediaArtifact = Get-PortableArtifact -Manifest $manifest -Role 'mediaBackup'
    Invoke-DockerChecked -Arguments @('cp', (Resolve-PortableArtifactPath -PackageDirectory $packagePath -RelativePath ([string]$mediaArtifact.path)), "${mediaHelper}:/tmp/media.tar.gz") -Description 'copy media backup' | Out-Null
    $mediaOutput = Invoke-DockerChecked -Arguments @('start', '--attach', $mediaHelper) -Description 'restore and count media files'
    $restoredMediaCount = [int](($mediaOutput | Select-Object -Last 1).ToString().Trim())
    if ($restoredMediaCount -ne [int]$manifest.backup.mediaFileCount) {
        throw "Restored media count mismatch: expected $($manifest.backup.mediaFileCount), got $restoredMediaCount."
    }
    Invoke-DockerChecked -Arguments @('rm', $mediaHelper) -Description 'remove successful media restore helper' | Out-Null

    Invoke-DockerChecked -Arguments (Get-ComposeArguments -Tail @('up', '-d', '--no-build', 'backend', 'frontend')) -Description 'start isolated backend and frontend' | Out-Null
    $runningServices = @(Invoke-DockerChecked -Arguments (Get-ComposeArguments -Tail @('ps', '--status', 'running', '--services')) -Description 'check isolated services')
    foreach ($service in @('db', 'backend', 'frontend')) {
        if ($runningServices -notcontains $service) { throw "Isolated service is not running: $service" }
    }

    Write-RestoreLog "RESTORE COMPLETE: $restoredTableCount tables and $restoredMediaCount media files verified."
    Write-Host "Frontend: http://127.0.0.1:$FrontendHostPort/"
    Write-Host "Backend: http://127.0.0.1:$BackendHostPort/"
    Write-Host "MySQL: 127.0.0.1:$MySqlHostPort"
}
catch {
    if ($targetCreated) { Write-RestoreLog "FAILED: $($_.Exception.Message)" }
    if ($targetCreated) {
        Write-Host "The target directory and diagnostics were preserved at: $targetPath"
    }
    if ($restoreStarted) {
        Write-Host 'The isolated environment has been preserved for diagnosis. No container or volume was deleted.'
        Write-Host "Inspect: docker compose --project-name $TargetProjectName --env-file `"$targetPath\.env`" -f `"$targetPath\compose.yaml`" -f `"$targetPath\compose.portable.override.yaml`" ps"
        Write-Host "Manual non-destructive rollback: use the same command prefix followed by 'stop'. Do not use down -v."
    }
    throw
}
