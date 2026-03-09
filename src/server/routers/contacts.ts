import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "@/db";
import { contacts, companies, deals } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { contactCreateSchema, contactUpdateSchema } from "@/shared/schemas";

export const contactsRouter = router({
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
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phone: contacts.phone,
          companyId: contacts.companyId,
          companyName: companies.name,
          notes: contacts.notes,
          aiSummary: contacts.aiSummary,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
        })
        .from(contacts)
        .leftJoin(companies, eq(contacts.companyId, companies.id))
        .orderBy(desc(contacts.createdAt))
        .limit(limit)
        .offset(offset);
      const [{ count }] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(contacts);
      return { items: rows, total: count };
    }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const [contact] = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        companyId: contacts.companyId,
        companyName: companies.name,
        notes: contacts.notes,
        aiSummary: contacts.aiSummary,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(eq(contacts.id, input));

    if (!contact) return null;

    const contactDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.contactId, input));

    return { ...contact, deals: contactDeals };
  }),

  create: publicProcedure
    .input(contactCreateSchema)
    .mutation(async ({ input }) => {
      const data = {
        ...input,
        email: input.email || null,
      };
      const result = db.insert(contacts).values(data).returning().get();
      return result;
    }),

  update: publicProcedure
    .input(contactUpdateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = db
        .update(contacts)
        .set({
          ...data,
          ...("email" in data ? { email: data.email || null } : {}),
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(contacts.id, id))
        .returning()
        .get();
      return result;
    }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    db.delete(contacts).where(eq(contacts.id, input)).run();
    return { success: true };
  }),
});
