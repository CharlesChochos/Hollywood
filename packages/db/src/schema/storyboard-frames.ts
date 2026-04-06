import { pgTable, uuid, text, integer, boolean } from 'drizzle-orm/pg-core';
import { timestamps } from './common';
import { scenes } from './scenes';
import { projects } from './projects';
import { assets } from './assets';

export const storyboardFrames = pgTable('storyboard_frames', {
  id: uuid('id').primaryKey().defaultRandom(),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  frameNumber: integer('frame_number').notNull(),
  prompt: text('prompt').notNull(),
  composition: text('composition'),
  assetId: uuid('asset_id').references(() => assets.id),
  versionNumber: integer('version_number').notNull().default(1),
  parentVersionId: uuid('parent_version_id'),
  isSelected: boolean('is_selected').default(false),
  ...timestamps,
});
