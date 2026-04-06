import { z } from 'zod';
import { eq } from 'drizzle-orm';
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
});
