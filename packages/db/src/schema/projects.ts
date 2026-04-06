import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import type { ProjectStatus } from '@hollywood/types';
import type { VibeSettings } from '@hollywood/types';
import type { CanvasState } from '@hollywood/types';
import { timestamps } from './common';
import { users } from './users';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').$type<ProjectStatus>().notNull().default('draft'),
  canvasState: jsonb('canvas_state').$type<CanvasState>(),
  vibeSettings: jsonb('vibe_settings').$type<VibeSettings>(),
  ownerId: uuid('owner_id').references(() => users.id),
  ...timestamps,
});
