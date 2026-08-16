Set-StrictMode -Version Latest

function Get-PortableFullPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [string]$BasePath = (Get-Location).Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

function Resolve-PortableArtifactPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageDirectory,
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    if ([string]::IsNullOrWhiteSpace($RelativePath) -or [System.IO.Path]::IsPathRooted($RelativePath)) {
        throw "Artifact path must be a non-empty relative path: $RelativePath"
    }
    $segments = $RelativePath -split '[\\/]'
    if ($segments -contains '..' -or $segments -contains '.') {
        throw "Artifact path contains a forbidden traversal segment: $RelativePath"
    }

    $root = Get-PortableFullPath -Path $PackageDirectory
    $candidate = Get-PortableFullPath -Path $RelativePath -BasePath $root
    $prefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $candidate.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Artifact path escapes the package directory: $RelativePath"
    }
    return $candidate
}

function Assert-PortableProjectName {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectName,
        [string]$ActiveProjectName = ''
    )

    if ($ProjectName -notmatch '^[a-z0-9][a-z0-9_-]{1,62}$') {
        throw 'TargetProjectName must contain 2-63 lowercase letters, digits, hyphens, or underscores, and must start with a letter or digit.'
    }
    if ($ProjectName -eq 'zhixing-studio-mvp') {
        throw 'TargetProjectName zhixing-studio-mvp is reserved and cannot be used for a portable restore.'
    }
    if (-not [string]::IsNullOrWhiteSpace($ActiveProjectName) -and $ProjectName -eq $ActiveProjectName) {
        throw "TargetProjectName matches the active project: $ActiveProjectName"
    }
}

function Assert-EmptyPortableTarget {
    param([Parameter(Mandatory = $true)][string]$TargetDirectory)

    $target = Get-PortableFullPath -Path $TargetDirectory
    if (Test-Path -LiteralPath $target) {
        if (-not (Test-Path -LiteralPath $target -PathType Container)) {
            throw "TargetDirectory is not a directory: $target"
        }
        if (@(Get-ChildItem -LiteralPath $target -Force).Count -gt 0) {
            throw "TargetDirectory must be empty: $target"
        }
    }
    return $target
}

function Assert-NoPortableDockerResources {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectName,
        [string[]]$ExistingContainers = @(),
        [string[]]$ExistingVolumes = @()
    )

    if (@($ExistingContainers).Count -gt 0) {
        throw "Containers already exist for project ${ProjectName}: $($ExistingContainers -join ', ')"
    }
    if (@($ExistingVolumes).Count -gt 0) {
        throw "Volumes already exist for project ${ProjectName}: $($ExistingVolumes -join ', ')"
    }
}

function Test-PortableSourceArchive {
    param([Parameter(Mandatory = $true)][string]$ArchivePath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        foreach ($entry in $archive.Entries) {
            $path = $entry.FullName.Replace('\\', '/').TrimStart('/')
            $segments = @($path -split '/')
            $leaf = if ($segments.Count -gt 0) { $segments[-1] } else { '' }
            $containsForbiddenDirectory = @($segments | Where-Object { $_ -in @('.git', 'node_modules', 'artifacts', 'backups') }).Count -gt 0
            $isSecretEnv = $leaf -eq '.env' -or ($leaf -like '.env.*' -and $leaf -ne '.env.example')
            if ($containsForbiddenDirectory -or $isSecretEnv) {
                throw "Forbidden path found in source.zip: $path"
            }
        }
    }
    finally {
        $archive.Dispose()
    }
}

function Read-PortableManifest {
    param([Parameter(Mandatory = $true)][string]$PackageDirectory)

    $packagePath = Get-PortableFullPath -Path $PackageDirectory
    $manifestPath = Join-Path $packagePath 'manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Portable manifest not found: $manifestPath"
    }
    try {
        $manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
    }
    catch {
        throw "Portable manifest is not valid JSON: $($_.Exception.Message)"
    }
    if ($manifest.formatVersion -ne 1) {
        throw "Unsupported portable package format version: $($manifest.formatVersion)"
    }
    if ([string]::IsNullOrWhiteSpace([string]$manifest.gitCommit) -or [string]::IsNullOrWhiteSpace([string]$manifest.createdAtUtc)) {
        throw 'Portable manifest is missing gitCommit or createdAtUtc.'
    }
    if ($null -eq $manifest.backup -or [int]$manifest.backup.databaseTableCount -lt 0 -or [int]$manifest.backup.mediaFileCount -lt 0) {
        throw 'Portable manifest contains invalid backup metadata.'
    }
    $artifacts = @($manifest.artifacts)
    $requiredRoles = @('source', 'frontendImage', 'backendImage', 'mysqlImage', 'databaseBackup', 'mediaBackup', 'backupManifest', 'restoreDocumentation')
    foreach ($role in $requiredRoles) {
        if (@($artifacts | Where-Object { $_.role -eq $role }).Count -ne 1) {
            throw "Portable manifest must contain exactly one artifact with role: $role"
        }
    }
    $duplicatePaths = $artifacts | Group-Object path | Where-Object Count -gt 1
    if ($duplicatePaths) {
        throw "Portable manifest contains duplicate artifact paths: $($duplicatePaths.Name -join ', ')"
    }
    foreach ($artifact in $artifacts) {
        if ([string]$artifact.sha256 -notmatch '^[0-9a-f]{64}$' -or [long]$artifact.sizeBytes -lt 0) {
            throw "Portable manifest contains invalid hash or size metadata for: $($artifact.path)"
        }
        [void](Resolve-PortableArtifactPath -PackageDirectory $packagePath -RelativePath ([string]$artifact.path))
    }
    return $manifest
}

function Test-PortablePackage {
    param([Parameter(Mandatory = $true)][string]$PackageDirectory)

    $packagePath = Get-PortableFullPath -Path $PackageDirectory
    $manifest = Read-PortableManifest -PackageDirectory $packagePath
    $checksumPath = Join-Path $packagePath 'SHA256SUMS.txt'
    if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
        throw "SHA-256 checksum list not found: $checksumPath"
    }

    $listed = @{}
    foreach ($line in @(Get-Content -Encoding utf8 -LiteralPath $checksumPath)) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -notmatch '^([0-9a-f]{64})  (.+)$') {
            throw "Invalid SHA256SUMS.txt line: $line"
        }
        if ($listed.ContainsKey($Matches[2])) {
            throw "Duplicate checksum path: $($Matches[2])"
        }
        $listed[$Matches[2]] = $Matches[1]
    }

    $artifacts = @($manifest.artifacts)
    if ($listed.Count -ne $artifacts.Count) {
        throw 'SHA256SUMS.txt and manifest artifact counts do not match.'
    }
    foreach ($artifact in $artifacts) {
        $relativePath = [string]$artifact.path
        $fullPath = Resolve-PortableArtifactPath -PackageDirectory $packagePath -RelativePath $relativePath
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            throw "Portable artifact not found: $relativePath"
        }
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $fullPath).Hash.ToLowerInvariant()
        if ($hash -ne [string]$artifact.sha256 -or -not $listed.ContainsKey($relativePath) -or $listed[$relativePath] -ne $hash) {
            throw "Portable artifact checksum mismatch: $relativePath"
        }
        if ((Get-Item -LiteralPath $fullPath).Length -ne [long]$artifact.sizeBytes) {
            throw "Portable artifact size mismatch: $relativePath"
        }
    }

    $sourceArtifact = $artifacts | Where-Object role -eq 'source' | Select-Object -First 1
    Test-PortableSourceArchive -ArchivePath (Resolve-PortableArtifactPath -PackageDirectory $packagePath -RelativePath ([string]$sourceArtifact.path))
    return $manifest
}

function Get-PortableArtifact {
    param(
        [Parameter(Mandatory = $true)]$Manifest,
        [Parameter(Mandatory = $true)][string]$Role
    )

    return @($Manifest.artifacts | Where-Object role -eq $Role)[0]
}
