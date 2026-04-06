import { describe, it, expect, vi } from 'vitest';

// Mock DB and queue to isolate orchestrator logic
vi.mock('@hollywood/db', () => ({
  db: {
    query: {
      agentJobs: {
        findFirst: vi.fn(),
      },
      scripts: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      scenes: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
  agentJobs: { projectId: 'projectId', agentType: 'agentType', targetEntityId: 'targetEntityId', status: 'status' },
  scenes: { scriptId: 'scriptId' },
  scripts: { projectId: 'projectId' },
  videoSegments: {},
}));

vi.mock('@hollywood/queue', () => ({
  enqueueAgentJob: vi.fn().mockResolvedValue('job-123'),
}));

import { enqueueNextJobs, checkPrerequisites } from '../orchestrator/pipeline-orchestrator';
import { enqueueAgentJob } from '@hollywood/queue';
import { db } from '@hollywood/db';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';
import type { EnqueueRequest, ProviderConfig } from '@hollywood/types';

const mockProviderConfig: ProviderConfig = {
  text: 'mock-text',
  image: 'mock-image',
  audio: 'mock-audio',
  video: 'mock-video',
};

describe('enqueueNextJobs', () => {
  it('enqueues each job in the list', async () => {
    const nextJobs: EnqueueRequest[] = [
      {
        agentType: 'storyboard_creator',
        projectId: 'proj-1',
        payload: { sceneId: 's-1' },
        targetEntityType: 'scene',
        targetEntityId: 's-1',
      },
      {
        agentType: 'voice_actor',
        projectId: 'proj-1',
        payload: { sceneId: 's-1', lines: [] },
        targetEntityType: 'scene',
        targetEntityId: 's-1',
      },
    ];

    await enqueueNextJobs(nextJobs, DEFAULT_VIBE_SETTINGS, mockProviderConfig);

    expect(enqueueAgentJob).toHaveBeenCalledTimes(2);
    expect(enqueueAgentJob).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: 'storyboard_creator',
        projectId: 'proj-1',
      }),
    );
    expect(enqueueAgentJob).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: 'voice_actor',
        projectId: 'proj-1',
      }),
    );
  });

  it('handles empty nextJobs gracefully', async () => {
    vi.mocked(enqueueAgentJob).mockClear();
    await enqueueNextJobs([], DEFAULT_VIBE_SETTINGS, mockProviderConfig);
    expect(enqueueAgentJob).not.toHaveBeenCalled();
  });
});

describe('checkPrerequisites', () => {
  it('does nothing for script_writer completion', async () => {
    vi.mocked(enqueueAgentJob).mockClear();
    await checkPrerequisites('script_writer', 'proj-1', 's-1', DEFAULT_VIBE_SETTINGS, mockProviderConfig);
    // script_writer doesn't trigger any prerequisite checks
    expect(enqueueAgentJob).not.toHaveBeenCalled();
  });

  it('checks video gate when storyboard_creator completes', async () => {
    // Neither storyboard nor voice completed yet in the mock
    vi.mocked(db.query.agentJobs.findFirst).mockResolvedValue(undefined);
    vi.mocked(enqueueAgentJob).mockClear();

    await checkPrerequisites('storyboard_creator', 'proj-1', 's-1', DEFAULT_VIBE_SETTINGS, mockProviderConfig);

    // Should not enqueue video_generator since voice_actor hasn't completed
    expect(enqueueAgentJob).not.toHaveBeenCalled();
  });

  it('checks video gate when voice_actor completes', async () => {
    vi.mocked(db.query.agentJobs.findFirst).mockResolvedValue(undefined);
    vi.mocked(enqueueAgentJob).mockClear();

    await checkPrerequisites('voice_actor', 'proj-1', 's-1', DEFAULT_VIBE_SETTINGS, mockProviderConfig);
    expect(enqueueAgentJob).not.toHaveBeenCalled();
  });

  it('enqueues video_generator when both storyboard and voice are done', async () => {
    // First call: storyboard check → found
    // Second call: voice check → found
    // Third call: existing video check → not found
    vi.mocked(db.query.agentJobs.findFirst)
      .mockResolvedValueOnce({ id: 'j-1', status: 'completed' } as any) // storyboard
      .mockResolvedValueOnce({ id: 'j-2', status: 'completed' } as any) // voice
      .mockResolvedValueOnce(undefined); // no existing video job

    vi.mocked(enqueueAgentJob).mockClear();

    await checkPrerequisites('storyboard_creator', 'proj-1', 's-1', DEFAULT_VIBE_SETTINGS, mockProviderConfig);

    expect(enqueueAgentJob).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: 'video_generator',
        targetEntityId: 's-1',
      }),
    );
  });

  it('skips video_generator if already enqueued', async () => {
    vi.mocked(db.query.agentJobs.findFirst)
      .mockResolvedValueOnce({ id: 'j-1', status: 'completed' } as any) // storyboard
      .mockResolvedValueOnce({ id: 'j-2', status: 'completed' } as any) // voice
      .mockResolvedValueOnce({ id: 'j-3', status: 'active' } as any);   // existing video job

    vi.mocked(enqueueAgentJob).mockClear();

    await checkPrerequisites('storyboard_creator', 'proj-1', 's-1', DEFAULT_VIBE_SETTINGS, mockProviderConfig);
    expect(enqueueAgentJob).not.toHaveBeenCalled();
  });

  it('does nothing for storyboard without targetEntityId', async () => {
    vi.mocked(enqueueAgentJob).mockClear();
    await checkPrerequisites('storyboard_creator', 'proj-1', undefined, DEFAULT_VIBE_SETTINGS, mockProviderConfig);
    expect(enqueueAgentJob).not.toHaveBeenCalled();
  });
});
