import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { voiceTracks, scenes, projects } from '@hollywood/db';
import { enqueueAgentJob } from '@hollywood/queue';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import { router, protectedProcedure } from '../trpc';

export const voiceTrackRouter = router({
  getByScene: protectedProcedure
    .input(z.object({ sceneId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.voiceTracks.findMany({
        where: eq(voiceTracks.sceneId, input.sceneId),
        orderBy: (tracks, { asc }) => [asc(tracks.createdAt)],
      });
    }),

  /** Re-generate voice tracks for a scene. */
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
        agentType: 'voice_actor',
        payload: {
          sceneId: scene.id,
          dialogue: scene.dialogue,
        },
        vibeSettings,
        targetEntityType: 'scene',
        targetEntityId: scene.id,
      });

      return { jobId };
    }),
});
