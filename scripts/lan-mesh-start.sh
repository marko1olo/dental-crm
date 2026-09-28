#!/usr/bin/env sh

# DENTE CRM — Clinic LAN Zero-Conf Network Mesh Launcher (POSIX Shell)
# Supports macOS and Linux clinic computers without Internet access.

set -e

ROLE="doctor"
PORT=4100
UDP_PORT=4101
CLINIC_ID="clinic-default"
NODE_ID=""
PROBE_FLAG=""
BACKGROUND=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --role=*)
      ROLE="${1#*=}"
      shift
      ;;
    --role)
      ROLE="$2"
      shift 2
      ;;
    --port=*)
      PORT="${1#*=}"
      shift
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --udp-port=*)
      UDP_PORT="${1#*=}"
      shift
      ;;
    --udp-port)
      UDP_PORT="$2"
      shift 2
      ;;
    --clinic-id=*)
      CLINIC_ID="${1#*=}"
      shift
      ;;
    --clinic-id)
      CLINIC_ID="$2"
      shift 2
      ;;
    --node-id=*)
      NODE_ID="${1#*=}"
      shift
      ;;
    --node-id)
      NODE_ID="$2"
      shift 2
      ;;
    --probe)
      PROBE_FLAG="--probe"
      shift
      ;;
    --background|-d)
      BACKGROUND=1
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--role=master|doctor|reception|admin] [--port=4100] [--udp-port=4101] [--clinic-id=id] [--probe] [--background]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_RUNNER="$REPO_ROOT/bin/clinic-lan-node.mjs"

if [ ! -f "$CLI_RUNNER" ]; then
  echo "Error: CLI runner not found at $CLI_RUNNER" >&2
  exit 1
fi

NODE_ARGS="--role=$ROLE --port=$PORT --udp-port=$UDP_PORT --clinic-id=$CLINIC_ID"
if [ -n "$NODE_ID" ]; then
  NODE_ARGS="$NODE_ARGS --node-id=$NODE_ID"
fi
if [ -n "$PROBE_FLAG" ]; then
  NODE_ARGS="$NODE_ARGS $PROBE_FLAG"
fi

if [ "$BACKGROUND" -eq 1 ]; then
  LOG_DIR="$REPO_ROOT/.data/logs"
  mkdir -p "$LOG_DIR"
  LOG_FILE="$LOG_DIR/lan-mesh-$ROLE-$PORT.log"
  echo "[DENTE LAN] Starting background mesh node (Role: $ROLE, Port: $PORT)..."
  nohup node "$CLI_RUNNER" $NODE_ARGS > "$LOG_FILE" 2>&1 &
  echo "[DENTE LAN] Running with PID $!"
else
  echo "[DENTE LAN] Starting interactive clinic mesh node..."
  exec node "$CLI_RUNNER" $NODE_ARGS
fi
