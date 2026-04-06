import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import type { IdeaStatus, CanvasPosition } from '@hollywood/types';
import { timestamps } from './common';
import { projects } from './projects';

export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  prompt: text('prompt').notNull(),
  expandedConcept: text('expanded_concept'),
  status: text('status').$type<IdeaStatus>().notNull().default('pending'),
  canvasPosition: jsonb('canvas_position').$type<CanvasPosition>(),
  ...timestamps,
});
