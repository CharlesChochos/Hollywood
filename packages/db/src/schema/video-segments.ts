import { pgTable, uuid, text, integer, real, boolean, jsonb } from 'drizzle-orm/pg-core';
import { timestamps } from './common';
import { scenes } from './scenes';
import { projects } from './projects';
import { assets } from './assets';

export const videoSegments = pgTable('video_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  assetId: uuid('asset_id').references(() => assets.id),
  duration: real('duration'),
  resolution: text('resolution'),
  fps: integer('fps').default(24),
  versionNumber: integer('version_number').notNull().default(1),
  parentVersionId: uuid('parent_version_id'),
  isSelected: boolean('is_selected').default(false),
  renderSettings: jsonb('render_settings').$type<Record<string, unknown>>(),
  ...timestamps,
});
