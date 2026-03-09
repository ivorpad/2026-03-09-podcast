import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf?\b/,
  /\bgit\s+(push|reset|checkout\s+--|clean|branch\s+-[dD])/,
  /\bdrop\s+(table|database)\b/i,
  /\btruncate\b/i,
  /\b(kill|pkill|killall)\b/,
  /\bcurl\b.*\b(POST|PUT|DELETE|PATCH)\b/i,
  /\bnpx?\s/,
  /\bpnpm\s+(add|remove|install)\b/,
  /\bchmod\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
];

function isDangerous(command: string): string | null {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) return `Blocked: matches ${pattern}`;
  }
  return null;
}

function isPreToolUseInput(input: unknown): input is PreToolUseHookInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "tool_name" in input &&
    "tool_input" in input
  );
}

function hasBashCommand(toolInput: unknown): toolInput is { command: string } {
  return (
    typeof toolInput === "object" &&
    toolInput !== null &&
    "command" in toolInput &&
    typeof (toolInput as { command: unknown }).command === "string"
  );
}

export const preToolUseHook = {
  hooks: [async (input: unknown) => {
    if (!isPreToolUseInput(input)) return {};
    const { tool_name, tool_input } = input;
    if (tool_name === "Bash" && hasBashCommand(tool_input)) {
      const cmd = tool_input.command;
      const reason = isDangerous(cmd);
      if (reason) {
        console.log(`[skill-check] DENIED: ${cmd.slice(0, 80)} — ${reason}`);
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse" as const,
            permissionDecision: "deny" as const,
            permissionDecisionReason: reason,
          },
        };
      }
    }
    return {};
  }],
};
