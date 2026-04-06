import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { AgentType, JobStatus } from '@hollywood/types';
import { timestamps } from './common';
import { projects } from './projects';

export const agentJobs = pgTable('agent_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  agentType: text('agent_type').$type<AgentType>().notNull(),
  bullmqJobId: text('bullmq_job_id'),
  status: text('status').$type<JobStatus>().notNull().default('queued'),
  progress: integer('progress').default(0),
  input: jsonb('input').$type<Record<string, unknown>>().notNull(),
  output: jsonb('output').$type<Record<string, unknown>>(),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  retryCount: integer('retry_count').default(0),
  targetEntityType: text('target_entity_type'),
  targetEntityId: uuid('target_entity_id'),
  ...timestamps,
});
