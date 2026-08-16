[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\portable-common.ps1')

$script:passed = 0
function Invoke-TestCase {
    param([string]$Name, [scriptblock]$Test)
    & $Test
    $script:passed++
    Write-Host "PASS: $Name"
}

function Assert-Throws {
    param([scriptblock]$Action, [string]$Pattern = '*')
    try { & $Action }
    catch {
        if ($_.Exception.Message -notlike $Pattern) {
            throw "Expected error like '$Pattern', got: $($_.Exception.Message)"
        }
        return
    }
    throw 'Expected the action to throw.'
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "zhixing-portable-tests-$PID"
New-Item -ItemType Directory -Path $tempRoot | Out-Null
try {
    Invoke-TestCase 'PowerShell scripts parse without syntax errors' {
        foreach ($scriptFile in Get-ChildItem (Join-Path $repoRoot 'scripts') -Filter '*.ps1' -Recurse) {
            $tokens = $null
            $errors = $null
            [void][System.Management.Automation.Language.Parser]::ParseFile($scriptFile.FullName, [ref]$tokens, [ref]$errors)
            if ($errors.Count -gt 0) { throw "$($scriptFile.Name): $($errors.Message -join '; ')" }
        }
    }

    Invoke-TestCase 'Project name rules reject reserved, active, and invalid names' {
        Assert-PortableProjectName -ProjectName 'portable-test-20260814' -ActiveProjectName 'zhixing-studio'
        Assert-Throws { Assert-PortableProjectName -ProjectName 'zhixing-studio-mvp' } '*reserved*'
        Assert-Throws { Assert-PortableProjectName -ProjectName 'zhixing-studio' -ActiveProjectName 'zhixing-studio' } '*active project*'
        Assert-Throws { Assert-PortableProjectName -ProjectName '../escape' } '*must contain*'
    }

    Invoke-TestCase 'Artifact paths cannot escape the package' {
        [void](Resolve-PortableArtifactPath -PackageDirectory $tempRoot -RelativePath 'backup/database.sql')
        Assert-Throws { Resolve-PortableArtifactPath -PackageDirectory $tempRoot -RelativePath '../secret.env' } '*traversal*'
        Assert-Throws { Resolve-PortableArtifactPath -PackageDirectory $tempRoot -RelativePath (Join-Path $tempRoot 'absolute.txt') } '*relative path*'
    }

    Invoke-TestCase 'Non-empty targets and existing Docker resources are rejected' {
        $target = Join-Path $tempRoot 'non-empty'
        New-Item -ItemType Directory -Path $target | Out-Null
        Set-Content -LiteralPath (Join-Path $target 'keep.txt') -Value 'keep'
        Assert-Throws { Assert-EmptyPortableTarget -TargetDirectory $target } '*must be empty*'
        Assert-Throws { Assert-NoPortableDockerResources -ProjectName 'portable-test' -ExistingContainers @('portable-test-db-1') } '*Containers already exist*'
        Assert-Throws { Assert-NoPortableDockerResources -ProjectName 'portable-test' -ExistingVolumes @('portable-test_mysql_data') } '*Volumes already exist*'
    }

    Invoke-TestCase 'Source archive rejects .env and excluded directories' {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zipRoot = Join-Path $tempRoot 'zip-source'
        New-Item -ItemType Directory -Path $zipRoot | Out-Null
        Set-Content -LiteralPath (Join-Path $zipRoot '.env') -Value 'SECRET=value'
        $zipPath = Join-Path $tempRoot 'forbidden.zip'
        [System.IO.Compression.ZipFile]::CreateFromDirectory($zipRoot, $zipPath)
        Assert-Throws { Test-PortableSourceArchive -ArchivePath $zipPath } '*Forbidden path*'
    }

    Invoke-TestCase 'Manifest and checksums validate, then reject tampering' {
        $package = Join-Path $tempRoot 'package'
        New-Item -ItemType Directory -Path (Join-Path $package 'images') -Force | Out-Null
        New-Item -ItemType Directory -Path (Join-Path $package 'backup') -Force | Out-Null
        New-Item -ItemType Directory -Path (Join-Path $package 'docs') -Force | Out-Null
        $sourceRoot = Join-Path $tempRoot 'clean-source'
        New-Item -ItemType Directory -Path $sourceRoot | Out-Null
        Set-Content -LiteralPath (Join-Path $sourceRoot '.env.example') -Value 'SAFE=true'
        [System.IO.Compression.ZipFile]::CreateFromDirectory($sourceRoot, (Join-Path $package 'source.zip'))
        $roles = [ordered]@{
            source = 'source.zip'; frontendImage = 'images/frontend.tar'; backendImage = 'images/backend.tar'; mysqlImage = 'images/mysql.tar'
            databaseBackup = 'backup/database.sql'; mediaBackup = 'backup/media.tar.gz'; backupManifest = 'backup/manifest.json'; restoreDocumentation = 'docs/PORTABLE_PACKAGE.md'
        }
        foreach ($path in $roles.Values | Where-Object { $_ -ne 'source.zip' }) {
            Set-Content -LiteralPath (Join-Path $package $path) -Value $path
        }
        $artifacts = foreach ($entry in $roles.GetEnumerator()) {
            $file = Join-Path $package $entry.Value
            [ordered]@{ role = $entry.Key; path = $entry.Value; sizeBytes = (Get-Item $file).Length; sha256 = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant() }
        }
        $manifest = [ordered]@{ formatVersion = 1; createdAtUtc = '2026-08-14T00:00:00Z'; gitCommit = ('a' * 40); backup = @{ databaseTableCount = 1; mediaFileCount = 0 }; artifacts = @($artifacts) }
        $manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $package 'manifest.json')
        $artifacts | ForEach-Object { "$($_.sha256)  $($_.path)" } | Set-Content -Encoding utf8 -LiteralPath (Join-Path $package 'SHA256SUMS.txt')
        [void](Test-PortablePackage -PackageDirectory $package)
        Add-Content -LiteralPath (Join-Path $package 'backup/database.sql') -Value 'tampered'
        Assert-Throws { Test-PortablePackage -PackageDirectory $package } '*checksum mismatch*'
    }

    Write-Host "Portable script tests passed: $script:passed"
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
