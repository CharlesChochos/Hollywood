import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import { timestamps } from './common';
import { projects } from './projects';
import { assets } from './assets';

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  personality: text('personality'),
  voiceProfile: jsonb('voice_profile').$type<Record<string, unknown>>(),
  visualProfile: jsonb('visual_profile').$type<Record<string, unknown>>(),
  referenceAssetId: uuid('reference_asset_id').references(() => assets.id),
  ...timestamps,
});
