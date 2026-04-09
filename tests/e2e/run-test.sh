#!/usr/bin/env bash
#
# Run DSD Mini E2E login test on Android.
# Usage: ./run-test.sh [emulator_name]
#   emulator_name — AVD name (default: Pixel_9)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AVD_NAME="${1:-Pixel_9}"
SPEC_FILE="${2:-}"   # optional: pass a spec file, e.g. start-of-day.test.js
APPIUM_PORT=4723
RESULTS_DIR="$SCRIPT_DIR/results"

ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR="$ANDROID_HOME/emulator/emulator"

cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  if [ -n "$APPIUM_PID" ] && kill -0 "$APPIUM_PID" 2>/dev/null; then
    echo "Stopping Appium (PID $APPIUM_PID)..."
    kill "$APPIUM_PID" 2>/dev/null || true
  fi
  # Don't kill the emulator — user may want it running
}
trap cleanup EXIT

echo "=== DSD Mini E2E Test Runner ==="
echo "AVD:        $AVD_NAME"
echo "Results:    $RESULTS_DIR"
echo ""

# --- 1. Check prerequisites ---
echo "=== Checking prerequisites ==="

# Resolve appium command: global or npx
if command -v appium &>/dev/null; then
  APPIUM_CMD="appium"
elif npx appium --version &>/dev/null 2>&1; then
  APPIUM_CMD="npx appium"
else
  echo "ERROR: Appium not found. Install with: npm install -g appium"
  exit 1
fi
echo "Using: $APPIUM_CMD ($(${APPIUM_CMD} --version 2>/dev/null))"

if ! $APPIUM_CMD driver list --installed 2>&1 | perl -pe 's/\e\[[0-9;]*m//g' | grep -q uiautomator2; then
  echo "ERROR: UiAutomator2 driver not installed. Run: $APPIUM_CMD driver install uiautomator2"
  exit 1
fi

if [ ! -f "$ADB" ]; then
  echo "ERROR: adb not found at $ADB. Set ANDROID_HOME."
  exit 1
fi

echo "OK"
echo ""

# --- 2. Start emulator if not running ---
echo "=== Checking Android emulator ==="

BOOT_STATUS=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || echo "")
if [ "$BOOT_STATUS" = "1" ]; then
  echo "Emulator already running."
else
  echo "Starting emulator: $AVD_NAME ..."
  "$EMULATOR" -avd "$AVD_NAME" -no-snapshot-load &>/dev/null &
  EMULATOR_PID=$!

  echo -n "Waiting for boot"
  for i in $(seq 1 60); do
    BOOT_STATUS=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || echo "")
    if [ "$BOOT_STATUS" = "1" ]; then
      echo " done."
      break
    fi
    echo -n "."
    sleep 3
  done

  if [ "$BOOT_STATUS" != "1" ]; then
    echo ""
    echo "ERROR: Emulator failed to boot within 3 minutes."
    exit 1
  fi
fi
echo ""

# --- 3. Check app is installed ---
echo "=== Checking app installation ==="

if "$ADB" shell pm list packages 2>/dev/null | grep -q "com.anonymous.DSDMini"; then
  echo "App is installed."
else
  echo "App not installed. Building with expo..."
  cd "$PROJECT_ROOT"
  npx expo run:android
fi
echo ""

# --- 4. Install test dependencies ---
echo "=== Installing test dependencies ==="
cd "$SCRIPT_DIR"
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "node_modules exists, skipping."
fi
echo ""

# --- 5. Start Appium ---
echo "=== Starting Appium ==="

if curl -s "http://127.0.0.1:$APPIUM_PORT/status" | grep -q "ready"; then
  echo "Appium already running on port $APPIUM_PORT."
else
  mkdir -p "$RESULTS_DIR"
  $APPIUM_CMD --port "$APPIUM_PORT" --log "$RESULTS_DIR/appium.log" &>/dev/null &
  APPIUM_PID=$!

  echo -n "Waiting for Appium"
  for i in $(seq 1 20); do
    if curl -s "http://127.0.0.1:$APPIUM_PORT/status" | grep -q "ready"; then
      echo " ready."
      break
    fi
    echo -n "."
    sleep 2
  done

  if ! curl -s "http://127.0.0.1:$APPIUM_PORT/status" | grep -q "ready"; then
    echo ""
    echo "ERROR: Appium failed to start."
    exit 1
  fi
fi
echo ""

# --- 6. Run tests ---
echo "=== Running E2E tests ==="
mkdir -p "$RESULTS_DIR"

cd "$SCRIPT_DIR"
WDIO_ARGS="wdio.conf.js"
if [ -n "$SPEC_FILE" ]; then
  WDIO_ARGS="$WDIO_ARGS --spec $SPEC_FILE"
fi
npx wdio $WDIO_ARGS 2>&1 | tee "$RESULTS_DIR/test-output.log"
TEST_EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [ "$TEST_EXIT_CODE" -eq 0 ]; then
  echo "=== TESTS PASSED ==="
else
  echo "=== TESTS FAILED (exit code: $TEST_EXIT_CODE) ==="
fi

echo "Results saved to: $RESULTS_DIR/"
ls -1 "$RESULTS_DIR/"

exit "$TEST_EXIT_CODE"
