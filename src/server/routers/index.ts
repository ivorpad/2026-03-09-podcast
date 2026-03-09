import { router } from "../trpc";
import { contactsRouter } from "./contacts";
import { companiesRouter } from "./companies";
import { dealsRouter } from "./deals";
import { aiRouter } from "./ai";

export const appRouter = router({
  contacts: contactsRouter,
  companies: companiesRouter,
  deals: dealsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
