#!/usr/bin/env bash
# eval-trigger.sh — Run skill-check eval against test-violations.
# Usage: .claude/scripts/eval-trigger.sh

set -euo pipefail

DIR="src/app/test-violations"
SERVER="http://localhost:7483"
CWD="$(git rev-parse --show-toplevel)"

if ! curl -sf "$SERVER/health" >/dev/null 2>&1; then
  echo "✗ skill-check server not running on $SERVER"
  exit 1
fi

rm -f /tmp/cc-skill-check.lock

# Stash current state, create fake diff, restore after
# Save the current HEAD so we can get back
ORIG_HEAD=$(git rev-parse HEAD)

# Remove from index (not disk), commit silently, re-add → staged diff shows full content
git rm --cached -r "$DIR" >/dev/null 2>&1
git commit --no-verify -m "eval: temp remove" >/dev/null 2>&1
git add "$DIR"

COUNT=$(git diff --cached --stat -- "$DIR" | tail -1)
echo "staged: $COUNT"

cleanup() {
  # Undo: reset back to original HEAD (drops temp commit + staged add)
  git reset --soft "$ORIG_HEAD" >/dev/null 2>&1 || true
  git checkout -- "$DIR" >/dev/null 2>&1 || true
  echo "✓ git state restored"
}
trap cleanup EXIT

echo "triggering skill-check..."
curl -s -X POST "$SERVER/check" \
  -H 'Content-Type: application/json' \
  -d "{\"cwd\":\"$CWD\"}" &
CURL_PID=$!

tail -f /tmp/cc-skill-check-server.log 2>/dev/null &
TAIL_PID=$!

wait "$CURL_PID" 2>/dev/null || true
kill "$TAIL_PID" 2>/dev/null || true

echo ""
echo "done."
