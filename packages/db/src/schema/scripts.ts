import { pgTable, uuid, text, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import type { ScriptStatus } from '@hollywood/types';
import { timestamps } from './common';
import { ideas } from './ideas';
import { projects } from './projects';

export const scripts = pgTable('scripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ideaId: uuid('idea_id').references(() => ideas.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  logline: text('logline'),
  fullText: text('full_text').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  versionNumber: integer('version_number').notNull().default(1),
  parentVersionId: uuid('parent_version_id'),
  isSelected: boolean('is_selected').default(false),
  status: text('status').$type<ScriptStatus>().notNull().default('draft'),
  ...timestamps,
});
