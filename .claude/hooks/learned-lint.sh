#!/usr/bin/env bash
# learned-lint.sh — PreToolUse hook for Edit/Write.
# Checks new_string/content against learned rules. Instant, no AI.

set -euo pipefail

RULES_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/learned-rules.json"

# No rules file or empty → allow
if [[ ! -f "$RULES_FILE" ]]; then
    echo "{}"
    exit 0
fi

RULE_COUNT=$(jq 'length' "$RULES_FILE")
if [[ "$RULE_COUNT" -eq 0 ]]; then
    echo "{}"
    exit 0
fi

# Read hook input from stdin
INPUT=$(cat)

# Extract file path and new content from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // ""')

if [[ -z "$NEW_CONTENT" || -z "$FILE_PATH" ]]; then
    echo "{}"
    exit 0
fi

# Check each rule
VIOLATIONS=""

for i in $(seq 0 $(( RULE_COUNT - 1 ))); do
    PATTERN=$(jq -r ".[$i].pattern" "$RULES_FILE")
    FILE_MATCH=$(jq -r ".[$i].filePattern // \"\"" "$RULES_FILE")
    MESSAGE=$(jq -r ".[$i].message" "$RULES_FILE")

    # Skip if pattern is null/empty
    if [[ -z "$PATTERN" || "$PATTERN" == "null" ]]; then
        continue
    fi

    # Skip if file doesn't match filePattern
    if [[ -n "$FILE_MATCH" && "$FILE_MATCH" != "null" ]]; then
        if ! echo "$FILE_PATH" | grep -qE "$FILE_MATCH" 2>/dev/null; then
            continue
        fi
    fi

    # Check if new content matches the violation pattern
    if echo "$NEW_CONTENT" | grep -qE "$PATTERN" 2>/dev/null; then
        VIOLATIONS="${VIOLATIONS}- ${MESSAGE}\n"
    fi
done

if [[ -n "$VIOLATIONS" ]]; then
    MSG=$(printf "**Learned Lint Violations:**\n%b\nFix these before proceeding." "$VIOLATIONS")
    echo "{\"decision\":\"block\",\"reason\":$(jq -n --arg m "$MSG" '$m')}"
    exit 0
fi

echo "{}"
