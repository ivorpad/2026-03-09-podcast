import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "@/db";
import { contacts, deals } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateStructuredOutput } from "@/lib/ai";
import {
  contactSummarySchema,
  dealNextActionSchema,
  contactEnrichmentSchema,
} from "@/shared/schemas";

export const aiRouter = router({
  generateContactSummary: publicProcedure
    .input(z.number())
    .mutation(async ({ input: contactId }) => {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId));
      if (!contact) throw new Error("Contact not found");

      const contactDeals = await db
        .select()
        .from(deals)
        .where(eq(deals.contactId, contactId));

      const prompt = `Analyze this CRM contact and their deals, then provide a structured summary.

Contact: ${contact.firstName} ${contact.lastName}
Email: ${contact.email || "N/A"}
Phone: ${contact.phone || "N/A"}
Notes: ${contact.notes || "No notes"}

Related Deals:
${
  contactDeals.length > 0
    ? contactDeals
        .map(
          (d) =>
            `- ${d.title} (Stage: ${d.stage}, Value: $${d.value ?? 0}) Notes: ${d.notes || "none"}`
        )
        .join("\n")
    : "No deals"
}

Return JSON with: { "summary": "brief paragraph", "keyInsights": ["insight1", "insight2"], "sentiment": "positive" | "neutral" | "negative" }`;

      const result = await generateStructuredOutput(
        prompt,
        contactSummarySchema
      );

      // Store the summary
      db.update(contacts)
        .set({
          aiSummary: JSON.stringify(result),
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(contacts.id, contactId))
        .run();

      return result;
    }),

  suggestDealNextAction: publicProcedure
    .input(z.number())
    .mutation(async ({ input: dealId }) => {
      const [deal] = await db
        .select()
        .from(deals)
        .where(eq(deals.id, dealId));
      if (!deal) throw new Error("Deal not found");

      const prompt = `Based on this CRM deal, suggest the next best action.

Deal: ${deal.title}
Value: $${deal.value ?? 0}
Current Stage: ${deal.stage}
Notes: ${deal.notes || "No notes"}

Consider the current stage and provide a specific, actionable recommendation.

Return JSON with: { "action": "specific next step", "priority": "low" | "medium" | "high" | "urgent", "reasoning": "why this action" }`;

      const result = await generateStructuredOutput(
        prompt,
        dealNextActionSchema,
        "You are a sales strategy advisor for a CRM system."
      );

      // Store the suggestion
      db.update(deals)
        .set({
          aiNextAction: JSON.stringify(result),
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(deals.id, dealId))
        .run();

      return result;
    }),

  enrichContact: publicProcedure
    .input(z.number())
    .mutation(async ({ input: contactId }) => {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId));
      if (!contact) throw new Error("Contact not found");

      const prompt = `Based on the following contact information, suggest enrichment data.

Name: ${contact.firstName} ${contact.lastName}
Email: ${contact.email || "N/A"}
Current Notes: ${contact.notes || "None"}

Suggest plausible professional details based on available information.

Return JSON with: { "suggestedTitle": "likely job title", "suggestedIndustry": "likely industry", "suggestedNotes": "additional context", "confidence": "low" | "medium" | "high" }`;

      // Note: We return suggestions but do NOT auto-save — human-in-the-loop guardrail
      const result = await generateStructuredOutput(
        prompt,
        contactEnrichmentSchema,
        "You are a contact data enrichment assistant. Be conservative in your suggestions and honest about confidence levels."
      );

      return result;
    }),
});
