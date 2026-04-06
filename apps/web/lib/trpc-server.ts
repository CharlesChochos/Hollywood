import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@hollywood/trpc';
import { db } from '@hollywood/db';
import { auth } from '@/auth';

export function createTRPCHandler() {
  return async (req: Request) => {
    const session = await auth();

    return fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => ({
        db,
        session: session?.user ? { user: { id: session.user.id!, email: session.user.email, name: session.user.name } } : null,
      }),
    });
  };
}
