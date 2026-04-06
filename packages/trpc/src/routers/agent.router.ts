import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { agentJobs, projects } from '@hollywood/db';
import { enqueueAgentJob } from '@hollywood/queue';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import type { AgentType } from '@hollywood/types';
import { router, publicProcedure } from '../trpc';

const AGENT_TYPES = [
  'script_writer', 'storyboard_creator', 'character_generator',
  'voice_actor', 'video_generator', 'editing', 'marketing',
] as const;

export const agentRouter = router({
  getByProject: publicProcedure
    .input(z.object({ projectId: z.string().uuid(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agentJobs.findMany({
        where: eq(agentJobs.projectId, input.projectId),
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
        limit: input.limit ?? 50,
      });
    }),

  getStatus: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agentJobs.findFirst({
        where: eq(agentJobs.id, input.jobId),
      });
    }),

  /** Manually enqueue any agent job. */
  enqueue: publicProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      agentType: z.enum(AGENT_TYPES),
      payload: z.record(z.unknown()),
      targetEntityType: z.string().optional(),
      targetEntityId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });
      const vibeSettings = project?.vibeSettings ?? DEFAULT_VIBE_SETTINGS;

      const jobId = await enqueueAgentJob({
        projectId: input.projectId,
        agentType: input.agentType as AgentType,
        payload: input.payload,
        vibeSettings,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
      });

      return { jobId };
    }),

  /** Retry a failed job by enqueuing a fresh copy with the same params. */
  retry: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.query.agentJobs.findFirst({
        where: eq(agentJobs.id, input.jobId),
      });
      if (!job) throw new Error('Job not found');
      if (job.status !== 'failed') throw new Error('Can only retry failed jobs');

      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, job.projectId),
      });
      const vibeSettings = project?.vibeSettings ?? DEFAULT_VIBE_SETTINGS;

      const newJobId = await enqueueAgentJob({
        projectId: job.projectId,
        agentType: job.agentType as AgentType,
        payload: (job.input as Record<string, unknown>) ?? {},
        vibeSettings,
        targetEntityType: job.targetEntityType ?? undefined,
        targetEntityId: job.targetEntityId ?? undefined,
      });

      return { jobId: newJobId };
    }),

  /** Cancel a queued job by marking it as failed. */
  cancel: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db.update(agentJobs)
        .set({ status: 'failed', error: 'Cancelled by user', updatedAt: new Date() })
        .where(eq(agentJobs.id, input.jobId))
        .returning();
      return updated;
    }),
});
