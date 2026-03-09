import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { companyCreateSchema, companyUpdateSchema } from "@/shared/schemas";

export const companiesRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { limit = 50, offset = 0 } = input ?? {};
      const rows = await db
        .select()
        .from(companies)
        .orderBy(desc(companies.createdAt))
        .limit(limit)
        .offset(offset);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(companies);
      return { items: rows, total: count };
    }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, input));
    return company ?? null;
  }),

  create: publicProcedure
    .input(companyCreateSchema)
    .mutation(async ({ input }) => {
      const result = db.insert(companies).values(input).returning().get();
      return result;
    }),

  update: publicProcedure
    .input(companyUpdateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = db
        .update(companies)
        .set({ ...data, updatedAt: sql`datetime('now')` })
        .where(eq(companies.id, id))
        .returning()
        .get();
      return result;
    }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    db.delete(companies).where(eq(companies.id, input)).run();
    return { success: true };
  }),
});
