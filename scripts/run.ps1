<#
.SYNOPSIS
    Euripid - k6 + k6/browser performance test orchestrator.

.DESCRIPTION
    Resolves k6, runs a chosen scenario against an environment + load profile,
    and packages every run into a timestamped zip with config snapshot,
    summary HTML/JSON, screenshots, console output, and a structured log file.

    v1.0 is Windows-first. Written in cross-OS pwsh (works on Linux/macOS too).

.PARAMETER Scenario
    Scenario file under src/scenarios/ (without .js). Required.

.PARAMETER Environment
    Environment JSON under config/environments/ (without .json). Required.

.PARAMETER Profile
    Profile JSON under config/profiles/ (without .json). Required.

.PARAMETER DataFile
    CSV file under data/ (with extension). Default: users.csv.
    If the file does not exist, it is silently skipped (useful for scenarios
    that do not import data.js, e.g. self-test).

.PARAMETER RunName
    Optional friendly tag baked into the output zip name.

.PARAMETER NoBanner
    Suppress the ASCII startup banner.

.PARAMETER NoZip
    Keep the loose run directory but skip the zip step.

.PARAMETER Quiet
    Suppress non-error console output. The log file is still written in full.

.PARAMETER LogLevel
    Overrides k6 scenario error logging verbosity (passed as EURIPID_LOG_LEVEL).
    Values: error, warn, info, debug. Same as environment JSON "logging"."level".

.PARAMETER DisableScenarioErrorLog
    Sets EURIPID_LOG_SCENARIO_ERRORS=false so k6 does not print EURIPID_ERROR JSON lines
    (scenario_errors counter still increments on failure).

.PARAMETER IncludeUserContextInLogs
    Sets EURIPID_INCLUDE_USER_CONTEXT=true — error lines may include username/role hints
    from the CSV row (passwords are never logged).

.EXAMPLE
    ./scripts/run.ps1 -Scenario browser-login -Environment staging -Profile load

.EXAMPLE
    ./scripts/run.ps1 -Scenario self-test -Environment self-test -Profile smoke -NoBanner

.EXAMPLE
    ./scripts/run.ps1 -Scenario browser-login -Environment staging -Profile load -RunName release-123 -Verbose
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Scenario,
    [Parameter(Mandatory)] [string] $Environment,
    [Parameter(Mandatory)] [string] $Profile,
    [string] $DataFile = 'users.csv',
    [string] $RunName  = '',
    [switch] $NoBanner,
    [switch] $NoZip,
    [switch] $Quiet,
    [string] $LogLevel = '',
    [switch] $DisableScenarioErrorLog,
    [switch] $IncludeUserContextInLogs
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# =============================================================================
#  Logging subsystem
# =============================================================================
# Tagged, colored console output + plain timestamped log file. Functions are
# safe to call before $script:LogFile is set; they'll buffer and flush on open.

$script:LogFile = $null
$script:LogBuffer = [System.Collections.Generic.List[string]]::new()
$script:VerboseEnabled = $VerbosePreference -ne 'SilentlyContinue'

function Write-Tagged {
    param(
        [Parameter(Mandatory)] [string] $Tag,
        [Parameter(Mandatory)] [ConsoleColor] $Color,
        [Parameter(Mandatory)] [string] $Message,
        [switch] $AlwaysConsole
    )
    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $plain = "$stamp [$Tag] $Message"

    # Console (color), unless -Quiet (errors always print regardless).
    if ($AlwaysConsole -or -not $Quiet) {
        Write-Host "[$Tag] " -ForegroundColor $Color -NoNewline
        Write-Host $Message
    }

    # Log file or buffer.
    if ($script:LogFile) {
        Add-Content -Path $script:LogFile -Value $plain
    } else {
        $script:LogBuffer.Add($plain) | Out-Null
    }
}

function Write-Log    { param([string]$m) Write-Tagged -Tag 'LOG'   -Color Blue       -Message $m }
function Write-Step   { param([string]$m) Write-Tagged -Tag 'STEP'  -Color Magenta    -Message $m }
function Write-Ok     { param([string]$m) Write-Tagged -Tag 'OK'    -Color Green      -Message $m }
function Write-Warn2  { param([string]$m) Write-Tagged -Tag 'WARN'  -Color Yellow     -Message $m }
function Write-Err    { param([string]$m) Write-Tagged -Tag 'ERROR' -Color Red        -Message $m -AlwaysConsole }
function Write-Dbg    { param([string]$m) if ($script:VerboseEnabled) { Write-Tagged -Tag 'DEBUG' -Color DarkGray -Message $m } }

function Open-LogFile {
    param([string]$Path)
    $script:LogFile = $Path
    # Flush any buffered lines collected before the file existed.
    if ($script:LogBuffer.Count -gt 0) {
        Add-Content -Path $script:LogFile -Value $script:LogBuffer
        $script:LogBuffer.Clear()
    }
}

# =============================================================================
#  Banner
# =============================================================================
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
    Write-Host "  k6 + k6/browser performance harness" -ForegroundColor DarkGray
    Write-Host "  v$version" -ForegroundColor DarkGray
    Write-Host ''
}

# =============================================================================
#  Main
# =============================================================================
Write-Banner

# --- Resolve repo root (script lives in scripts/) ----------------------------
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot
Write-Dbg "Repo root: $RepoRoot"

# --- Resolve k6 binary -------------------------------------------------------
# $IsWindows is PowerShell 7+ only. On Windows PowerShell 5.1 (the default on
# most corporate Windows boxes) it's undefined and StrictMode would throw, so
# detect via $PSVersionTable first and short-circuit before referencing it.
$script:OnWindows = ($PSVersionTable.PSVersion.Major -lt 6) -or $IsWindows

function Resolve-K6 {
    $ext = if ($script:OnWindows) { 'k6.exe' } else { 'k6' }
    $bundled = Join-Path (Join-Path $RepoRoot 'bin') $ext
    if (Test-Path $bundled) { return $bundled }
    $cmd = Get-Command k6 -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "k6 binary not found. Place it at bin/$ext or install k6 on PATH."
}

try {
    $K6 = Resolve-K6
    Write-Log "k6 binary: $K6"
} catch {
    Write-Err $_.Exception.Message
    exit 2
}

# --- Validate inputs ---------------------------------------------------------
$ScenarioFile = "src/scenarios/$Scenario.js"
$EnvFile      = "config/environments/$Environment.json"
$ProfileFile  = "config/profiles/$Profile.json"
$DataPath     = "data/$DataFile"

$missing = @()
foreach ($f in @($ScenarioFile, $EnvFile, $ProfileFile)) {
    if (-not (Test-Path (Join-Path $RepoRoot $f))) { $missing += $f }
}
if ($missing.Count -gt 0) {
    foreach ($f in $missing) { Write-Err "Required file not found: $f" }
    exit 2
}

$script:HasDataFile = Test-Path (Join-Path $RepoRoot $DataPath)
if (-not $script:HasDataFile) {
    Write-Dbg "Data file not found ($DataPath) — skipping data snapshot and DATA_FILE env var"
}
Write-Dbg "Inputs validated: scenario=$Scenario env=$Environment profile=$Profile data=$DataFile (present=$($script:HasDataFile))"

# --- Build per-run output directory ------------------------------------------
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Tag = if ($RunName) { "$RunName-" } else { '' }
$RunId  = "${Tag}${Scenario}-${Environment}-${Profile}-${Timestamp}"
$RunDir = "results/$RunId"
$RunDirAbs = Join-Path $RepoRoot $RunDir
New-Item -ItemType Directory -Path $RunDirAbs -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $RunDirAbs 'screenshots') -Force | Out-Null

# Open the log file now that the run dir exists.
Open-LogFile (Join-Path $RunDirAbs 'euripid.log')
Write-Step "Run ID: $RunId"

$JsonOut    = "$RunDir/k6-stream.json"
$ConsoleLog = Join-Path $RunDirAbs 'k6-console.log'

# --- Snapshot resolved config into the run dir -------------------------------
Copy-Item (Join-Path $RepoRoot $EnvFile)     (Join-Path $RunDirAbs 'environment.json')
Copy-Item (Join-Path $RepoRoot $ProfileFile) (Join-Path $RunDirAbs 'profile.json')
if ($script:HasDataFile) {
    Copy-Item (Join-Path $RepoRoot $DataPath) (Join-Path $RunDirAbs 'data.csv')
}
Write-Log "Snapshotted config into run dir (data=$(if ($script:HasDataFile) {'yes'} else {'skipped'}))"

# --- Run k6 ------------------------------------------------------------------
$k6Args = @(
    'run',
    '-e', "ENV_FILE=$EnvFile",
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

Write-Step "Invoking k6"
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
    Write-Ok "k6 completed successfully"
} else {
    Write-Warn2 "k6 exited with code $exitCode (thresholds may have failed)"
}

# --- Package into zip --------------------------------------------------------
if (-not $NoZip) {
    $ZipPath = Join-Path $RepoRoot "results/$RunId.zip"
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
