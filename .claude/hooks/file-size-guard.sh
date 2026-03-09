#!/usr/bin/env bash
# file-size-guard.sh — PreToolUse hook that blocks edits to files over 500 LOC
# Encourages decomposition: if a file is getting too big, split it first.
#
# Reads hook input JSON from stdin, checks file_path line count.

set -euo pipefail

MAX_LINES=500

# Read hook input from stdin
INPUT=$(cat)

# Extract tool name and file path
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")

# Only check file-editing tools
case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) echo '{}'; exit 0 ;;
esac

# Extract file path
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

# No file path? Allow.
if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  echo '{}'
  exit 0
fi

# Only check source files (tsx/ts/jsx/js)
case "$FILE_PATH" in
  *.tsx|*.ts|*.jsx|*.js) ;;
  *) echo '{}'; exit 0 ;;
esac

# Count lines
LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')

if [ "$LINE_COUNT" -gt "$MAX_LINES" ]; then
  python3 -c "
import json
msg = f'**File Size Guard**: \`$FILE_PATH\` is {$LINE_COUNT} lines (limit: $MAX_LINES). Split this file into smaller modules before adding more code.'
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny'
    },
    'systemMessage': msg
}))
"
  exit 0
fi

echo '{}'
exit 0
