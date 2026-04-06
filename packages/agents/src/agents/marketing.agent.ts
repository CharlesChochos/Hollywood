import type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentProgressCallback,
  ValidationResult,
  AssetReference,
} from '@hollywood/types';
import { providerRegistry } from '@hollywood/ai-providers';
import { db, marketingCampaigns, assets } from '@hollywood/db';
import { uploadBuffer, marketingPath, getBucket } from '@hollywood/storage';

export interface MarketingInput {
  finalCutId: string;
  projectId: string;
  totalDuration: number;
}

export interface MarketingOutput {
  campaignId: string;
  trailerAssetId: string;
  thumbnailAssetId: string;
}

export class MarketingAgent implements Agent<MarketingInput, MarketingOutput> {
  readonly type = 'marketing' as const;
  readonly version = '1.0.0';

  validate(input: AgentInput<MarketingInput>): ValidationResult {
    if (!input.payload.finalCutId) return { valid: false, errors: ['finalCutId is required'] };
    return { valid: true };
  }

  async execute(
    input: AgentInput<MarketingInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<MarketingOutput>> {
    const { payload, projectId, vibeSettings } = input;
    const textProvider = providerRegistry.getText(input.providerConfig.text);
    const imageProvider = providerRegistry.getImage(input.providerConfig.image);
    const videoProvider = providerRegistry.getVideo(input.providerConfig.video);
    const assetRefs: AssetReference[] = [];

    // 1. Generate thumbnail
    await onProgress(10, 'Generating thumbnail...');
    const thumbnailBuffer = await imageProvider.generateImage(
      'Movie poster thumbnail, cinematic, dramatic lighting',
      { width: 1280, height: 720, style: vibeSettings.artStyle },
    );

    if (signal.aborted) throw new Error('Job cancelled');

    const thumbS3Key = marketingPath(projectId, 'thumbnails/thumb_v1.svg');
    await uploadBuffer(thumbS3Key, thumbnailBuffer, 'image/svg+xml');

    const [thumbAsset] = await db.insert(assets).values({
      projectId,
      type: 'thumbnail',
      mimeType: 'image/svg+xml',
      fileName: 'thumbnail.svg',
      s3Key: thumbS3Key,
      s3Bucket: getBucket(),
      fileSize: thumbnailBuffer.length,
      width: 1280,
      height: 720,
      generatedBy: 'marketing',
    }).returning();
    assetRefs.push({ assetId: thumbAsset!.id, type: 'thumbnail', s3Key: thumbS3Key });

    // 2. Generate trailer
    await onProgress(40, 'Generating trailer...');
    const trailerBuffer = await videoProvider.generateVideo(
      { frames: [thumbnailBuffer], durationSeconds: Math.min(30, payload.totalDuration * 0.3) },
      { width: 1920, height: 1080, fps: 24 },
    );

    if (signal.aborted) throw new Error('Job cancelled');

    const trailerS3Key = marketingPath(projectId, 'trailers/trailer_v1.mp4');
    await uploadBuffer(trailerS3Key, trailerBuffer, 'video/mp4');

    const [trailerAsset] = await db.insert(assets).values({
      projectId,
      type: 'trailer',
      mimeType: 'video/mp4',
      fileName: 'trailer.mp4',
      s3Key: trailerS3Key,
      s3Bucket: getBucket(),
      fileSize: trailerBuffer.length,
      width: 1920,
      height: 1080,
      duration: Math.min(30, payload.totalDuration * 0.3),
      generatedBy: 'marketing',
    }).returning();
    assetRefs.push({ assetId: trailerAsset!.id, type: 'trailer', s3Key: trailerS3Key });

    // 3. Generate social media copy
    await onProgress(70, 'Generating social media content...');
    const socialPrompt = 'Generate social media captions for YouTube, TikTok, and Instagram. Return JSON: [{ "platform": string, "caption": string }]';
    const socialRaw = await textProvider.generateText(socialPrompt, { temperature: 0.7, maxTokens: 500 });

    let socialData: Array<{ platform: string; caption: string }>;
    try {
      const parsed = JSON.parse(socialRaw);
      if (Array.isArray(parsed)) {
        socialData = parsed;
      } else {
        throw new Error('Not an array');
      }
    } catch {
      socialData = [
        { platform: 'youtube', caption: 'Watch our latest AI-generated film!' },
        { platform: 'tiktok', caption: 'Made entirely by AI agents' },
        { platform: 'instagram', caption: 'From idea to screen, powered by AI' },
      ];
    }

    await onProgress(90, 'Creating marketing campaign...');

    // Create campaign record
    const [campaign] = await db.insert(marketingCampaigns).values({
      projectId,
      finalCutId: payload.finalCutId,
      trailerAssetId: trailerAsset!.id,
      thumbnailAssetId: thumbAsset!.id,
      socialMediaAssets: socialData.map((s) => ({
        platform: s.platform,
        assetId: '',
        caption: s.caption,
      })),
      status: 'ready',
    }).returning();

    await onProgress(100, 'Marketing campaign ready!');

    // End of pipeline — no nextJobs
    return {
      success: true,
      result: {
        campaignId: campaign!.id,
        trailerAssetId: trailerAsset!.id,
        thumbnailAssetId: thumbAsset!.id,
      },
      assets: assetRefs,
    };
  }
}
