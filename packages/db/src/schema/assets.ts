import { pgTable, uuid, text, integer, real, bigint, jsonb } from 'drizzle-orm/pg-core';
import type { AssetType } from '@hollywood/types';
import { timestamps } from './common';
import { projects } from './projects';

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').$type<AssetType>().notNull(),
  mimeType: text('mime_type').notNull(),
  fileName: text('file_name').notNull(),
  s3Key: text('s3_key').notNull(),
  s3Bucket: text('s3_bucket').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  duration: real('duration'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  generatedBy: text('generated_by'),
  ...timestamps,
});
