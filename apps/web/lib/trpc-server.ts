import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@hollywood/trpc';
import { db } from '@hollywood/db';

export function createTRPCHandler() {
  return (req: Request) =>
    fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => ({ db }),
    });
}
