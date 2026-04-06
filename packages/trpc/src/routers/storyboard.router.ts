import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { storyboardFrames, scenes, projects } from '@hollywood/db';
import { enqueueAgentJob } from '@hollywood/queue';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import { router, protectedProcedure } from '../trpc';

export const storyboardRouter = router({
  getByScene: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.storyboardFrames.findMany({
        where: eq(storyboardFrames.sceneId, input.sceneId),
        orderBy: (frames, { asc }) => [asc(frames.frameNumber)],
      });
    }),

  /** Re-generate storyboard frames for a scene. */
  regenerate: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const scene = await ctx.db.query.scenes.findFirst({
        where: eq(scenes.id, input.sceneId),
      });
      if (!scene) throw new Error('Scene not found');

      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, scene.projectId),
      });
      const vibeSettings = project?.vibeSettings ?? DEFAULT_VIBE_SETTINGS;

      const jobId = await enqueueAgentJob({
        projectId: scene.projectId,
        agentType: 'storyboard_creator',
        payload: {
          sceneId: scene.id,
          sceneDescription: scene.description,
          dialogue: scene.dialogue,
        },
        vibeSettings,
        targetEntityType: 'scene',
        targetEntityId: scene.id,
      });

      return { jobId };
    }),
});
