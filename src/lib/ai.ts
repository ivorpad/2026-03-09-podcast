import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodType<T>,
  systemPrompt?: string
): Promise<T> {
  const completion = await client.chat.completions.create({
    model: "qwen/qwen-plus",
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content:
          (systemPrompt ?? "You are a helpful CRM assistant.") +
          "\n\nIMPORTANT: Respond ONLY with valid JSON matching the requested schema. No markdown, no code fences, no explanation.",
      },
      { role: "user", content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";

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
