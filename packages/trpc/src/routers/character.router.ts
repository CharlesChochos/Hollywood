import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { characters, projects } from '@hollywood/db';
import { enqueueAgentJob } from '@hollywood/queue';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import { router, protectedProcedure } from '../trpc';

export const characterRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.characters.findMany({
        where: eq(characters.projectId, input.projectId),
        orderBy: (characters, { asc }) => [asc(characters.name)],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.characters.findFirst({
        where: eq(characters.id, input.id),
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      personality: z.string().optional(),
      voiceProfile: z.record(z.unknown()).optional(),
      visualProfile: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(characters)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(characters.id, id))
        .returning();
      return updated;
    }),

  /** Re-generate the character's reference sheet via the character_generator agent. */
  regenerate: protectedProcedure
    .input(z.object({ characterId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const character = await ctx.db.query.characters.findFirst({
        where: eq(characters.id, input.characterId),
      });
      if (!character) throw new Error('Character not found');

      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, character.projectId),
      });
      const vibeSettings = project?.vibeSettings ?? DEFAULT_VIBE_SETTINGS;

      const jobId = await enqueueAgentJob({
        projectId: character.projectId,
        agentType: 'character_generator',
        payload: {
          characterId: character.id,
          name: character.name,
          description: character.description,
          personality: character.personality,
          visualProfile: character.visualProfile,
        },
        vibeSettings,
        targetEntityType: 'character',
        targetEntityId: character.id,
      });

      return { jobId };
    }),
});
