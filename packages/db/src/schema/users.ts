import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import { timestamps } from './common';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  settings: jsonb('settings').$type<Record<string, unknown>>(),
  ...timestamps,
});
