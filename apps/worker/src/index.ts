import { AGENT_QUEUES } from '@hollywood/queue';
import { startAgentWorker } from './agent-worker';
import { initTelemetry, shutdownTelemetry } from './telemetry';

initTelemetry();

console.log('🎬 Hollywood Studio Worker starting...');
console.log(`   Registered agent queues: ${AGENT_QUEUES.join(', ')}`);

const workers = AGENT_QUEUES
  .map((agentType) => startAgentWorker(agentType))
  .filter(Boolean);

console.log(`🎬 ${workers.length} agent worker(s) running. Waiting for jobs...`);

// Graceful shutdown
async function shutdown() {
  console.log('\n🎬 Shutting down workers...');
  await Promise.all(workers.map((w) => w!.close()));
  await shutdownTelemetry();
  console.log('🎬 All workers stopped.');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
