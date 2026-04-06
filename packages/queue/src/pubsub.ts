import IORedis from 'ioredis';

const CHANNEL = 'hollywood:agent-events';

let publisher: IORedis | null = null;

function getPublisher(): IORedis {
  if (!publisher) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    publisher = new IORedis(url);
  }
  return publisher;
}

export type AgentEvent =
  | { type: 'progress'; jobId: string; projectId: string; agentType: string; progress: number; message: string }
  | { type: 'completed'; jobId: string; projectId: string; agentType: string; result: unknown }
  | { type: 'failed'; jobId: string; projectId: string; agentType: string; error: string };

export async function publishAgentEvent(event: AgentEvent) {
  await getPublisher().publish(CHANNEL, JSON.stringify(event));
}

export function subscribeAgentEvents(handler: (event: AgentEvent) => void): IORedis {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const subscriber = new IORedis(url);
  subscriber.subscribe(CHANNEL);
  subscriber.on('message', (_channel, message) => {
    handler(JSON.parse(message));
  });
  return subscriber;
}
