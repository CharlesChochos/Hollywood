import type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentProgressCallback,
  ValidationResult,
  EnqueueRequest,
  VibeSettings,
} from '@hollywood/types';
import { providerRegistry } from '@hollywood/ai-providers';
import { db, scripts, scenes, characters } from '@hollywood/db';

export interface ScriptWriterInput {
  ideaId: string;
  ideaText: string;
  genre?: string;
  targetDuration?: number;
  tone?: string;
}

export interface ScriptWriterOutput {
  scriptId: string;
  sceneIds: string[];
  characterIds: string[];
}

interface ParsedScene {
  sceneNumber: number;
  heading: string;
  description: string;
  dialogue: Array<{ characterName: string; line: string; direction?: string }>;
  emotionalBeat: string;
  estimatedDuration: number;
}

interface ParsedCharacter {
  name: string;
  description: string;
  personality: string;
}

interface ParsedScript {
  title: string;
  logline: string;
  scenes: ParsedScene[];
  characters: ParsedCharacter[];
}

export class ScriptWriterAgent implements Agent<ScriptWriterInput, ScriptWriterOutput> {
  readonly type = 'script_writer' as const;
  readonly version = '1.0.0';

  validate(input: AgentInput<ScriptWriterInput>): ValidationResult {
    if (!input.payload.ideaText?.trim()) {
      return { valid: false, errors: ['ideaText is required'] };
    }
    return { valid: true };
  }

  async execute(
    input: AgentInput<ScriptWriterInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<ScriptWriterOutput>> {
    const { payload, projectId, vibeSettings } = input;

    await onProgress(5, 'Analyzing idea and generating screenplay...');

    // 1. Generate script via text provider
    const textProvider = providerRegistry.getText(input.providerConfig.text);
    const prompt = this.buildPrompt(payload, vibeSettings);
    const rawOutput = await textProvider.generateText(prompt, {
      temperature: 0.8,
      maxTokens: 4000,
    });

    if (signal.aborted) throw new Error('Job cancelled');
    await onProgress(40, 'Script generated. Parsing scenes and characters...');

    // 2. Parse the structured output
    let parsed: ParsedScript;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      return { success: false, error: 'Failed to parse script output as JSON' };
    }

    await onProgress(50, 'Saving script to database...');

    // 3. Save script to DB
    const [savedScript] = await db.insert(scripts).values({
      ideaId: payload.ideaId,
      projectId,
      title: parsed.title,
      logline: parsed.logline,
      fullText: rawOutput,
      metadata: { genre: payload.genre, tone: payload.tone },
      status: 'completed',
    }).returning();

    if (signal.aborted) throw new Error('Job cancelled');
    await onProgress(60, 'Saving scenes...');

    // 4. Save scenes
    const savedScenes = await db.insert(scenes).values(
      parsed.scenes.map((s) => ({
        scriptId: savedScript!.id,
        projectId,
        sceneNumber: s.sceneNumber,
        heading: s.heading,
        description: s.description,
        dialogue: s.dialogue.map((d) => ({
          characterId: '', // Will be linked after character creation
          line: d.line,
          direction: d.direction,
        })),
        duration: s.estimatedDuration,
        emotionalBeat: s.emotionalBeat,
      })),
    ).returning();

    await onProgress(75, 'Saving characters...');

    // 5. Save characters
    const savedCharacters = await db.insert(characters).values(
      parsed.characters.map((c) => ({
        projectId,
        name: c.name,
        description: c.description,
        personality: c.personality,
        voiceProfile: { provider: 'mock-audio', settings: {} },
        visualProfile: { artStyle: vibeSettings.artStyle },
      })),
    ).returning();

    await onProgress(90, 'Preparing downstream agent jobs...');

    // 6. Build next jobs to enqueue (fan-out)
    const nextJobs: EnqueueRequest[] = [];

    // Storyboard job per scene
    for (const scene of savedScenes) {
      nextJobs.push({
        agentType: 'storyboard_creator',
        projectId,
        targetEntityType: 'scene',
        targetEntityId: scene.id,
        payload: {
          sceneId: scene.id,
          sceneDescription: scene.description,
          dialogue: JSON.stringify(scene.dialogue),
          artStyle: vibeSettings.artStyle,
        },
      });
    }

    // Character generator job per character
    for (const char of savedCharacters) {
      nextJobs.push({
        agentType: 'character_generator',
        projectId,
        targetEntityType: 'character',
        targetEntityId: char.id,
        payload: {
          characterId: char.id,
          description: char.description,
          personality: char.personality,
          artStyle: vibeSettings.artStyle,
        },
      });
    }

    // Voice actor job per scene
    for (const scene of savedScenes) {
      const sceneData = parsed.scenes.find((s) => s.sceneNumber === scene.sceneNumber);
      if (sceneData?.dialogue.length) {
        nextJobs.push({
          agentType: 'voice_actor',
          projectId,
          targetEntityType: 'scene',
          targetEntityId: scene.id,
          payload: {
            sceneId: scene.id,
            lines: sceneData.dialogue.map((d) => ({
              characterId: savedCharacters.find((c) => c.name === d.characterName)?.id ?? '',
              text: d.line,
              emotion: sceneData.emotionalBeat,
            })),
          },
        });
      }
    }

    await onProgress(100, 'Script writing complete!');

    return {
      success: true,
      result: {
        scriptId: savedScript!.id,
        sceneIds: savedScenes.map((s) => s.id),
        characterIds: savedCharacters.map((c) => c.id),
      },
      nextJobs,
    };
  }

  private buildPrompt(payload: ScriptWriterInput, vibeSettings: VibeSettings): string {
    return [
      'Generate a screenplay in JSON format with the following structure:',
      '{ "title": string, "logline": string, "scenes": [...], "characters": [...] }',
      '',
      `Idea: ${payload.ideaText}`,
      payload.genre ? `Genre: ${payload.genre}` : '',
      payload.tone ? `Tone: ${payload.tone}` : '',
      `Art Style: ${vibeSettings.artStyle ?? 'pixar'}`,
      `Emotional Intensity: ${vibeSettings.emotionalIntensity ?? 50}/100`,
      '',
      'Each scene should have: sceneNumber, heading (screenplay format), description, dialogue array [{characterName, line, direction}], emotionalBeat, estimatedDuration (seconds).',
      'Each character should have: name, description (visual), personality.',
      'Generate 3-5 scenes and 2-4 characters.',
    ].filter(Boolean).join('\n');
  }
}
