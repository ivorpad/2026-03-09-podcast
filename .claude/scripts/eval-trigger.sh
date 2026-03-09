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

# Back up learned-rules (skill-check will update it during eval)
cp .claude/hooks/learned-rules.json /tmp/learned-rules-backup.json 2>/dev/null || true

# Save current branch state
ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD)
ORIG_HEAD=$(git rev-parse HEAD)

# Create a throwaway branch for the eval
git checkout -b eval-temp --no-track >/dev/null 2>&1

# Remove test-violations from index, commit, re-add as new
git rm --cached -r "$DIR" >/dev/null 2>&1
git commit --no-verify -m "eval: temp" >/dev/null 2>&1
git add "$DIR"

COUNT=$(git diff --cached --stat -- "$DIR" | tail -1)
echo "staged: $COUNT"

cleanup() {
  # Restore learned-rules
  cp /tmp/learned-rules-backup.json .claude/hooks/learned-rules.json 2>/dev/null || true
  # Switch back to original branch, delete throwaway
  git checkout "$ORIG_BRANCH" >/dev/null 2>&1 || true
  git branch -D eval-temp >/dev/null 2>&1 || true
  echo "✓ restored to $ORIG_BRANCH (learned-rules preserved)"
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
