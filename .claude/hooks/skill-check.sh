#!/usr/bin/env bash
# skill-check.sh — Stop hook.
# 1. Check learned rules against diff (instant, free) → block if violations
# 2. If learned rules pass, fire AI check in background (async, logged)

set -euo pipefail

PORT=7483
CACHE_DIR="/tmp/cc-skill-check-cache"
LOCK="/tmp/cc-skill-check.lock"
LOG="/tmp/cc-skill-check.log"
RULES_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/learned-rules.json"
mkdir -p "$CACHE_DIR"

# Get current diff hash
DIFF_HASH=$(git diff --no-color 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
if [[ -z "$DIFF_HASH" || "$DIFF_HASH" == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" ]]; then
    DIFF_HASH=$(git diff --cached --no-color 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
fi

# No diff → allow
if [[ -z "$DIFF_HASH" || "$DIFF_HASH" == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" ]]; then
    echo "{}"
    exit 0
fi

# ── Phase 1: Learned rules (instant, free) ──
if [[ -f "$RULES_FILE" ]]; then
    RULE_COUNT=$(jq 'length' "$RULES_FILE" 2>/dev/null || echo 0)
    if [[ "$RULE_COUNT" -gt 0 ]]; then
        # Get changed lines from diff (only additions), excluding test fixtures
        DIFF_CONTENT=$(git diff --no-color -- ':!*test-violations/*' 2>/dev/null; git diff --cached --no-color -- ':!*test-violations/*' 2>/dev/null)
        ADDED_LINES=$(echo "$DIFF_CONTENT" | grep '^+' | grep -v '^+++' || true)
        CHANGED_FILES=$(echo "$DIFF_CONTENT" | grep '^diff --git' | sed 's/diff --git a\/\(.*\) b\/.*/\1/' || true)

        VIOLATIONS=""
        for i in $(seq 0 $(( RULE_COUNT - 1 ))); do
            PATTERN=$(jq -r ".[$i].pattern" "$RULES_FILE")
            FILE_MATCH=$(jq -r ".[$i].filePattern // \"\"" "$RULES_FILE")
            MESSAGE=$(jq -r ".[$i].message" "$RULES_FILE")

            [[ -z "$PATTERN" || "$PATTERN" == "null" ]] && continue

            # Filter added lines to only those from files matching filePattern
            RULE_LINES="$ADDED_LINES"
            if [[ -n "$FILE_MATCH" && "$FILE_MATCH" != "null" ]]; then
                # Extract added lines only from matching files
                RULE_LINES=""
                CURRENT_FILE=""
                while IFS= read -r line; do
                    if [[ "$line" == "diff --git a/"* ]]; then
                        CURRENT_FILE=$(echo "$line" | sed 's/diff --git a\/\(.*\) b\/.*/\1/')
                    elif [[ "$line" == "+"* && "$line" != "+++"* ]]; then
                        if echo "$CURRENT_FILE" | grep -qE "$FILE_MATCH" 2>/dev/null; then
                            RULE_LINES="${RULE_LINES}${line}"$'\n'
                        fi
                    fi
                done <<< "$DIFF_CONTENT"
                # Skip rule if no matching files changed
                [[ -z "$RULE_LINES" ]] && continue
            fi

            # Check if added lines match the violation pattern
            if echo "$RULE_LINES" | grep -qE "$PATTERN" 2>/dev/null; then
                VIOLATIONS="${VIOLATIONS}- ${MESSAGE}\n"
            fi
        done

        if [[ -n "$VIOLATIONS" ]]; then
            MSG=$(printf "**Learned Rule Violations (instant check):**\n%b\nFix these before proceeding." "$VIOLATIONS")
            echo "{\"decision\":\"block\",\"reason\":$(jq -n --arg m "$MSG" '$m')}"
            echo "[$(date '+%H:%M:%S')] ⚡ learned rules blocked (no AI needed)" >> "$LOG"
            exit 0
        fi
    fi
fi

# ── Phase 2: Cached AI result ──
if [[ -f "$CACHE_DIR/$DIFF_HASH" ]]; then
    cat "$CACHE_DIR/$DIFF_HASH"
    exit 0
fi

# Already running → allow
if [[ -f "$LOCK" ]]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || echo 0) ))
    if [[ "$LOCK_AGE" -lt 300 ]]; then
        echo "{}"
        exit 0
    fi
    rm -f "$LOCK"
fi

# Server not running → allow
if ! curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; then
    echo "{}"
    exit 0
fi

# ── Phase 3: AI check (async, background) ──
echo "{}"

(
    echo $$ > "$LOCK"
    trap 'rm -f "$LOCK"' EXIT

    echo "[$(date '+%H:%M:%S')] 🔍 AI skill-check started (diff: ${DIFF_HASH:0:8}...)" >> "$LOG"

    RESULT=$(curl -sf -X POST "http://localhost:${PORT}/check" \
        -H "Content-Type: application/json" \
        -d "{\"cwd\": \"${CLAUDE_PROJECT_DIR:-$(pwd)}\"}" \
        --max-time 300 2>/dev/null) || RESULT="{}"

    echo "$RESULT" > "$CACHE_DIR/$DIFF_HASH"
    find "$CACHE_DIR" -type f -mmin +60 -delete 2>/dev/null || true

    if echo "$RESULT" | grep -q '"decision":"block"'; then
        VIOLATIONS=$(echo "$RESULT" | jq -r '.reason // "unknown"' 2>/dev/null | head -20)
        echo "[$(date '+%H:%M:%S')] ❌ AI found violations:" >> "$LOG"
        echo "$VIOLATIONS" >> "$LOG"
        echo "[$(date '+%H:%M:%S')] ⚡ cached — will block on next stop if diff unchanged" >> "$LOG"
    else
        echo "[$(date '+%H:%M:%S')] ✅ AI all clear (diff: ${DIFF_HASH:0:8}...)" >> "$LOG"
    fi
) </dev/null >/dev/null 2>&1 & disown
