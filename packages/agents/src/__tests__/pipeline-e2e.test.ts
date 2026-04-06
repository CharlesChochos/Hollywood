/**
 * End-to-end pipeline integration test.
 *
 * Exercises all 7 agents in production order using mock AI providers,
 * with DB and S3 layers stubbed. Validates:
 *   - Each agent produces correct output structure
 *   - Downstream job chaining (nextJobs) is wired correctly
 *   - The full idea→script→storyboard+voice→video→edit→marketing flow works
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stub DB ────────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock hoisting, so these are available in the factory
const { mockInsert, mockUpdate, mockSet, mockWhere } = vi.hoisted(() => {
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  let idCounter = 0;
  const nextId = () => `test-id-${++idCounter}`;

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => {
        const id = nextId();
        return [{ id, name: 'MockEntity', sceneNumber: 1, dialogue: [], duration: 5 }];
      }),
    }),
  });

  return { mockInsert, mockUpdate, mockSet, mockWhere };
});

vi.mock('@hollywood/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    query: {
      scenes: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'scene-1', sceneNumber: 1, scriptId: 'script-1', description: 'test', duration: 5 },
        ]),
      },
      storyboardFrames: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'frame-1', sceneId: 'scene-1', frameNumber: 1 },
        ]),
      },
      voiceTracks: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'track-1', sceneId: 'scene-1', duration: 3 },
        ]),
      },
      videoSegments: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'seg-1', sceneId: 'scene-1', projectId: 'proj-1', duration: 5 },
        ]),
      },
    },
  },
  scripts: { ideaId: 'ideaId', projectId: 'projectId' },
  scenes: { scriptId: 'scriptId' },
  characters: { id: 'id', projectId: 'projectId' },
  storyboardFrames: { sceneId: 'sceneId' },
  voiceTracks: { sceneId: 'sceneId' },
  videoSegments: { projectId: 'projectId', sceneId: 'sceneId' },
  finalCuts: { projectId: 'projectId' },
  assets: { projectId: 'projectId' },
  marketingCampaigns: { projectId: 'projectId' },
}));

// ── Stub Storage ───────────────────────────────────────────────────
vi.mock('@hollywood/storage', () => ({
  uploadBuffer: vi.fn().mockResolvedValue(undefined),
  storyboardFramePath: vi.fn().mockReturnValue('s3/storyboard/frame.svg'),
  voiceTrackPath: vi.fn().mockReturnValue('s3/voice/track.wav'),
  characterRefPath: vi.fn().mockReturnValue('s3/characters/ref.svg'),
  videoSegmentPath: vi.fn().mockReturnValue('s3/video/segment.mp4'),
  finalCutPath: vi.fn().mockReturnValue('s3/final/cut.mp4'),
  marketingPath: vi.fn().mockReturnValue('s3/marketing/asset'),
  getBucket: vi.fn().mockReturnValue('test-bucket'),
}));

// ── Import agents (after mocks are in place) ───────────────────────
import { getAgent } from '../registry';
import type { AgentInput, ProviderConfig, EnqueueRequest } from '@hollywood/types';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';

const MOCK_PROVIDER_CONFIG: ProviderConfig = {
  text: 'mock-text',
  image: 'mock-image',
  audio: 'mock-audio',
  video: 'mock-video',
};

const noopProgress = vi.fn().mockResolvedValue(undefined);
const neverAbort = new AbortController().signal;

function makeInput<T>(payload: T): AgentInput<T> {
  return {
    jobId: 'job-e2e',
    projectId: 'proj-e2e',
    payload,
    vibeSettings: DEFAULT_VIBE_SETTINGS,
    providerConfig: MOCK_PROVIDER_CONFIG,
  };
}

describe('Full pipeline E2E (mock providers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Script Writer ─────────────────────────────────────────────
  it('script_writer generates script and fans out to storyboard + character + voice', async () => {
    const agent = getAgent('script_writer');

    const result = await agent.execute(
      makeInput({
        ideaId: 'idea-1',
        ideaText: 'A lonely robot discovers a garden on Mars',
        genre: 'sci-fi',
        targetDuration: 120,
      }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('scriptId');
    expect(result.result).toHaveProperty('sceneIds');
    expect(result.result).toHaveProperty('characterIds');

    // Must fan out to downstream agents
    expect(result.nextJobs).toBeDefined();
    expect(result.nextJobs!.length).toBeGreaterThan(0);

    const agentTypes = result.nextJobs!.map((j: EnqueueRequest) => j.agentType);
    expect(agentTypes).toContain('storyboard_creator');
    expect(agentTypes).toContain('character_generator');
    expect(agentTypes).toContain('voice_actor');
  });

  // ── 2. Storyboard Creator ────────────────────────────────────────
  it('storyboard_creator generates frames and assets', { timeout: 15_000 }, async () => {
    const agent = getAgent('storyboard_creator');

    const result = await agent.execute(
      makeInput({
        sceneId: 'scene-1',
        sceneDescription: 'A barren Mars landscape with a single green sprout',
        artStyle: 'pixar',
      }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('sceneId', 'scene-1');
    expect(result.result).toHaveProperty('frameIds');
    expect((result.result as any).frameIds.length).toBeGreaterThan(0);
    expect(result.assets).toBeDefined();
    expect(result.assets!.length).toBeGreaterThan(0);
    // Storyboard does NOT produce nextJobs — orchestrator handles video gate
    expect(result.nextJobs).toBeUndefined();
  });

  // ── 3. Character Generator ───────────────────────────────────────
  it('character_generator produces reference sheet', async () => {
    const agent = getAgent('character_generator');

    const result = await agent.execute(
      makeInput({
        characterId: 'char-1',
        description: 'A small rusty robot with a single green LED eye',
        personality: 'Curious, gentle, determined',
        artStyle: 'pixar',
      }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('characterId', 'char-1');
    expect(result.result).toHaveProperty('assetId');
    expect(result.assets).toHaveLength(1);
  });

  // ── 4. Voice Actor ──────────────────────────────────────────────
  it('voice_actor records dialogue lines', async () => {
    const agent = getAgent('voice_actor');

    const result = await agent.execute(
      makeInput({
        sceneId: 'scene-1',
        lines: [
          { characterId: 'char-1', text: 'What is this green thing?', emotion: 'wonder' },
          { characterId: 'char-2', text: 'That, my friend, is called a plant.', emotion: 'warm' },
        ],
      }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('sceneId', 'scene-1');
    expect(result.result).toHaveProperty('trackIds');
    expect((result.result as any).trackIds).toHaveLength(2);
    expect((result.result as any).totalDuration).toBeGreaterThan(0);
    expect(result.assets).toHaveLength(2);
  });

  // ── 5. Video Generator ──────────────────────────────────────────
  it('video_generator produces video segment from storyboard + voice', async () => {
    const agent = getAgent('video_generator');

    const result = await agent.execute(
      makeInput({ sceneId: 'scene-1', projectId: 'proj-e2e' }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('sceneId', 'scene-1');
    expect(result.result).toHaveProperty('videoSegmentId');
    expect(result.result).toHaveProperty('duration');
    expect(result.assets).toHaveLength(1);
  });

  // ── 6. Editing ──────────────────────────────────────────────────
  it('editing assembles final cut and enqueues marketing', async () => {
    const agent = getAgent('editing');

    const result = await agent.execute(
      makeInput({ projectId: 'proj-e2e', scriptId: 'script-1' }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('finalCutId');
    expect(result.result).toHaveProperty('duration');
    expect(result.assets).toHaveLength(1);

    // Editing must trigger marketing
    expect(result.nextJobs).toBeDefined();
    expect(result.nextJobs).toHaveLength(1);
    expect(result.nextJobs![0].agentType).toBe('marketing');
  });

  // ── 7. Marketing ────────────────────────────────────────────────
  it('marketing generates trailer + thumbnail + social copy (end of pipeline)', { timeout: 15_000 }, async () => {
    const agent = getAgent('marketing');

    const result = await agent.execute(
      makeInput({ finalCutId: 'fc-1', projectId: 'proj-e2e', totalDuration: 120 }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('campaignId');
    expect(result.result).toHaveProperty('trailerAssetId');
    expect(result.result).toHaveProperty('thumbnailAssetId');
    expect(result.assets!.length).toBeGreaterThanOrEqual(2); // thumbnail + trailer at minimum

    // End of pipeline — no downstream jobs
    expect(result.nextJobs).toBeUndefined();
  });

  // ── Pipeline chaining validation ─────────────────────────────────
  it('script_writer → storyboard/voice/character fan-out has correct targetEntityIds', async () => {
    const agent = getAgent('script_writer');
    const result = await agent.execute(
      makeInput({ ideaId: 'idea-2', ideaText: 'Two cats start a detective agency' }),
      noopProgress,
      neverAbort,
    );

    expect(result.success).toBe(true);
    for (const job of result.nextJobs!) {
      expect(job.projectId).toBe('proj-e2e');
      expect(job.targetEntityId).toBeDefined();
      expect(job.targetEntityType).toBeDefined();
      expect(['scene', 'character']).toContain(job.targetEntityType);
    }
  });

  // ── Abort signal test ────────────────────────────────────────────
  it('agents respect abort signal', async () => {
    const agent = getAgent('storyboard_creator');
    const controller = new AbortController();

    // Abort before first frame completes
    controller.abort();

    await expect(
      agent.execute(
        makeInput({
          sceneId: 'scene-1',
          sceneDescription: 'This should be cancelled',
        }),
        noopProgress,
        controller.signal,
      ),
    ).rejects.toThrow('Job cancelled');
  });

  // ── Progress callback test ───────────────────────────────────────
  it('agents report progress from 0-100', async () => {
    const progressCalls: number[] = [];
    const trackProgress = vi.fn(async (progress: number) => {
      progressCalls.push(progress);
    });

    const agent = getAgent('character_generator');
    await agent.execute(
      makeInput({
        characterId: 'char-p',
        description: 'A tall elegant cat',
      }),
      trackProgress,
      neverAbort,
    );

    // Should start low and end at 100
    expect(progressCalls[0]).toBeLessThan(50);
    expect(progressCalls[progressCalls.length - 1]).toBe(100);
    // Should be monotonically non-decreasing
    for (let i = 1; i < progressCalls.length; i++) {
      expect(progressCalls[i]).toBeGreaterThanOrEqual(progressCalls[i - 1]);
    }
  });
});
