import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { scripts, projects } from '@hollywood/db';
import { enqueueAgentJob } from '@hollywood/queue';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import { router, protectedProcedure } from '../trpc';

export const scriptRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.scripts.findMany({
        where: eq(scripts.projectId, input.projectId),
        orderBy: (scripts, { desc }) => [desc(scripts.createdAt)],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.scripts.findFirst({
        where: eq(scripts.id, input.id),
        with: { scenes: true },
      });
    }),

  /** Mark a script version as the selected ("hearted") one for its idea. */
  select: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const script = await ctx.db.query.scripts.findFirst({
        where: eq(scripts.id, input.id),
      });
      if (!script) throw new Error('Script not found');

      // Deselect all sibling versions for the same idea
      await ctx.db.update(scripts)
        .set({ isSelected: false })
        .where(eq(scripts.ideaId, script.ideaId));

      // Select the target version
      const [updated] = await ctx.db.update(scripts)
        .set({ isSelected: true, updatedAt: new Date() })
        .where(eq(scripts.id, input.id))
        .returning();

      return updated;
    }),

  /** Re-enqueue the script_writer agent to produce a new version branching from this script. */
  regenerate: protectedProcedure
    .input(z.object({
      scriptId: z.string().uuid(),
      additionalPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const script = await ctx.db.query.scripts.findFirst({
        where: eq(scripts.id, input.scriptId),
      });
      if (!script) throw new Error('Script not found');

      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, script.projectId),
      });
      const vibeSettings = project?.vibeSettings ?? DEFAULT_VIBE_SETTINGS;

      const jobId = await enqueueAgentJob({
        projectId: script.projectId,
        agentType: 'script_writer',
        payload: {
          ideaId: script.ideaId,
          parentScriptId: script.id,
          additionalPrompt: input.additionalPrompt,
        },
        vibeSettings,
        targetEntityType: 'script',
        targetEntityId: script.id,
      });

      return { jobId };
    }),
});
