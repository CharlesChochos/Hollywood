import { z } from 'zod';
import { eq, sql, count } from 'drizzle-orm';
import { projects, agentJobs, scripts, scenes, assets } from '@hollywood/db';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import { router, publicProcedure } from '../trpc';

export const projectRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
    });
  }),

  listWithStats: publicProcedure.query(async ({ ctx }) => {
    const allProjects = await ctx.db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
    });

    // Get job stats per project in one query
    const jobStats = await ctx.db
      .select({
        projectId: agentJobs.projectId,
        status: agentJobs.status,
        cnt: count(),
      })
      .from(agentJobs)
      .groupBy(agentJobs.projectId, agentJobs.status);

    // Get scene counts per project
    const sceneCounts = await ctx.db
      .select({
        projectId: scenes.projectId,
        cnt: count(),
      })
      .from(scenes)
      .groupBy(scenes.projectId);

    // Build stats map
    const statsMap = new Map<string, { completed: number; active: number; failed: number; total: number; scenes: number }>();
    for (const row of jobStats) {
      const existing = statsMap.get(row.projectId) ?? { completed: 0, active: 0, failed: 0, total: 0, scenes: 0 };
      const c = Number(row.cnt);
      existing.total += c;
      if (row.status === 'completed') existing.completed += c;
      else if (row.status === 'active') existing.active += c;
      else if (row.status === 'failed') existing.failed += c;
      statsMap.set(row.projectId, existing);
    }
    for (const row of sceneCounts) {
      const existing = statsMap.get(row.projectId) ?? { completed: 0, active: 0, failed: 0, total: 0, scenes: 0 };
      existing.scenes = Number(row.cnt);
      statsMap.set(row.projectId, existing);
    }

    return allProjects.map((p) => ({
      ...p,
      stats: statsMap.get(p.id) ?? { completed: 0, active: 0, failed: 0, total: 0, scenes: 0 },
    }));
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
