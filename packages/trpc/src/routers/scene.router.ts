import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { scenes } from '@hollywood/db';
import { router, publicProcedure } from '../trpc';

export const sceneRouter = router({
  getByScript: publicProcedure
    .input(z.object({ scriptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.scenes.findMany({
        where: eq(scenes.scriptId, input.scriptId),
        orderBy: (scenes, { asc }) => [asc(scenes.sceneNumber)],
        with: {
          storyboardFrames: true,
          voiceTracks: true,
          videoSegments: true,
        },
      });
    }),
});
