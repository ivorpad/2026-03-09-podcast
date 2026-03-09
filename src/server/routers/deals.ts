import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "@/db";
import { deals, contacts, companies } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { dealCreateSchema, dealUpdateSchema } from "@/shared/schemas";

export const dealsRouter = router({
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
        .select({
          id: deals.id,
          title: deals.title,
          value: deals.value,
          stage: deals.stage,
          contactId: deals.contactId,
          contactName: sql<string>`${contacts.firstName} || ' ' || ${contacts.lastName}`,
          companyId: deals.companyId,
          companyName: companies.name,
          notes: deals.notes,
          aiNextAction: deals.aiNextAction,
          createdAt: deals.createdAt,
          updatedAt: deals.updatedAt,
        })
        .from(deals)
        .leftJoin(contacts, eq(deals.contactId, contacts.id))
        .leftJoin(companies, eq(deals.companyId, companies.id))
        .orderBy(desc(deals.createdAt))
        .limit(limit)
        .offset(offset);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(deals);
      return { items: rows, total: count };
    }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const [deal] = await db
      .select({
        id: deals.id,
        title: deals.title,
        value: deals.value,
        stage: deals.stage,
        contactId: deals.contactId,
        contactName: sql<string>`${contacts.firstName} || ' ' || ${contacts.lastName}`,
        companyId: deals.companyId,
        companyName: companies.name,
        notes: deals.notes,
        aiNextAction: deals.aiNextAction,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.id, input));
    return deal ?? null;
  }),

  create: publicProcedure
    .input(dealCreateSchema)
    .mutation(async ({ input }) => {
      const result = db.insert(deals).values(input).returning().get();
      return result;
    }),

  update: publicProcedure
    .input(dealUpdateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = db
        .update(deals)
        .set({ ...data, updatedAt: sql`datetime('now')` })
        .where(eq(deals.id, id))
        .returning()
        .get();
      return result;
    }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    db.delete(deals).where(eq(deals.id, input)).run();
    return { success: true };
  }),
});
