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
LINT_ERRORS=""
if echo "$LINT_OUTPUT" | grep -q "✖.*problem"; then
    LINT_ERRORS=$(printf "**Lint errors — fix these:**\n\`\`\`\n%s\n\`\`\`" "$LINT_OUTPUT")
fi

# Check learned rules against the full file content
RULES_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/learned-rules.json"
RULE_ERRORS=""
if [[ -f "$RULES_FILE" ]]; then
    FILE_CONTENT=$(tr '\n' ' ' < "$FILE_PATH")
    RULE_COUNT=$(jq 'length' "$RULES_FILE" 2>/dev/null || echo 0)
    for i in $(seq 0 $(( RULE_COUNT - 1 ))); do
        PATTERN=$(jq -r ".[$i].pattern" "$RULES_FILE")
        FILE_MATCH=$(jq -r ".[$i].filePattern // \"\"" "$RULES_FILE")
        MESSAGE=$(jq -r ".[$i].message" "$RULES_FILE")
        [[ -z "$PATTERN" || "$PATTERN" == "null" ]] && continue
        if [[ -n "$FILE_MATCH" && "$FILE_MATCH" != "null" ]]; then
            if ! echo "$FILE_PATH" | grep -qE "$FILE_MATCH" 2>/dev/null; then
                continue
            fi
        fi
        if echo "$FILE_CONTENT" | grep -qE "$PATTERN" 2>/dev/null; then
            RULE_ERRORS="${RULE_ERRORS}- ${MESSAGE}\n"
        fi
    done
fi

if [[ -n "$LINT_ERRORS" || -n "$RULE_ERRORS" ]]; then
    OUTPUT=""
    [[ -n "$LINT_ERRORS" ]] && OUTPUT="$LINT_ERRORS"
    if [[ -n "$RULE_ERRORS" ]]; then
        [[ -n "$OUTPUT" ]] && OUTPUT="${OUTPUT}\n\n"
        OUTPUT="${OUTPUT}$(printf "**Learned rule violations in %s:**\n%b" "$FILE_PATH" "$RULE_ERRORS")"
    fi
    printf "%b" "$OUTPUT" >&2
    exit 2
fi
