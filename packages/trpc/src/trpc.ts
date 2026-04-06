import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Database } from '@hollywood/db';

export interface TRPCContext {
  db: Database;
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
