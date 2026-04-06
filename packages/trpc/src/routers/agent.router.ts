import { z } from 'zod';
import { eq, count, avg, sql } from 'drizzle-orm';
import { agentJobs, projects, ideas } from '@hollywood/db';
import { enqueueAgentJob } from '@hollywood/queue';
import { providerRegistry } from '@hollywood/ai-providers';
import { DEFAULT_VIBE_SETTINGS, getDefaultProviderConfig } from '@hollywood/types';
import type { AgentType } from '@hollywood/types';
import { router, protectedProcedure } from '../trpc';

const AGENT_TYPES = [
  'script_writer', 'storyboard_creator', 'character_generator',
  'voice_actor', 'video_generator', 'editing', 'marketing',
] as const;

export const agentRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agentJobs.findMany({
        where: eq(agentJobs.projectId, input.projectId),
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
        limit: input.limit ?? 50,
      });
    }),

  getStatus: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agentJobs.findFirst({
        where: eq(agentJobs.id, input.jobId),
      });
    }),

  /** Manually enqueue any agent job. */
  enqueue: protectedProcedure
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
  retry: protectedProcedure
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
  cancel: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db.update(agentJobs)
        .set({ status: 'failed', error: 'Cancelled by user', updatedAt: new Date() })
        .where(eq(agentJobs.id, input.jobId))
        .returning();
      return updated;
    }),

  /**
   * Parse a natural language command and execute the appropriate action.
   * Uses the text provider to interpret user intent.
   */
  naturalCommand: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      command: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });
      if (!project) throw new Error('Project not found');
      const vibeSettings = project.vibeSettings ?? DEFAULT_VIBE_SETTINGS;

      const providerConfig = getDefaultProviderConfig();
      const textProvider = providerRegistry.getText(providerConfig.text);

      const parsePrompt = [
        'You are a command parser for an AI film production pipeline.',
        'Parse the user\'s natural language command into a structured JSON action.',
        '',
        'Available actions:',
        '- {"action": "create_idea", "idea": "..."}  — Start a new film from an idea',
        '- {"action": "regenerate_script", "scriptId": "..."}  — Regenerate a script',
        '- {"action": "regenerate_storyboard", "sceneId": "..."}  — Regenerate storyboard for a scene',
        '- {"action": "regenerate_character", "characterId": "..."}  — Regenerate character art',
        '- {"action": "regenerate_voice", "sceneId": "..."}  — Regenerate voice tracks',
        '- {"action": "change_vibe", "setting": "...", "value": "..."}  — Change a vibe setting',
        '- {"action": "unknown", "message": "..."}  — If you can\'t parse the command',
        '',
        `User command: "${input.command}"`,
        '',
        'Respond with ONLY the JSON object, no markdown.',
      ].join('\n');

      const raw = await textProvider.generateText(parsePrompt, { temperature: 0.1, maxTokens: 200 });

      let parsed: { action: string; [key: string]: unknown };
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { action: 'unknown' as const, message: `Could not parse: ${raw.slice(0, 100)}`, jobId: null };
      }

      // Execute the parsed action
      if (parsed.action === 'create_idea' && typeof parsed.idea === 'string') {
        const [idea] = await ctx.db.insert(ideas).values({
          projectId: input.projectId,
          prompt: parsed.idea,
          status: 'pending',
        }).returning();

        const jobId = await enqueueAgentJob({
          projectId: input.projectId,
          agentType: 'script_writer',
          payload: { ideaId: idea!.id, ideaText: parsed.idea },
          vibeSettings,
          targetEntityType: 'idea',
          targetEntityId: idea!.id,
        });

        return { action: 'create_idea' as const, message: `Created idea and started script generation`, jobId };
      }

      if (parsed.action === 'regenerate_script' && typeof parsed.scriptId === 'string') {
        const jobId = await enqueueAgentJob({
          projectId: input.projectId,
          agentType: 'script_writer',
          payload: { scriptId: parsed.scriptId },
          vibeSettings,
          targetEntityType: 'script',
          targetEntityId: parsed.scriptId,
        });
        return { action: 'regenerate_script' as const, message: 'Script regeneration started', jobId };
      }

      if (parsed.action === 'regenerate_storyboard' && typeof parsed.sceneId === 'string') {
        const jobId = await enqueueAgentJob({
          projectId: input.projectId,
          agentType: 'storyboard_creator',
          payload: { sceneId: parsed.sceneId },
          vibeSettings,
          targetEntityType: 'scene',
          targetEntityId: parsed.sceneId,
        });
        return { action: 'regenerate_storyboard' as const, message: 'Storyboard regeneration started', jobId };
      }

      return {
        action: parsed.action as string,
        message: (parsed.message as string) ?? `Understood: ${parsed.action}`,
        jobId: null,
      };
    }),

  /** Pipeline analytics — aggregated stats per agent type. */
  analytics: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Per-agent stats: count by status, average duration
      const stats = await ctx.db
        .select({
          agentType: agentJobs.agentType,
          status: agentJobs.status,
          cnt: count(),
        })
        .from(agentJobs)
        .where(eq(agentJobs.projectId, input.projectId))
        .groupBy(agentJobs.agentType, agentJobs.status);

      // Get all completed jobs with timing for duration calculation
      const completedJobs = await ctx.db.query.agentJobs.findMany({
        where: eq(agentJobs.projectId, input.projectId),
        columns: {
          agentType: true,
          status: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
      });

      // Build per-agent summary
      const agentSummary: Record<string, {
        total: number;
        completed: number;
        failed: number;
        active: number;
        avgDurationMs: number | null;
      }> = {};

      for (const row of stats) {
        if (!agentSummary[row.agentType]) {
          agentSummary[row.agentType] = { total: 0, completed: 0, failed: 0, active: 0, avgDurationMs: null };
        }
        const s = agentSummary[row.agentType]!;
        const c = Number(row.cnt);
        s.total += c;
        if (row.status === 'completed') s.completed += c;
        else if (row.status === 'failed') s.failed += c;
        else if (row.status === 'active') s.active += c;
      }

      // Compute average duration for completed jobs
      for (const type of Object.keys(agentSummary)) {
        const jobs = completedJobs.filter(
          (j) => j.agentType === type && j.status === 'completed' && j.startedAt && j.completedAt,
        );
        if (jobs.length > 0) {
          const totalMs = jobs.reduce(
            (sum, j) => sum + (new Date(j.completedAt!).getTime() - new Date(j.startedAt!).getTime()),
            0,
          );
          agentSummary[type]!.avgDurationMs = Math.round(totalMs / jobs.length);
        }
      }

      // Timeline of recent job completions (for trend chart)
      const recentJobs = completedJobs
        .filter((j) => j.completedAt)
        .slice(-50)
        .map((j) => ({
          agentType: j.agentType,
          status: j.status,
          completedAt: j.completedAt!.toISOString(),
          durationMs: j.startedAt && j.completedAt
            ? new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime()
            : null,
        }));

      // Overall totals
      const totalJobs = Object.values(agentSummary).reduce((s, a) => s + a.total, 0);
      const totalCompleted = Object.values(agentSummary).reduce((s, a) => s + a.completed, 0);
      const totalFailed = Object.values(agentSummary).reduce((s, a) => s + a.failed, 0);
      const successRate = totalJobs > 0 ? Math.round((totalCompleted / totalJobs) * 100) : 0;

      return {
        agentSummary,
        recentJobs,
        totals: { totalJobs, totalCompleted, totalFailed, successRate },
      };
    }),
});
