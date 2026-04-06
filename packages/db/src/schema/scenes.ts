import { pgTable, uuid, text, integer, real, jsonb } from 'drizzle-orm/pg-core';
import type { DialogueLine, CanvasPosition } from '@hollywood/types';
import { timestamps } from './common';
import { scripts } from './scripts';
import { projects } from './projects';

export const scenes = pgTable('scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  scriptId: uuid('script_id').references(() => scripts.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  sceneNumber: integer('scene_number').notNull(),
  heading: text('heading').notNull(),
  description: text('description').notNull(),
  dialogue: jsonb('dialogue').$type<DialogueLine[]>(),
  duration: real('duration'),
  emotionalBeat: text('emotional_beat'),
  canvasPosition: jsonb('canvas_position').$type<CanvasPosition>(),
  ...timestamps,
});
