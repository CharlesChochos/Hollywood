import { eq } from 'drizzle-orm';
import type { AgentType, VibeSettings, ProviderConfig } from '@hollywood/types';
import { getDefaultProviderConfig } from '@hollywood/types';

// These will be lazily imported to avoid circular deps at module load time
let _db: any = null;
let _agentJobs: any = null;

async function getDbModules() {
  if (!_db) {
    const mod = await import('@hollywood/db');
    _db = mod.db;
    _agentJobs = mod.agentJobs;
  }
  return { db: _db, agentJobs: _agentJobs };
}

/**
 * Create a DB job record and add to BullMQ queue.
 * Callable from both the web app (tRPC) and worker (orchestrator).
 */
export async function enqueueAgentJob(params: {
  projectId: string;
  agentType: AgentType;
  payload: Record<string, unknown>;
  vibeSettings: VibeSettings;
  providerConfig?: ProviderConfig;
  targetEntityType?: string;
  targetEntityId?: string;
}): Promise<string> {
  const { getQueue } = await import('./queues');
  const { db, agentJobs } = await getDbModules();

  const {
    projectId,
    agentType,
    payload,
    vibeSettings,
    providerConfig = getDefaultProviderConfig(),
    targetEntityType,
    targetEntityId,
  } = params;

  // 1. Create DB record
  const [dbJob] = await db.insert(agentJobs).values({
    projectId,
    agentType,
    status: 'queued',
    progress: 0,
    input: payload,
    targetEntityType,
    targetEntityId,
  }).returning();

  const jobId = dbJob!.id;

  // 2. Add to BullMQ queue
  const queue = getQueue(agentType);
  const bullJob = await queue.add(
    `${agentType}-${jobId}`,
    {
      jobId,
      projectId,
      agentType,
      payload,
      vibeSettings,
      providerConfig,
    },
    { jobId },
  );

  // 3. Update DB with BullMQ job ID
  await db.update(agentJobs)
    .set({ bullmqJobId: bullJob.id })
    .where(eq(agentJobs.id, jobId));

  return jobId;
}
