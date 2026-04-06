import { describe, it, expect } from 'vitest';
import { ScriptWriterAgent } from '../agents/script-writer.agent';
import { StoryboardCreatorAgent } from '../agents/storyboard-creator.agent';
import { CharacterGeneratorAgent } from '../agents/character-generator.agent';
import { VoiceActorAgent } from '../agents/voice-actor.agent';
import { VideoGeneratorAgent } from '../agents/video-generator.agent';
import { EditingAgent } from '../agents/editing.agent';
import { MarketingAgent } from '../agents/marketing.agent';
import type { AgentInput, VibeSettings } from '@hollywood/types';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';

const baseInput = {
  jobId: 'job-1',
  projectId: 'proj-1',
  vibeSettings: DEFAULT_VIBE_SETTINGS,
  providerConfig: { text: 'mock-text', image: 'mock-image', audio: 'mock-audio', video: 'mock-video' },
};

function makeInput<T>(payload: T): AgentInput<T> {
  return { ...baseInput, payload };
}

describe('ScriptWriterAgent validation', () => {
  const agent = new ScriptWriterAgent();

  it('has correct type', () => {
    expect(agent.type).toBe('script_writer');
  });

  it('validates valid input', () => {
    const result = agent.validate(makeInput({ ideaId: 'idea-1', ideaText: 'A story about a robot' }));
    expect(result.valid).toBe(true);
  });

  it('rejects empty ideaText', () => {
    const result = agent.validate(makeInput({ ideaId: 'idea-1', ideaText: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ideaText is required');
  });

  it('rejects whitespace-only ideaText', () => {
    const result = agent.validate(makeInput({ ideaId: 'idea-1', ideaText: '   ' }));
    expect(result.valid).toBe(false);
  });
});

describe('StoryboardCreatorAgent validation', () => {
  const agent = new StoryboardCreatorAgent();

  it('has correct type', () => {
    expect(agent.type).toBe('storyboard_creator');
  });

  it('validates valid input', () => {
    const result = agent.validate(makeInput({ sceneId: 's-1', sceneDescription: 'A dark lab' }));
    expect(result.valid).toBe(true);
  });

  it('rejects missing sceneId', () => {
    const result = agent.validate(makeInput({ sceneId: '', sceneDescription: 'A dark lab' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('sceneId is required');
  });

  it('rejects missing sceneDescription', () => {
    const result = agent.validate(makeInput({ sceneId: 's-1', sceneDescription: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('sceneDescription is required');
  });
});

describe('CharacterGeneratorAgent validation', () => {
  const agent = new CharacterGeneratorAgent();

  it('has correct type', () => {
    expect(agent.type).toBe('character_generator');
  });

  it('validates valid input', () => {
    const result = agent.validate(makeInput({ characterId: 'c-1', description: 'A tall robot' }));
    expect(result.valid).toBe(true);
  });

  it('rejects missing characterId', () => {
    const result = agent.validate(makeInput({ characterId: '', description: 'A tall robot' }));
    expect(result.valid).toBe(false);
  });

  it('rejects missing description', () => {
    const result = agent.validate(makeInput({ characterId: 'c-1', description: '' }));
    expect(result.valid).toBe(false);
  });
});

describe('VoiceActorAgent validation', () => {
  const agent = new VoiceActorAgent();

  it('has correct type', () => {
    expect(agent.type).toBe('voice_actor');
  });

  it('validates valid input', () => {
    const result = agent.validate(
      makeInput({ sceneId: 's-1', lines: [{ characterId: 'c-1', text: 'Hello' }] }),
    );
    expect(result.valid).toBe(true);
  });

  it('rejects missing sceneId', () => {
    const result = agent.validate(
      makeInput({ sceneId: '', lines: [{ characterId: 'c-1', text: 'Hello' }] }),
    );
    expect(result.valid).toBe(false);
  });

  it('rejects empty lines array', () => {
    const result = agent.validate(makeInput({ sceneId: 's-1', lines: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one dialogue line is required');
  });
});

describe('VideoGeneratorAgent validation', () => {
  const agent = new VideoGeneratorAgent();

  it('has correct type', () => {
    expect(agent.type).toBe('video_generator');
  });

  it('validates valid input', () => {
    const result = agent.validate(makeInput({ sceneId: 's-1', projectId: 'proj-1' }));
    expect(result.valid).toBe(true);
  });

  it('rejects missing sceneId', () => {
    const result = agent.validate(makeInput({ sceneId: '', projectId: 'proj-1' }));
    expect(result.valid).toBe(false);
  });
});

describe('EditingAgent validation', () => {
  const agent = new EditingAgent();

  it('has correct type', () => {
    expect(agent.type).toBe('editing');
  });

  it('validates valid input', () => {
    const result = agent.validate(makeInput({ projectId: 'proj-1', scriptId: 'script-1' }));
    expect(result.valid).toBe(true);
  });

  it('rejects missing projectId', () => {
    const result = agent.validate(makeInput({ projectId: '', scriptId: 'script-1' }));
    expect(result.valid).toBe(false);
  });

  it('rejects missing scriptId', () => {
    const result = agent.validate(makeInput({ projectId: 'proj-1', scriptId: '' }));
    expect(result.valid).toBe(false);
  });
});

describe('MarketingAgent validation', () => {
  const agent = new MarketingAgent();

  it('has correct type', () => {
    expect(agent.type).toBe('marketing');
  });

  it('validates valid input', () => {
    const result = agent.validate(
      makeInput({ finalCutId: 'fc-1', projectId: 'proj-1', totalDuration: 120 }),
    );
    expect(result.valid).toBe(true);
  });

  it('rejects missing finalCutId', () => {
    const result = agent.validate(
      makeInput({ finalCutId: '', projectId: 'proj-1', totalDuration: 120 }),
    );
    expect(result.valid).toBe(false);
  });
});
