import type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentProgressCallback,
  ValidationResult,
  AssetReference,
} from '@hollywood/types';
import { providerRegistry } from '@hollywood/ai-providers';
import { db, voiceTracks, assets } from '@hollywood/db';
import { uploadBuffer, voiceTrackPath, getBucket } from '@hollywood/storage';

interface DialogueLine {
  characterId: string;
  text: string;
  emotion?: string;
}

export interface VoiceActorInput {
  sceneId: string;
  lines: DialogueLine[];
}

export interface VoiceActorOutput {
  sceneId: string;
  trackIds: string[];
  totalDuration: number;
}

export class VoiceActorAgent implements Agent<VoiceActorInput, VoiceActorOutput> {
  readonly type = 'voice_actor' as const;
  readonly version = '1.0.0';

  validate(input: AgentInput<VoiceActorInput>): ValidationResult {
    if (!input.payload.sceneId) return { valid: false, errors: ['sceneId is required'] };
    if (!input.payload.lines?.length) return { valid: false, errors: ['At least one dialogue line is required'] };
    return { valid: true };
  }

  async execute(
    input: AgentInput<VoiceActorInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<VoiceActorOutput>> {
    const { payload, projectId } = input;
    const audioProvider = providerRegistry.getAudio(input.providerConfig.audio);
    const assetRefs: AssetReference[] = [];
    const trackIds: string[] = [];
    let totalDuration = 0;

    await onProgress(5, `Recording ${payload.lines.length} dialogue lines...`);

    let lineIndex = 0;
    for (const line of payload.lines) {
      if (signal.aborted) throw new Error('Job cancelled');

      const voiceProfile = {
        id: line.characterId || 'default',
        name: 'Mock Voice',
        settings: { emotion: line.emotion ?? 'neutral' },
      };

      const audioBuffer = await audioProvider.generateSpeech(line.text, voiceProfile);

      // Estimate duration: ~150 words per minute
      const wordCount = line.text.split(/\s+/).length;
      const duration = Math.max(1, (wordCount / 150) * 60);
      totalDuration += duration;

      const progress = 10 + Math.round((lineIndex / payload.lines.length) * 80);
      await onProgress(progress, `Line ${lineIndex + 1}/${payload.lines.length} recorded`);

      // Upload to S3
      const s3Key = voiceTrackPath(projectId, payload.sceneId, line.characterId || 'narrator', lineIndex + 1, 1);
      await uploadBuffer(s3Key, audioBuffer, 'audio/wav');

      // Create asset record
      const [asset] = await db.insert(assets).values({
        projectId,
        type: 'voice_track',
        mimeType: 'audio/wav',
        fileName: `line_${lineIndex + 1}.wav`,
        s3Key,
        s3Bucket: getBucket(),
        fileSize: audioBuffer.length,
        duration,
        generatedBy: 'voice_actor',
      }).returning();

      // Create voice track record
      const [track] = await db.insert(voiceTracks).values({
        sceneId: payload.sceneId,
        characterId: line.characterId || '00000000-0000-0000-0000-000000000000',
        projectId,
        dialogueLine: line.text,
        emotion: line.emotion,
        assetId: asset!.id,
        duration,
      }).returning();

      trackIds.push(track!.id);
      assetRefs.push({ assetId: asset!.id, type: 'voice_track', s3Key });
      lineIndex++;
    }

    await onProgress(100, 'Voice recording complete!');

    // No nextJobs — video_generator is enqueued by the orchestrator
    return {
      success: true,
      result: { sceneId: payload.sceneId, trackIds, totalDuration },
      assets: assetRefs,
    };
  }
}
