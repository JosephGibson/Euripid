<#
.SYNOPSIS
    Euripid - project-aware k6 + k6/browser performance test orchestrator.

.DESCRIPTION
    Resolves k6, runs a chosen scenario inside a specific project against an
    environment variant + load profile, and packages every run into a
    timestamped zip with config snapshots, summary HTML/JSON, screenshots,
    console output, and a structured log file.

    Written in cross-OS PowerShell. Windows prefers a downloaded `bin/k6.exe`
    sourced from the latest Grafana k6 GitHub release; Linux/macOS use
    `bin/k6` when present or fall back to `k6` on PATH.

.PARAMETER Project
    Project directory under `projects/` (without path). Required.

.PARAMETER Scenario
    Scenario file under `projects/<project>/scenarios/` (without .ts). Required.

.PARAMETER Environment
    Named environment variant inside `projects/<project>/project.config.json`. Required.

.PARAMETER Profile
    Profile JSON under `projects/<project>/profiles/` (without .json). Required.

.PARAMETER DataFile
    Optional CSV file under `projects/<project>/data/`. If omitted, the runner
    uses `project.defaultDataFile` from `project.config.json` when present.

.PARAMETER RunName
    Optional friendly tag written into the orchestrator log for human context.
    It does not change the fixed run directory naming format.

.PARAMETER NoBanner
    Suppress the ASCII startup banner.

.PARAMETER NoZip
    Keep the loose run directory but skip the zip step.

.PARAMETER Quiet
    Suppress non-error console output. The log file is still written in full.

.PARAMETER LogLevel
    Overrides k6 scenario error logging verbosity (passed as EURIPID_LOG_LEVEL).
    Values: error, warn, info, debug.

.PARAMETER DisableScenarioErrorLog
    Sets EURIPID_LOG_SCENARIO_ERRORS=false so k6 does not print EURIPID_ERROR
    JSON lines (scenario_errors counter still increments on failure).

.PARAMETER IncludeUserContextInLogs
    Sets EURIPID_INCLUDE_USER_CONTEXT=true — error lines may include username
    or role hints from the CSV row (passwords are never logged).

.PARAMETER Validate
    Resolve all parameters and print the resolved configuration as JSON, then
    exit without creating a run directory or invoking k6. Useful for agents
    and humans to verify a parameter combination before committing to a run.

.EXAMPLE
    ./scripts/run.ps1 -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke

.EXAMPLE
    ./scripts/run.ps1 -Project template-project -Scenario Sc03_browser_login -Environment staging -Profile load -RunName release-123
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Project,
    [Parameter(Mandatory)] [string] $Scenario,
    [Parameter(Mandatory)] [string] $Environment,
    [Parameter(Mandatory)] [string] $Profile,
    [string] $DataFile = '',
    [string] $RunName = '',
    [switch] $NoBanner,
    [switch] $NoZip,
    [switch] $Quiet,
    [string] $LogLevel = '',
    [switch] $DisableScenarioErrorLog,
    [switch] $IncludeUserContextInLogs,
    [switch] $Validate
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$script:LogFile = $null
$script:LogBuffer = [System.Collections.Generic.List[string]]::new()
$script:VerboseEnabled = $VerbosePreference -ne 'SilentlyContinue'
$script:OnWindows = ($PSVersionTable.PSVersion.Major -lt 6) -or $IsWindows

function Write-Tagged {
    param(
        [Parameter(Mandatory)] [string] $Tag,
        [Parameter(Mandatory)] [ConsoleColor] $Color,
        [Parameter(Mandatory)] [string] $Message,
        [switch] $AlwaysConsole
    )

    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $plain = "$stamp [$Tag] $Message"

    if ($AlwaysConsole -or -not $Quiet) {
        Write-Host "[$Tag] " -ForegroundColor $Color -NoNewline
        Write-Host $Message
    }

    if ($script:LogFile) {
        Add-Content -Path $script:LogFile -Value $plain
    } else {
        $script:LogBuffer.Add($plain) | Out-Null
    }
}

function Write-Log   { param([string]$m) Write-Tagged -Tag 'LOG'   -Color Blue     -Message $m }
function Write-Step  { param([string]$m) Write-Tagged -Tag 'STEP'  -Color Magenta  -Message $m }
function Write-Ok    { param([string]$m) Write-Tagged -Tag 'OK'    -Color Green    -Message $m }
function Write-Warn2 { param([string]$m) Write-Tagged -Tag 'WARN'  -Color Yellow   -Message $m }
function Write-Err   { param([string]$m) Write-Tagged -Tag 'ERROR' -Color Red      -Message $m -AlwaysConsole }
function Write-Dbg   { param([string]$m) if ($script:VerboseEnabled) { Write-Tagged -Tag 'DEBUG' -Color DarkGray -Message $m } }

function Open-LogFile {
    param([Parameter(Mandatory)] [string] $Path)
    $script:LogFile = $Path
    if ($script:LogBuffer.Count -gt 0) {
        Add-Content -Path $script:LogFile -Value $script:LogBuffer
        $script:LogBuffer.Clear()
    }
}

function Convert-ToRunSafeName {
    param(
        [Parameter(Mandatory)] [string] $Value,
        [string] $Fallback = 'Project'
    )

    $safe = ($Value -replace '[^A-Za-z0-9]+', '')
    if ([string]::IsNullOrWhiteSpace($safe)) {
        $safe = ($Fallback -replace '[^A-Za-z0-9]+', '')
        if ([string]::IsNullOrWhiteSpace($safe)) {
            return 'Project'
        }
    }

    return $safe
}

function New-RunId {
    param(
        [Parameter(Mandatory)] [string] $ResultsRoot,
        [Parameter(Mandatory)] [string] $ProjectName
    )

    while ($true) {
        $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
        $candidate = "${timestamp}_${ProjectName}"
        $candidateDir = Join-Path $ResultsRoot $candidate
        $candidateZip = Join-Path $ResultsRoot "$candidate.zip"

        if (-not (Test-Path $candidateDir) -and -not (Test-Path $candidateZip)) {
            return $candidate
        }

        Start-Sleep -Seconds 1
    }
}

function Write-Banner {
    if ($NoBanner -or $Quiet) { return }
    $versionFile = Join-Path (Join-Path $PSScriptRoot '..') 'VERSION'
    $version = if (Test-Path $versionFile) { (Get-Content $versionFile -Raw).Trim() } else { 'dev' }
    $banner = @'
 _____ _   _ ____  ___ ____ ___ ____  
| ____| | | |  _ \|_ _|  _ \_ _|  _ \ 
|  _| | | | | |_) || || |_) | || | | |
| |___| |_| |  _ < | ||  __/| || |_| |
|_____|\___/|_| \_\___|_|  |___|____/ 
'@
    Write-Host ''
    Write-Host $banner -ForegroundColor Cyan
    Write-Host "  project-aware k6 + k6/browser performance harness" -ForegroundColor DarkGray
    Write-Host "  v$version" -ForegroundColor DarkGray
    Write-Host ''
}

function Get-WindowsK6AssetPattern {
    try {
        $architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
    } catch {
        $architecture = 'x64'
    }

    switch ($architecture) {
        'arm64' { return 'windows-arm64.zip' }
        default { return 'windows-amd64.zip' }
    }
}

function Ensure-WindowsK6Binary {
    param(
        [Parameter(Mandatory)] [string] $RepoRoot,
        [Parameter(Mandatory)] [string] $BundledPath
    )

    if (Test-Path $BundledPath) {
        return $BundledPath
    }

    $binDir = Split-Path -Parent $BundledPath
    if (-not (Test-Path $binDir)) {
        New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    }

    Write-Step 'Downloading latest Windows k6 binary to bin/k6.exe'
    $headers = @{ 'User-Agent' = 'Euripid' }
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/grafana/k6/releases/latest' -Headers $headers
    $pattern = Get-WindowsK6AssetPattern
    $asset = $release.assets | Where-Object { $_.name -like "*$pattern" } | Select-Object -First 1
    if (-not $asset) {
        throw "Could not find a Windows k6 release asset matching '*$pattern'."
    }

    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("euripid-k6-" + [guid]::NewGuid().ToString('N'))
    $zipPath = Join-Path $tempRoot $asset.name
    $extractDir = Join-Path $tempRoot 'extract'
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

    try {
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -Headers $headers
        Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
        $downloadedK6 = Get-ChildItem -Path $extractDir -Recurse -Filter 'k6.exe' | Select-Object -First 1
        if (-not $downloadedK6) {
            throw "Downloaded archive '$($asset.name)' did not contain k6.exe."
        }
        Copy-Item $downloadedK6.FullName $BundledPath -Force
    } finally {
        if (Test-Path $tempRoot) {
            Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Ok "Downloaded latest k6 release asset to $BundledPath"
    return $BundledPath
}

function Resolve-K6 {
    param([Parameter(Mandatory)] [string] $RepoRoot)

    if ($script:OnWindows) {
        $bundled = Join-Path (Join-Path $RepoRoot 'bin') 'k6.exe'
        return Ensure-WindowsK6Binary -RepoRoot $RepoRoot -BundledPath $bundled
    }

    $bundled = Join-Path (Join-Path $RepoRoot 'bin') 'k6'
    if (Test-Path $bundled) { return $bundled }

    $cmd = Get-Command k6 -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    throw 'k6 binary not found. Install k6 on PATH or place it at bin/k6.'
}

Write-Banner

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot
Write-Dbg "Repo root: $RepoRoot"

try {
    $K6 = Resolve-K6 -RepoRoot $RepoRoot
    Write-Log "k6 binary: $K6"
} catch {
    Write-Err $_.Exception.Message
    exit 2
}

$ProjectRoot = "projects/$Project"
$ProjectConfigFile = "$ProjectRoot/project.config.json"
$ScenarioFile = "$ProjectRoot/scenarios/$Scenario.ts"
$ProfileFile = "$ProjectRoot/profiles/$Profile.json"

$missing = @()
foreach ($f in @($ProjectConfigFile, $ScenarioFile, $ProfileFile)) {
    if (-not (Test-Path (Join-Path $RepoRoot $f))) { $missing += $f }
}
if ($missing.Count -gt 0) {
    foreach ($f in $missing) { Write-Err "Required file not found: $f" }
    exit 2
}

try {
    $ProjectConfig = Get-Content (Join-Path $RepoRoot $ProjectConfigFile) -Raw | ConvertFrom-Json
} catch {
    Write-Err "Failed to parse project config: $ProjectConfigFile"
    Write-Err $_.Exception.Message
    exit 2
}

if (-not $ProjectConfig.project) {
    Write-Err "Project config missing 'project' object: $ProjectConfigFile"
    exit 2
}

if (-not $ProjectConfig.environments) {
    Write-Err "Project config missing 'environments' object: $ProjectConfigFile"
    exit 2
}

$environmentProperty = $ProjectConfig.environments.PSObject.Properties[$Environment]
if (-not $environmentProperty) {
    $available = ($ProjectConfig.environments.PSObject.Properties.Name | Sort-Object) -join ', '
    Write-Err "Environment '$Environment' not found in $ProjectConfigFile. Available: $available"
    exit 2
}

$ResolvedEnvironment = $environmentProperty.Value

$ResolvedDataFile = $DataFile
if (-not $ResolvedDataFile -and $ProjectConfig.project.defaultDataFile) {
    $ResolvedDataFile = [string] $ProjectConfig.project.defaultDataFile
}

$DataPath = if ($ResolvedDataFile) { "$ProjectRoot/data/$ResolvedDataFile" } else { '' }
$script:HasDataFile = $false
if ($DataPath) {
    $script:HasDataFile = Test-Path (Join-Path $RepoRoot $DataPath)
    if (-not $script:HasDataFile) {
        Write-Dbg "Data file not found ($DataPath) — skipping data snapshot and DATA_FILE env var"
    }
}

Write-Dbg "Inputs validated: project=$Project scenario=$Scenario environment=$Environment profile=$Profile data=$ResolvedDataFile (present=$($script:HasDataFile))"

if ($Validate) {
    $k6Preview = "$K6 run -e PROJECT=$Project -e ENVIRONMENT=$Environment -e PROJECT_CONFIG_FILE=$ProjectConfigFile -e PROFILE_FILE=$ProfileFile -e RUN_OUTPUT_DIR=<run-dir>"
    if ($script:HasDataFile) { $k6Preview += " -e DATA_FILE=$DataPath" }
    if ($LogLevel)           { $k6Preview += " -e EURIPID_LOG_LEVEL=$LogLevel" }
    $k6Preview += " $ScenarioFile"

    [ordered]@{
        project             = $Project
        scenario            = $Scenario
        environment         = $Environment
        profile             = $Profile
        scenarioFile        = $ScenarioFile
        projectConfigFile   = $ProjectConfigFile
        profileFile         = $ProfileFile
        dataFile            = if ($ResolvedDataFile) { $DataPath } else { $null }
        dataFileFound       = $script:HasDataFile
        k6Binary            = $K6
        resolvedEnvironment = $ResolvedEnvironment
        k6CommandPreview    = $k6Preview
    } | ConvertTo-Json -Depth 10
    exit 0
}

$ResultsRootAbs = Join-Path $RepoRoot "$ProjectRoot/results"
New-Item -ItemType Directory -Path $ResultsRootAbs -Force | Out-Null
$RunProjectName = Convert-ToRunSafeName ([string] $ProjectConfig.project.name) -Fallback $Project
$RunId = New-RunId -ResultsRoot $ResultsRootAbs -ProjectName $RunProjectName
$RunDir = "$ProjectRoot/results/$RunId"
$RunDirAbs = Join-Path $RepoRoot $RunDir
New-Item -ItemType Directory -Path $RunDirAbs -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $RunDirAbs 'screenshots') -Force | Out-Null

Open-LogFile (Join-Path $RunDirAbs 'euripid.log')
Write-Step "Project: $Project"
Write-Step "Run ID: $RunId"
if ($RunName) {
    Write-Log "RunName: $RunName (informational only; directory naming remains fixed)"
}

$JsonOut = "$RunDir/k6-stream.json"
$ConsoleLog = Join-Path $RunDirAbs 'k6-console.log'

Copy-Item (Join-Path $RepoRoot $ProjectConfigFile) (Join-Path $RunDirAbs 'project.config.json')
($ResolvedEnvironment | ConvertTo-Json -Depth 20) | Set-Content -Path (Join-Path $RunDirAbs 'environment.json')
Copy-Item (Join-Path $RepoRoot $ProfileFile) (Join-Path $RunDirAbs 'profile.json')
if ($script:HasDataFile) {
    Copy-Item (Join-Path $RepoRoot $DataPath) (Join-Path $RunDirAbs 'data.csv')
}
Write-Log "Snapshotted project config, resolved environment, profile, and data=$(if ($script:HasDataFile) {'yes'} else {'skipped'})"

$k6Args = @(
    'run',
    '-e', "PROJECT=$Project",
    '-e', "ENVIRONMENT=$Environment",
    '-e', "PROJECT_CONFIG_FILE=$ProjectConfigFile",
    '-e', "PROFILE_FILE=$ProfileFile",
    '-e', "RUN_OUTPUT_DIR=$RunDir",
    '--out', "json=$JsonOut"
)

if ($script:HasDataFile) {
    $k6Args += '-e', "DATA_FILE=$DataPath"
}
if ($LogLevel) {
    $k6Args += '-e', "EURIPID_LOG_LEVEL=$LogLevel"
}
if ($DisableScenarioErrorLog) {
    $k6Args += '-e', 'EURIPID_LOG_SCENARIO_ERRORS=false'
}
if ($IncludeUserContextInLogs) {
    $k6Args += '-e', 'EURIPID_INCLUDE_USER_CONTEXT=true'
}
$k6Args += $ScenarioFile

Write-Step 'Invoking k6'
Write-Dbg "Command: $K6 $($k6Args -join ' ')"

$exitCode = 0
try {
    & $K6 @k6Args 2>&1 | Tee-Object -FilePath $ConsoleLog
    $exitCode = $LASTEXITCODE
} catch {
    $exitCode = 1
    Write-Err "k6 invocation threw: $($_.Exception.Message)"
    $_ | Out-File -Append $ConsoleLog
}

if ($exitCode -eq 0) {
    Write-Ok 'k6 completed successfully'
} else {
    Write-Warn2 "k6 exited with code $exitCode (thresholds may have failed)"
}

if (-not $NoZip) {
    $ZipPath = Join-Path $RepoRoot "$ProjectRoot/results/$RunId.zip"
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
    try {
        Compress-Archive -Path (Join-Path $RunDirAbs '*') -DestinationPath $ZipPath
        Write-Ok "Packaged: $ZipPath"
    } catch {
        Write-Err "Failed to package zip: $($_.Exception.Message)"
        $exitCode = if ($exitCode -eq 0) { 3 } else { $exitCode }
    }
} else {
    Write-Log "Skipped zip packaging (-NoZip). Loose run dir at: $RunDirAbs"
}

Write-Log "Done. Run dir: $RunDirAbs"
exit $exitCode
