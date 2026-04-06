import { pgTable, uuid, text, integer, real, boolean } from 'drizzle-orm/pg-core';
import { timestamps } from './common';
import { scenes } from './scenes';
import { characters } from './characters';
import { projects } from './projects';
import { assets } from './assets';

export const voiceTracks = pgTable('voice_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }).notNull(),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  dialogueLine: text('dialogue_line').notNull(),
  emotion: text('emotion'),
  assetId: uuid('asset_id').references(() => assets.id),
  duration: real('duration'),
  versionNumber: integer('version_number').notNull().default(1),
  isSelected: boolean('is_selected').default(false),
  ...timestamps,
});
