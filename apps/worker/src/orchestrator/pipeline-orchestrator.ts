import { eq, and } from 'drizzle-orm';
import { enqueueAgentJob } from '@hollywood/queue';
import { db, agentJobs, scenes, videoSegments, scripts } from '@hollywood/db';
import { getDefaultProviderConfig } from '@hollywood/types';
import type { EnqueueRequest, VibeSettings, ProviderConfig, AgentType } from '@hollywood/types';

/**
 * Enqueue downstream jobs produced by a completed agent.
 * Also checks prerequisites for fan-in gates (video needs storyboard + voice).
 */
export async function enqueueNextJobs(
  nextJobs: EnqueueRequest[],
  vibeSettings: VibeSettings,
  providerConfig: ProviderConfig = getDefaultProviderConfig(),
) {
  for (const job of nextJobs) {
    await enqueueAgentJob({
      projectId: job.projectId,
      agentType: job.agentType,
      payload: job.payload as Record<string, unknown>,
      vibeSettings,
      providerConfig,
      targetEntityType: job.targetEntityType,
      targetEntityId: job.targetEntityId,
    });
  }
}

/**
 * Called after an agent completes to check if downstream fan-in gates are now satisfied.
 * This handles the prerequisite checking that individual agents can't do on their own.
 */
export async function checkPrerequisites(
  completedAgentType: AgentType,
  projectId: string,
  targetEntityId: string | undefined,
  vibeSettings: VibeSettings,
  providerConfig: ProviderConfig = getDefaultProviderConfig(),
) {
  switch (completedAgentType) {
    case 'storyboard_creator':
    case 'voice_actor':
      // Fan-in gate: video_generator needs BOTH storyboard AND voice for a scene
      if (targetEntityId) {
        await checkVideoGeneratorGate(projectId, targetEntityId, vibeSettings, providerConfig);
      }
      break;

    case 'video_generator':
      // Fan-in gate: editing needs ALL scenes to have video segments
      await checkEditingGate(projectId, vibeSettings, providerConfig);
      break;
  }
}

/**
 * Check if both storyboard_creator and voice_actor have completed for a given scene.
 * If so, enqueue the video_generator for that scene.
 */
async function checkVideoGeneratorGate(
  projectId: string,
  sceneId: string,
  vibeSettings: VibeSettings,
  providerConfig: ProviderConfig,
) {
  // Check if storyboard_creator completed for this scene
  const storyboardJob = await db.query.agentJobs.findFirst({
    where: and(
      eq(agentJobs.projectId, projectId),
      eq(agentJobs.agentType, 'storyboard_creator'),
      eq(agentJobs.targetEntityId, sceneId),
      eq(agentJobs.status, 'completed'),
    ),
  });

  // Check if voice_actor completed for this scene
  const voiceJob = await db.query.agentJobs.findFirst({
    where: and(
      eq(agentJobs.projectId, projectId),
      eq(agentJobs.agentType, 'voice_actor'),
      eq(agentJobs.targetEntityId, sceneId),
      eq(agentJobs.status, 'completed'),
    ),
  });

  if (!storyboardJob || !voiceJob) {
    console.log(`[orchestrator] Scene ${sceneId}: waiting for ${!storyboardJob ? 'storyboard' : 'voice'}`);
    return;
  }

  // Check if video_generator already enqueued/running for this scene
  const existingVideoJob = await db.query.agentJobs.findFirst({
    where: and(
      eq(agentJobs.projectId, projectId),
      eq(agentJobs.agentType, 'video_generator'),
      eq(agentJobs.targetEntityId, sceneId),
    ),
  });

  if (existingVideoJob) {
    console.log(`[orchestrator] Scene ${sceneId}: video_generator already exists (${existingVideoJob.status})`);
    return;
  }

  console.log(`[orchestrator] Scene ${sceneId}: both storyboard + voice done — enqueuing video_generator`);

  await enqueueAgentJob({
    projectId,
    agentType: 'video_generator',
    payload: { sceneId, projectId },
    vibeSettings,
    providerConfig,
    targetEntityType: 'scene',
    targetEntityId: sceneId,
  });
}

/**
 * Check if all scenes in the project have completed video segments.
 * If so, enqueue the editing agent to assemble the final cut.
 */
async function checkEditingGate(
  projectId: string,
  vibeSettings: VibeSettings,
  providerConfig: ProviderConfig,
) {
  // Get all scenes for this project (via their scripts)
  const projectScripts = await db.query.scripts.findMany({
    where: eq(scripts.projectId, projectId),
  });

  if (projectScripts.length === 0) return;

  // Use the most recent script
  const latestScript = projectScripts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]!;

  const allScenes = await db.query.scenes.findMany({
    where: eq(scenes.scriptId, latestScript.id),
  });

  if (allScenes.length === 0) return;

  // Check that each scene has a completed video_generator job
  for (const scene of allScenes) {
    const videoJob = await db.query.agentJobs.findFirst({
      where: and(
        eq(agentJobs.projectId, projectId),
        eq(agentJobs.agentType, 'video_generator'),
        eq(agentJobs.targetEntityId, scene.id),
        eq(agentJobs.status, 'completed'),
      ),
    });

    if (!videoJob) {
      console.log(`[orchestrator] Waiting for video_generator on scene ${scene.sceneNumber}`);
      return;
    }
  }

  // Check if editing already enqueued/running
  const existingEditJob = await db.query.agentJobs.findFirst({
    where: and(
      eq(agentJobs.projectId, projectId),
      eq(agentJobs.agentType, 'editing'),
    ),
  });

  if (existingEditJob) {
    console.log(`[orchestrator] Editing agent already exists (${existingEditJob.status})`);
    return;
  }

  console.log(`[orchestrator] All ${allScenes.length} scenes have video — enqueuing editing agent`);

  await enqueueAgentJob({
    projectId,
    agentType: 'editing',
    payload: { projectId, scriptId: latestScript.id },
    vibeSettings,
    providerConfig,
    targetEntityType: 'script',
    targetEntityId: latestScript.id,
  });
}
