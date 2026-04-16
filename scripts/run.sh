#!/usr/bin/env bash
# scripts/run.sh — POSIX bash wrapper for Euripid
#
# Happy-path equivalent of scripts/run.ps1 for Linux/macOS agents and users
# who do not have PowerShell 7 (pwsh) available.
#
# Limitations compared to run.ps1:
#   - No automatic k6 download (you must have k6 on PATH or at bin/k6)
#   - No zip packaging of the run directory
#   - No ASCII banner
#   - No -RunName, -NoZip, -Quiet, -Verbose, -NoBanner, -DisableScenarioErrorLog,
#     or -IncludeUserContextInLogs flags
#
# Usage:
#   ./scripts/run.sh -Project <project> -Scenario <scenario> \
#                    -Environment <env> -Profile <profile> \
#                    [-DataFile <file>] [-LogLevel <level>] [-Validate]
#
# Examples:
#   ./scripts/run.sh -Project template-project -Scenario Sc01_self_test \
#                    -Environment self-test -Profile smoke
#
#   ./scripts/run.sh -Validate -Project template-project -Scenario Sc01_self_test \
#                    -Environment self-test -Profile smoke

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve repo root (directory containing this script's parent)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
PROJECT=""
SCENARIO=""
ENVIRONMENT=""
PROFILE=""
DATA_FILE=""
LOG_LEVEL=""
VALIDATE=false

# ---------------------------------------------------------------------------
# Argument parsing (PowerShell-style -Flag value)
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    -Project)       PROJECT="$2";     shift 2 ;;
    -Scenario)      SCENARIO="$2";   shift 2 ;;
    -Environment)   ENVIRONMENT="$2"; shift 2 ;;
    -Profile)       PROFILE="$2";    shift 2 ;;
    -DataFile)      DATA_FILE="$2";  shift 2 ;;
    -LogLevel)      LOG_LEVEL="$2";  shift 2 ;;
    -Validate)      VALIDATE=true;   shift   ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      echo "Usage: $0 -Project <p> -Scenario <s> -Environment <e> -Profile <prof> [-DataFile <f>] [-LogLevel <l>] [-Validate]" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Validate required arguments
# ---------------------------------------------------------------------------
MISSING=()
[[ -z "$PROJECT"     ]] && MISSING+=("-Project")
[[ -z "$SCENARIO"    ]] && MISSING+=("-Scenario")
[[ -z "$ENVIRONMENT" ]] && MISSING+=("-Environment")
[[ -z "$PROFILE"     ]] && MISSING+=("-Profile")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing required arguments: ${MISSING[*]}" >&2
  echo "Usage: $0 -Project <p> -Scenario <s> -Environment <e> -Profile <prof>" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
PROJECT_DIR="${REPO_ROOT}/projects/${PROJECT}"
SCENARIO_FILE="${PROJECT_DIR}/scenarios/${SCENARIO}.ts"
PROJECT_CONFIG_FILE="${PROJECT_DIR}/project.config.json"
PROFILE_FILE="${PROJECT_DIR}/profiles/${PROFILE}.json"

# Validate that required files exist
if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "ERROR: Project directory not found: ${PROJECT_DIR}" >&2
  echo "Available projects:" >&2
  ls "${REPO_ROOT}/projects/" >&2
  exit 1
fi

if [[ ! -f "$SCENARIO_FILE" ]]; then
  echo "ERROR: Scenario file not found: ${SCENARIO_FILE}" >&2
  echo "Available scenarios:" >&2
  ls "${PROJECT_DIR}/scenarios/"*.ts 2>/dev/null || echo "  (none)" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_CONFIG_FILE" ]]; then
  echo "ERROR: project.config.json not found: ${PROJECT_CONFIG_FILE}" >&2
  exit 1
fi

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "ERROR: Profile not found: ${PROFILE_FILE}" >&2
  echo "Available profiles:" >&2
  ls "${PROJECT_DIR}/profiles/"*.json 2>/dev/null | sed 's|.*/||; s|\.json$||' >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Resolve k6 binary
# ---------------------------------------------------------------------------
K6_BIN=""
if [[ -x "${REPO_ROOT}/bin/k6" ]]; then
  K6_BIN="${REPO_ROOT}/bin/k6"
elif command -v k6 &>/dev/null; then
  K6_BIN="k6"
else
  echo "ERROR: k6 binary not found. Install k6 on PATH or place a binary at bin/k6." >&2
  echo "See: https://grafana.com/docs/k6/latest/set-up/install-k6/" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Construct RUN_OUTPUT_DIR
# ---------------------------------------------------------------------------
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
# Derive a filesystem-safe project name token from the config (fall back to PROJECT)
if command -v jq &>/dev/null; then
  PROJECT_NAME="$(jq -r '.project.name // empty' "$PROJECT_CONFIG_FILE" 2>/dev/null | tr -dc '[:alnum:]' || true)"
fi
PROJECT_NAME="${PROJECT_NAME:-$PROJECT}"
RUN_ID="${TIMESTAMP}_${PROJECT_NAME}"
RUN_OUTPUT_DIR="${PROJECT_DIR}/results/${RUN_ID}"

# ---------------------------------------------------------------------------
# Resolve optional DATA_FILE env var
# ---------------------------------------------------------------------------
DATA_FILE_ENV=""
if [[ -n "$DATA_FILE" ]]; then
  DATA_FILE_PATH="${PROJECT_DIR}/data/${DATA_FILE}"
  if [[ ! -f "$DATA_FILE_PATH" ]]; then
    echo "ERROR: DataFile not found: ${DATA_FILE_PATH}" >&2
    exit 1
  fi
  DATA_FILE_ENV="$DATA_FILE"
fi

# ---------------------------------------------------------------------------
# Build the k6 command
# ---------------------------------------------------------------------------
K6_CMD=(
  "$K6_BIN" run
  -e "PROJECT=${PROJECT}"
  -e "ENVIRONMENT=${ENVIRONMENT}"
  -e "PROJECT_CONFIG_FILE=${PROJECT_CONFIG_FILE}"
  -e "PROFILE_FILE=${PROFILE_FILE}"
  -e "RUN_OUTPUT_DIR=${RUN_OUTPUT_DIR}"
)

[[ -n "$DATA_FILE_ENV"  ]] && K6_CMD+=(-e "DATA_FILE=${DATA_FILE_ENV}")
[[ -n "$LOG_LEVEL"      ]] && K6_CMD+=(-e "EURIPID_LOG_LEVEL=${LOG_LEVEL}")

K6_CMD+=("$SCENARIO_FILE")

# ---------------------------------------------------------------------------
# -Validate mode: print resolved config and exit without running k6
# ---------------------------------------------------------------------------
if [[ "$VALIDATE" == "true" ]]; then
  echo "{"
  echo "  \"project\": \"${PROJECT}\","
  echo "  \"scenario\": \"${SCENARIO}\","
  echo "  \"environment\": \"${ENVIRONMENT}\","
  echo "  \"profile\": \"${PROFILE}\","
  echo "  \"scenarioFile\": \"${SCENARIO_FILE}\","
  echo "  \"projectConfigFile\": \"${PROJECT_CONFIG_FILE}\","
  echo "  \"profileFile\": \"${PROFILE_FILE}\","
  echo "  \"runOutputDir\": \"${RUN_OUTPUT_DIR}\","
  [[ -n "$DATA_FILE_ENV" ]] && echo "  \"dataFile\": \"${DATA_FILE_ENV}\","
  echo "  \"k6Binary\": \"${K6_BIN}\","
  echo "  \"k6Command\": \"${K6_CMD[*]}\""
  echo "}"
  exit 0
fi

# ---------------------------------------------------------------------------
# Create run output directory and execute
# ---------------------------------------------------------------------------
mkdir -p "$RUN_OUTPUT_DIR"
echo "[run.sh] Run ID: ${RUN_ID}"
echo "[run.sh] Output: ${RUN_OUTPUT_DIR}"
echo "[run.sh] Command: ${K6_CMD[*]}"
echo ""

exec "${K6_CMD[@]}"
