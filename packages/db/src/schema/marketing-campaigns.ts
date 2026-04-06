import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import type { CampaignStatus } from '@hollywood/types';
import { timestamps } from './common';
import { projects } from './projects';
import { finalCuts } from './final-cuts';
import { assets } from './assets';

export const marketingCampaigns = pgTable('marketing_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  finalCutId: uuid('final_cut_id').references(() => finalCuts.id),
  trailerAssetId: uuid('trailer_asset_id').references(() => assets.id),
  thumbnailAssetId: uuid('thumbnail_asset_id').references(() => assets.id),
  socialMediaAssets: jsonb('social_media_assets').$type<Array<{ platform: string; assetId: string; caption: string }>>(),
  analytics: jsonb('analytics').$type<Record<string, unknown>>(),
  status: text('status').$type<CampaignStatus>().notNull().default('draft'),
  ...timestamps,
});
