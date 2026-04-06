import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ideas, projects } from '@hollywood/db';
import { enqueueAgentJob } from '@hollywood/queue';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import { router, publicProcedure } from '../trpc';

export const ideaRouter = router({
  getByProject: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.ideas.findMany({
        where: eq(ideas.projectId, input.projectId),
        orderBy: (ideas, { desc }) => [desc(ideas.createdAt)],
      });
    }),

  create: publicProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      prompt: z.string().min(1),
      canvasPosition: z.object({ x: z.number(), y: z.number() }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [idea] = await ctx.db.insert(ideas).values({
        projectId: input.projectId,
        prompt: input.prompt,
        status: 'pending',
        canvasPosition: input.canvasPosition,
      }).returning();

      // Fetch project vibe settings for the pipeline
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });
      const vibeSettings = project?.vibeSettings ?? DEFAULT_VIBE_SETTINGS;

      // Enqueue the script_writer agent to process this idea
      await enqueueAgentJob({
        projectId: input.projectId,
        agentType: 'script_writer',
        payload: { ideaId: idea!.id, prompt: input.prompt },
        vibeSettings,
        targetEntityType: 'idea',
        targetEntityId: idea!.id,
      });

      return idea;
    }),
});
