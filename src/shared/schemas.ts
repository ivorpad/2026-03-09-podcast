import { z } from "zod";

// ── Deal stages ──
export const dealStages = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
] as const;
export type DealStage = (typeof dealStages)[number];

// ── Company schemas ──
export const companyCreateSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  website: z.string().optional(),
  size: z.string().optional(),
  notes: z.string().optional(),
});
export const companyUpdateSchema = companyCreateSchema.partial().extend({
  id: z.number(),
});
export type CompanyCreate = z.infer<typeof companyCreateSchema>;
export type CompanyUpdate = z.infer<typeof companyUpdateSchema>;

// ── Contact schemas ──
export const contactCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.number().optional(),
  notes: z.string().optional(),
});
export const contactUpdateSchema = contactCreateSchema.partial().extend({
  id: z.number(),
});
export type ContactCreate = z.infer<typeof contactCreateSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;

// ── Deal schemas ──
export const dealCreateSchema = z.object({
  title: z.string().min(1, "Deal title is required"),
  value: z.number().min(0).optional(),
  stage: z.enum(dealStages).default("lead"),
  contactId: z.number().optional(),
  companyId: z.number().optional(),
  notes: z.string().optional(),
});
export const dealUpdateSchema = dealCreateSchema.partial().extend({
  id: z.number(),
});
export type DealCreate = z.infer<typeof dealCreateSchema>;
export type DealUpdate = z.infer<typeof dealUpdateSchema>;

// ── AI output schemas (the harness!) ──
export const contactSummarySchema = z.object({
  summary: z.string(),
  keyInsights: z.array(z.string()),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});
export type ContactSummary = z.infer<typeof contactSummarySchema>;

export const dealNextActionSchema = z.object({
  action: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  reasoning: z.string(),
});
export type DealNextAction = z.infer<typeof dealNextActionSchema>;

export const contactEnrichmentSchema = z.object({
  suggestedTitle: z.string(),
  suggestedIndustry: z.string(),
  suggestedNotes: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});
export type ContactEnrichment = z.infer<typeof contactEnrichmentSchema>;
