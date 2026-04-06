import { Queue } from 'bullmq';
import type { AgentType } from '@hollywood/types';
import { getRedisConnection } from './connection';

const QUEUE_PREFIX = 'hollywood';

const queueCache = new Map<string, Queue>();

export function getQueue(agentType: AgentType): Queue {
  const name = `${QUEUE_PREFIX}:${agentType}`;
  let queue = queueCache.get(name);
  if (!queue) {
    queue = new Queue(name, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
    queueCache.set(name, queue);
  }
  return queue;
}

export const AGENT_QUEUES: AgentType[] = [
  'script_writer',
  'storyboard_creator',
  'character_generator',
  'voice_actor',
  'video_generator',
  'editing',
  'marketing',
];
