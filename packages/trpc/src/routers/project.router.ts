import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { projects } from '@hollywood/db';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import { router, publicProcedure } from '../trpc';

export const projectRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.id),
        with: {
          ideas: true,
          characters: true,
          finalCuts: true,
        },
      });
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db.insert(projects).values({
        name: input.name,
        description: input.description,
        status: 'draft',
        vibeSettings: DEFAULT_VIBE_SETTINGS,
        canvasState: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      }).returning();
      return project;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      status: z.enum(['draft', 'in_progress', 'review', 'published', 'archived']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return updated;
    }),

  updateCanvas: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      canvasState: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(projects)
        .set({ canvasState: input.canvasState, updatedAt: new Date() })
        .where(eq(projects.id, input.id));
    }),

  updateVibes: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      vibeSettings: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(projects)
        .set({ vibeSettings: input.vibeSettings, updatedAt: new Date() })
        .where(eq(projects.id, input.id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(projects).where(eq(projects.id, input.id));
    }),
});
