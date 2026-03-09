/**
 * Skill-check LLM provider config.
 * Edit this file to switch providers. No env vars needed (but supported as overrides).
 */

type Provider = {
  name: string;
  baseUrl: string;
  token: string;
  model: string;
  /** OpenRouter requires ANTHROPIC_API_KEY="" */
  emptyApiKey?: boolean;
};

const providers = {
  alibaba: {
    name: "alibaba",
    baseUrl: "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic",
    token: process.env.ANTHROPIC_AUTH_TOKEN ?? "",
    model: "qwen3.5-plus",
  },
  openrouter: {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api",
    token: process.env.OPENROUTER_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN ?? "",
    model: "qwen/qwen-plus",
    emptyApiKey: true,
  },
  lmstudio: {
    name: "lmstudio",
    baseUrl: process.env.LMSTUDIO_URL ?? "http://localhost:1234",
    token: process.env.LMSTUDIO_API_KEY ?? "lm-studio",
    model: process.env.LMSTUDIO_MODEL ?? "qwen/qwen3.5-9b",
    emptyApiKey: true,
  }
} satisfies Record<string, Provider>;

// ---- CHANGE THIS TO SWITCH PROVIDER ----
const ACTIVE: keyof typeof providers = "lmstudio";
// ----------------------------------------

// Env override: SKILL_CHECK_PROVIDER=lmstudio
const pick = (process.env.SKILL_CHECK_PROVIDER as keyof typeof providers) ?? ACTIVE;
const provider = providers[pick] ?? providers[ACTIVE];

// Env override for model: SKILL_CHECK_MODEL=qwen/qwen3-235b-a22b
if (process.env.SKILL_CHECK_MODEL) provider.model = process.env.SKILL_CHECK_MODEL;

export const config = {
  provider,
  env: {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !k.startsWith("CLAUDE"))
    ),
    ANTHROPIC_AUTH_TOKEN: provider.token,
    ANTHROPIC_API_KEY: "emptyApiKey" in provider && provider.emptyApiKey ? "" : provider.token,
    ANTHROPIC_BASE_URL: provider.baseUrl,
    ANTHROPIC_MODEL: provider.model,
  } as Record<string, string | undefined>,
};
