import { createTRPCHandler } from '@/lib/trpc-server';

const handler = createTRPCHandler();

export { handler as GET, handler as POST };
