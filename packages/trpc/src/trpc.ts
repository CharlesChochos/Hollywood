import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Database } from '@hollywood/db';

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export interface TRPCContext {
  db: Database;
  session: { user: SessionUser } | null;
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/** Middleware that enforces an authenticated session. */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
