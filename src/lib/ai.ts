import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodType<T>,
  systemPrompt?: string
): Promise<T> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:
      (systemPrompt ?? "You are a helpful CRM assistant.") +
      "\n\nIMPORTANT: Respond ONLY with valid JSON matching the requested schema. No markdown, no code fences, no explanation.",
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON from response - handle potential markdown code fences
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const raw: unknown = JSON.parse(jsonStr);

  // The harness: validate AI output against our Zod schema
  const parsed = schema.parse(raw);
  return parsed;
}
