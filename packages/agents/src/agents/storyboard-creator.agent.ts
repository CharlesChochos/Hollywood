import type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentProgressCallback,
  ValidationResult,
  AssetReference,
} from '@hollywood/types';
import { providerRegistry } from '@hollywood/ai-providers';
import { db, storyboardFrames, assets } from '@hollywood/db';
import { uploadBuffer, storyboardFramePath, getBucket } from '@hollywood/storage';

export interface StoryboardCreatorInput {
  sceneId: string;
  sceneDescription: string;
  dialogue?: string;
  artStyle?: string;
}

export interface StoryboardCreatorOutput {
  sceneId: string;
  frameIds: string[];
}

const FRAMES_PER_SCENE = 4;

export class StoryboardCreatorAgent implements Agent<StoryboardCreatorInput, StoryboardCreatorOutput> {
  readonly type = 'storyboard_creator' as const;
  readonly version = '1.0.0';

  validate(input: AgentInput<StoryboardCreatorInput>): ValidationResult {
    if (!input.payload.sceneId) return { valid: false, errors: ['sceneId is required'] };
    if (!input.payload.sceneDescription) return { valid: false, errors: ['sceneDescription is required'] };
    return { valid: true };
  }

  async execute(
    input: AgentInput<StoryboardCreatorInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<StoryboardCreatorOutput>> {
    const { payload, projectId } = input;
    const imageProvider = providerRegistry.getImage(input.providerConfig.image);
    const assetRefs: AssetReference[] = [];
    const frameIds: string[] = [];

    await onProgress(5, `Generating ${FRAMES_PER_SCENE} storyboard frames...`);

    for (let i = 0; i < FRAMES_PER_SCENE; i++) {
      if (signal.aborted) throw new Error('Job cancelled');

      const frameNum = i + 1;
      const prompt = `Storyboard frame ${frameNum}/${FRAMES_PER_SCENE} for scene: ${payload.sceneDescription}. Style: ${payload.artStyle ?? 'pixar'}`;

      const imageBuffer = await imageProvider.generateImage(prompt, {
        width: 1024,
        height: 768,
        style: payload.artStyle,
      });

      const progress = 10 + Math.round((i / FRAMES_PER_SCENE) * 70);
      await onProgress(progress, `Frame ${frameNum}/${FRAMES_PER_SCENE} generated`);

      // Upload to S3
      const s3Key = storyboardFramePath(projectId, payload.sceneId, frameNum, 1);
      await uploadBuffer(s3Key, imageBuffer, 'image/svg+xml');

      // Create asset record
      const [asset] = await db.insert(assets).values({
        projectId,
        type: 'storyboard_frame',
        mimeType: 'image/svg+xml',
        fileName: `frame_${frameNum}.svg`,
        s3Key,
        s3Bucket: getBucket(),
        fileSize: imageBuffer.length,
        width: 1024,
        height: 768,
        generatedBy: 'storyboard_creator',
      }).returning();

      // Create storyboard frame record
      const [frame] = await db.insert(storyboardFrames).values({
        sceneId: payload.sceneId,
        projectId,
        frameNumber: frameNum,
        prompt,
        composition: `Frame ${frameNum} of ${FRAMES_PER_SCENE}`,
        assetId: asset!.id,
      }).returning();

      frameIds.push(frame!.id);
      assetRefs.push({ assetId: asset!.id, type: 'storyboard_frame', s3Key });
    }

    await onProgress(100, 'Storyboard complete!');

    // No nextJobs — video_generator is enqueued by the orchestrator
    // when BOTH storyboard AND voice are done for this scene
    return {
      success: true,
      result: { sceneId: payload.sceneId, frameIds },
      assets: assetRefs,
    };
  }
}
