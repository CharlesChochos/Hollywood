import type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentProgressCallback,
  ValidationResult,
  AssetReference,
  EnqueueRequest,
} from '@hollywood/types';
import { eq } from 'drizzle-orm';
import { providerRegistry } from '@hollywood/ai-providers';
import { db, videoSegments, scenes, finalCuts, assets } from '@hollywood/db';
import { uploadBuffer, finalCutPath, getBucket } from '@hollywood/storage';

export interface EditingInput {
  projectId: string;
  scriptId: string;
}

export interface EditingOutput {
  finalCutId: string;
  duration: number;
}

export class EditingAgent implements Agent<EditingInput, EditingOutput> {
  readonly type = 'editing' as const;
  readonly version = '1.0.0';

  validate(input: AgentInput<EditingInput>): ValidationResult {
    if (!input.payload.projectId) return { valid: false, errors: ['projectId is required'] };
    if (!input.payload.scriptId) return { valid: false, errors: ['scriptId is required'] };
    return { valid: true };
  }

  async execute(
    input: AgentInput<EditingInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<EditingOutput>> {
    const { payload, projectId, vibeSettings } = input;
    const textProvider = providerRegistry.getText(input.providerConfig.text);

    await onProgress(5, 'Loading all video segments...');

    // Gather all scenes for this script, ordered
    const allScenes = await db.query.scenes.findMany({
      where: eq(scenes.scriptId, payload.scriptId),
      orderBy: (s, { asc }) => [asc(s.sceneNumber)],
    });

    // Gather video segments for the project
    const allSegments = await db.query.videoSegments.findMany({
      where: eq(videoSegments.projectId, projectId),
    });

    await onProgress(20, 'Generating edit decision list...');

    if (signal.aborted) throw new Error('Job cancelled');

    // Use text provider to generate an edit decision list (EDL)
    const edlPrompt = [
      'Generate an Edit Decision List (EDL) in JSON array format.',
      `Total scenes: ${allScenes.length}`,
      `Pacing: ${vibeSettings.pacing}/100`,
      `Cut Frequency: ${vibeSettings.cutFrequency}/100`,
      `Color Grade: ${vibeSettings.colorGrade}`,
      'Return: [{ "sceneNumber": N, "inPoint": 0, "outPoint": duration, "transition": "cut"|"dissolve"|"fade" }]',
    ].join('\n');

    const edlRaw = await textProvider.generateText(edlPrompt, { temperature: 0.3, maxTokens: 1000 });

    let edl: Record<string, unknown>[];
    try {
      edl = JSON.parse(edlRaw);
    } catch {
      // Fallback: simple sequential EDL
      let offset = 0;
      edl = allScenes.map((s) => {
        const segment = allSegments.find((seg) => seg.sceneId === s.id);
        const duration = segment?.duration ?? 5;
        const entry = {
          sceneNumber: s.sceneNumber,
          sceneId: s.id,
          inPoint: offset,
          outPoint: offset + duration,
          transition: 'cut',
        };
        offset += duration;
        return entry;
      });
    }

    await onProgress(50, 'Assembling final cut...');

    if (signal.aborted) throw new Error('Job cancelled');

    // Simulate ffmpeg assembly (mock: concatenate segment metadata)
    const totalDuration = allSegments.reduce((sum, s) => sum + (s.duration ?? 5), 0);

    // Create a mock final video buffer
    const finalBuffer = Buffer.from(JSON.stringify({
      mock: true,
      type: 'final_cut',
      scenes: allScenes.length,
      totalDuration,
      edl,
      colorGrade: vibeSettings.colorGrade,
      generatedAt: new Date().toISOString(),
    }), 'utf-8');

    await onProgress(75, 'Uploading final cut...');

    // Upload to S3
    const s3Key = finalCutPath(projectId, 1);
    await uploadBuffer(s3Key, finalBuffer, 'video/mp4');

    // Create asset record
    const [asset] = await db.insert(assets).values({
      projectId,
      type: 'final_cut',
      mimeType: 'video/mp4',
      fileName: 'final_cut_v1.mp4',
      s3Key,
      s3Bucket: getBucket(),
      fileSize: finalBuffer.length,
      width: 1920,
      height: 1080,
      duration: totalDuration,
      generatedBy: 'editing',
    }).returning();

    // Create final cut record
    const [cut] = await db.insert(finalCuts).values({
      projectId,
      editDecisionList: edl,
      assetId: asset!.id,
      duration: totalDuration,
      status: 'completed',
    }).returning();

    await onProgress(90, 'Preparing marketing pipeline...');

    // Enqueue marketing agent
    const nextJobs: EnqueueRequest[] = [{
      agentType: 'marketing',
      projectId,
      targetEntityType: 'final_cut',
      targetEntityId: cut!.id,
      payload: {
        finalCutId: cut!.id,
        projectId,
        totalDuration,
      },
    }];

    await onProgress(100, 'Final cut complete!');

    return {
      success: true,
      result: { finalCutId: cut!.id, duration: totalDuration },
      assets: [{ assetId: asset!.id, type: 'final_cut', s3Key }],
      nextJobs,
    };
  }
}
