import type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentProgressCallback,
  ValidationResult,
  AssetReference,
} from '@hollywood/types';
import { providerRegistry } from '@hollywood/ai-providers';
import { eq } from 'drizzle-orm';
import { db, characters, assets } from '@hollywood/db';
import { uploadBuffer, characterRefPath, getBucket } from '@hollywood/storage';

export interface CharacterGeneratorInput {
  characterId: string;
  description: string;
  personality?: string;
  artStyle?: string;
}

export interface CharacterGeneratorOutput {
  characterId: string;
  assetId: string;
}

export class CharacterGeneratorAgent implements Agent<CharacterGeneratorInput, CharacterGeneratorOutput> {
  readonly type = 'character_generator' as const;
  readonly version = '1.0.0';

  validate(input: AgentInput<CharacterGeneratorInput>): ValidationResult {
    if (!input.payload.characterId) return { valid: false, errors: ['characterId is required'] };
    if (!input.payload.description) return { valid: false, errors: ['description is required'] };
    return { valid: true };
  }

  async execute(
    input: AgentInput<CharacterGeneratorInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<CharacterGeneratorOutput>> {
    const { payload, projectId } = input;
    const imageProvider = providerRegistry.getImage(input.providerConfig.image);

    await onProgress(10, 'Generating character reference sheet...');

    const prompt = `Character reference sheet: ${payload.description}. Personality: ${payload.personality ?? 'neutral'}. Style: ${payload.artStyle ?? 'pixar'}. Show front, side, and 3/4 views with expression range.`;

    const imageBuffer = await imageProvider.generateImage(prompt, {
      width: 1536,
      height: 1024,
      style: payload.artStyle,
    });

    if (signal.aborted) throw new Error('Job cancelled');
    await onProgress(60, 'Uploading reference sheet...');

    // Upload to S3
    const s3Key = characterRefPath(projectId, payload.characterId);
    await uploadBuffer(s3Key, imageBuffer, 'image/svg+xml');

    // Create asset record
    const [asset] = await db.insert(assets).values({
      projectId,
      type: 'character_reference',
      mimeType: 'image/svg+xml',
      fileName: 'reference_sheet.svg',
      s3Key,
      s3Bucket: getBucket(),
      fileSize: imageBuffer.length,
      width: 1536,
      height: 1024,
      generatedBy: 'character_generator',
    }).returning();

    // Update character with reference asset
    await db.update(characters)
      .set({ referenceAssetId: asset!.id, updatedAt: new Date() })
      .where(eq(characters.id, payload.characterId));

    await onProgress(100, 'Character reference sheet complete!');

    return {
      success: true,
      result: { characterId: payload.characterId, assetId: asset!.id },
      assets: [{ assetId: asset!.id, type: 'character_reference', s3Key }],
    };
  }
}
