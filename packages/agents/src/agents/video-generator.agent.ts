import type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentProgressCallback,
  ValidationResult,
  AssetReference,
  EnqueueRequest,
} from '@hollywood/types';
import { eq, and } from 'drizzle-orm';
import { providerRegistry } from '@hollywood/ai-providers';
import { db, videoSegments, storyboardFrames, voiceTracks, scenes, assets } from '@hollywood/db';
import { uploadBuffer, videoSegmentPath, getBucket } from '@hollywood/storage';

export interface VideoGeneratorInput {
  sceneId: string;
  projectId: string;
}

export interface VideoGeneratorOutput {
  sceneId: string;
  videoSegmentId: string;
  duration: number;
}

export class VideoGeneratorAgent implements Agent<VideoGeneratorInput, VideoGeneratorOutput> {
  readonly type = 'video_generator' as const;
  readonly version = '1.0.0';

  validate(input: AgentInput<VideoGeneratorInput>): ValidationResult {
    if (!input.payload.sceneId) return { valid: false, errors: ['sceneId is required'] };
    return { valid: true };
  }

  async execute(
    input: AgentInput<VideoGeneratorInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<VideoGeneratorOutput>> {
    const { payload, projectId } = input;
    const videoProvider = providerRegistry.getVideo(input.providerConfig.video);

    await onProgress(5, 'Loading storyboard frames and voice tracks...');

    // Gather storyboard frames for this scene
    const frames = await db.query.storyboardFrames.findMany({
      where: eq(storyboardFrames.sceneId, payload.sceneId),
      orderBy: (f, { asc }) => [asc(f.frameNumber)],
    });

    // Gather voice tracks for this scene
    const tracks = await db.query.voiceTracks.findMany({
      where: eq(voiceTracks.sceneId, payload.sceneId),
    });

    const totalDuration = tracks.reduce((sum, t) => sum + (t.duration ?? 2), 0) || 5;

    await onProgress(20, `Animating ${frames.length} frames with ${tracks.length} voice tracks...`);

    if (signal.aborted) throw new Error('Job cancelled');

    // Call mock video provider (frames are placeholder buffers here)
    const frameBuffers = frames.map(() => Buffer.from('placeholder-frame'));
    const audioBuffer = tracks.length > 0 ? Buffer.from('placeholder-audio') : undefined;

    const videoBuffer = await videoProvider.generateVideo(
      { frames: frameBuffers, audio: audioBuffer, durationSeconds: totalDuration },
      { width: 1920, height: 1080, fps: 24 },
    );

    if (signal.aborted) throw new Error('Job cancelled');
    await onProgress(75, 'Uploading video segment...');

    // Upload to S3
    const s3Key = videoSegmentPath(projectId, payload.sceneId, 1);
    await uploadBuffer(s3Key, videoBuffer, 'video/mp4');

    // Create asset record
    const [asset] = await db.insert(assets).values({
      projectId,
      type: 'video_segment',
      mimeType: 'video/mp4',
      fileName: `segment.mp4`,
      s3Key,
      s3Bucket: getBucket(),
      fileSize: videoBuffer.length,
      width: 1920,
      height: 1080,
      duration: totalDuration,
      generatedBy: 'video_generator',
    }).returning();

    // Create video segment record
    const [segment] = await db.insert(videoSegments).values({
      sceneId: payload.sceneId,
      projectId,
      assetId: asset!.id,
      duration: totalDuration,
      resolution: '1920x1080',
      fps: 24,
      renderSettings: { vibeSettings: input.vibeSettings },
    }).returning();

    await onProgress(100, 'Video segment complete!');

    // No nextJobs — editing is enqueued by orchestrator when ALL scenes have video
    return {
      success: true,
      result: {
        sceneId: payload.sceneId,
        videoSegmentId: segment!.id,
        duration: totalDuration,
      },
      assets: [{ assetId: asset!.id, type: 'video_segment', s3Key }],
    };
  }
}
