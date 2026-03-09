#!/usr/bin/env bash
# skill-check.sh — Stop hook that curls the skill-check server.
# Caches results by diff hash. Lock prevents concurrent checks.

set -euo pipefail

PORT=7483
CACHE_DIR="/tmp/cc-skill-check-cache"
LOCK="/tmp/cc-skill-check.lock"
mkdir -p "$CACHE_DIR"

# Get current diff hash
DIFF_HASH=$(git diff --no-color 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
if [[ -z "$DIFF_HASH" || "$DIFF_HASH" == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" ]]; then
    DIFF_HASH=$(git diff --cached --no-color 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
fi

# No diff at all → allow
if [[ -z "$DIFF_HASH" || "$DIFF_HASH" == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" ]]; then
    echo "{}"
    exit 0
fi

# Return cached result if diff hasn't changed
if [[ -f "$CACHE_DIR/$DIFF_HASH" ]]; then
    cat "$CACHE_DIR/$DIFF_HASH"
    exit 0
fi

# If another check is already running, allow (don't queue up)
# But treat locks older than 3 minutes as stale
if [[ -f "$LOCK" ]]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || echo 0) ))
    if [[ "$LOCK_AGE" -lt 180 ]]; then
        echo "{}"
        exit 0
    fi
    rm -f "$LOCK"
fi

# Quick health check — if server isn't running, allow
if ! curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; then
    echo "{}"
    exit 0
fi

# Lock, check, cache, unlock
trap 'rm -f "$LOCK"' EXIT
echo $$ > "$LOCK"

RESULT=$(curl -sf -X POST "http://localhost:${PORT}/check" \
    -H "Content-Type: application/json" \
    -d "{\"cwd\": \"${CLAUDE_PROJECT_DIR:-$(pwd)}\"}" \
    --max-time 120 2>/dev/null) || RESULT="{}"

echo "$RESULT" > "$CACHE_DIR/$DIFF_HASH"
find "$CACHE_DIR" -type f -mmin +60 -delete 2>/dev/null || true

echo "$RESULT"
