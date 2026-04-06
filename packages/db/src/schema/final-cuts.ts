import { pgTable, uuid, text, integer, real, jsonb } from 'drizzle-orm/pg-core';
import type { CutStatus } from '@hollywood/types';
import { timestamps } from './common';
import { projects } from './projects';
import { assets } from './assets';

export const finalCuts = pgTable('final_cuts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  editDecisionList: jsonb('edit_decision_list').$type<Record<string, unknown>[]>(),
  assetId: uuid('asset_id').references(() => assets.id),
  duration: real('duration'),
  status: text('status').$type<CutStatus>().notNull().default('assembling'),
  versionNumber: integer('version_number').notNull().default(1),
  ...timestamps,
});
