import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { assets } from '@hollywood/db';
import { getUploadUrl, getDownloadUrl } from '@hollywood/storage';
import { router, protectedProcedure } from '../trpc';

export const assetRouter = router({
  getUploadUrl: protectedProcedure
    .input(z.object({
      key: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const url = await getUploadUrl(input.key, input.contentType);
      return { url };
    }),

  getDownloadUrl: protectedProcedure
    .input(z.object({ assetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db.query.assets.findFirst({
        where: eq(assets.id, input.assetId),
      });
      if (!asset) throw new Error('Asset not found');
      const url = await getDownloadUrl(asset.s3Key);
      return { url, asset };
    }),

  listByProject: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      type: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.assets.findMany({
        where: eq(assets.projectId, input.projectId),
        orderBy: (assets, { desc }) => [desc(assets.createdAt)],
      });
    }),
});
