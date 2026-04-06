import { Worker, Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { getRedisConnection, publishAgentEvent } from '@hollywood/queue';
import { getAgent, hasAgent } from '@hollywood/agents';
import { db, agentJobs } from '@hollywood/db';
import type { AgentType, VibeSettings, ProviderConfig } from '@hollywood/types';
import { enqueueNextJobs, checkPrerequisites } from './orchestrator/pipeline-orchestrator';

const tracer = trace.getTracer('hollywood-worker');

const QUEUE_PREFIX = 'hollywood';

interface AgentJobData {
  jobId: string; // Our DB job ID
  projectId: string;
  agentType: AgentType;
  payload: Record<string, unknown>;
  vibeSettings: VibeSettings;
  providerConfig: ProviderConfig;
}

async function processJob(job: Job<AgentJobData>) {
  const { jobId, projectId, agentType, payload, vibeSettings, providerConfig } = job.data;

  return tracer.startActiveSpan(`agent.${agentType}`, async (span) => {
    span.setAttributes({
      'agent.type': agentType,
      'agent.job_id': jobId,
      'agent.project_id': projectId,
    });

    try {
      return await _processJob(job);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}

async function _processJob(job: Job<AgentJobData>) {
  const { jobId, projectId, agentType, payload, vibeSettings, providerConfig } = job.data;

  console.log(`[${agentType}] Starting job ${jobId} for project ${projectId}`);

  // Update DB job status to active
  await db.update(agentJobs)
    .set({ status: 'active', startedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  const agent = getAgent(agentType);
  const abortController = new AbortController();

  // Progress callback — writes to BullMQ, DB, and Redis Pub/Sub for real-time relay
  const onProgress = async (progress: number, message: string) => {
    await job.updateProgress({ percent: progress, message });
    await db.update(agentJobs)
      .set({ progress, updatedAt: new Date() })
      .where(eq(agentJobs.id, jobId));
    await publishAgentEvent({ type: 'progress', jobId, projectId, agentType, progress, message });
    console.log(`[${agentType}] ${progress}% — ${message}`);
  };

  try {
    const result = await agent.execute(
      {
        jobId,
        projectId,
        payload,
        vibeSettings,
        providerConfig,
      },
      onProgress,
      abortController.signal,
    );

    if (result.success) {
      // Mark completed in DB
      await db.update(agentJobs)
        .set({
          status: 'completed',
          progress: 100,
          output: result.result as Record<string, unknown>,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentJobs.id, jobId));

      await publishAgentEvent({ type: 'completed', jobId, projectId, agentType, result: result.result });
      console.log(`[${agentType}] Job ${jobId} completed successfully`);

      // Enqueue downstream jobs declared by the agent
      if (result.nextJobs?.length) {
        await enqueueNextJobs(result.nextJobs, vibeSettings, providerConfig);
        console.log(`[${agentType}] Enqueued ${result.nextJobs.length} downstream jobs`);
      }

      // Check fan-in prerequisites (e.g., video needs storyboard + voice)
      const dbJob = await db.query.agentJobs.findFirst({
        where: eq(agentJobs.id, jobId),
      });
      await checkPrerequisites(
        agentType,
        projectId,
        dbJob?.targetEntityId ?? undefined,
        vibeSettings,
        providerConfig,
      );
    } else {
      throw new Error(result.error ?? 'Agent returned failure');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agentType}] Job ${jobId} failed: ${errorMsg}`);

    await db.update(agentJobs)
      .set({
        status: 'failed',
        error: errorMsg,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentJobs.id, jobId));

    await publishAgentEvent({ type: 'failed', jobId, projectId, agentType, error: errorMsg });

    throw error; // Re-throw so BullMQ handles retries
  }
}

export function startAgentWorker(agentType: AgentType) {
  if (!hasAgent(agentType)) {
    console.log(`[${agentType}] No agent registered, skipping worker`);
    return null;
  }

  const queueName = `${QUEUE_PREFIX}:${agentType}`;
  const worker = new Worker<AgentJobData>(queueName, processJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  });

  worker.on('ready', () => {
    console.log(`[${agentType}] Worker ready, listening on queue: ${queueName}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[${agentType}] Job ${job?.id} failed after retries: ${error.message}`);
  });

  return worker;
}
