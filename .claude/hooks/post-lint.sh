#!/usr/bin/env bash
# post-lint.sh — PostToolUse hook for Edit/Write.
# Runs eslint on the changed file and reports errors for the AI to fix.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only lint ts/tsx/js/jsx files
if [[ -z "$FILE_PATH" ]] || ! [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    exit 0
fi

# Only lint if file exists
if [[ ! -f "$FILE_PATH" ]]; then
    exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Run eslint, capture output
LINT_OUTPUT=$(npx eslint --no-warn-ignored "$FILE_PATH" 2>&1) || true

# Check if there were errors (eslint prints "✖ N problem" summary)
if echo "$LINT_OUTPUT" | grep -q "✖.*problem"; then
    MSG=$(printf "**Lint errors — fix these:**\n\`\`\`\n%s\n\`\`\`" "$LINT_OUTPUT")
    echo "$MSG"
    exit 0
fi
