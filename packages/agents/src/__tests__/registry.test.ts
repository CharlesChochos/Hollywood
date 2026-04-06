import { describe, it, expect } from 'vitest';
import { getAgent, hasAgent } from '../registry';
import type { AgentType } from '@hollywood/types';

const ALL_AGENTS: AgentType[] = [
  'script_writer',
  'storyboard_creator',
  'character_generator',
  'voice_actor',
  'video_generator',
  'editing',
  'marketing',
];

describe('Agent Registry', () => {
  it('has all 7 agents registered', () => {
    for (const type of ALL_AGENTS) {
      expect(hasAgent(type)).toBe(true);
    }
  });

  it('getAgent returns an agent with matching type', () => {
    for (const type of ALL_AGENTS) {
      const agent = getAgent(type);
      expect(agent.type).toBe(type);
      expect(agent.version).toBeTruthy();
    }
  });

  it('throws for unregistered agent type', () => {
    expect(() => getAgent('nonexistent' as AgentType)).toThrow('Agent "nonexistent" not registered');
  });

  it('all agents have a validate method', () => {
    for (const type of ALL_AGENTS) {
      const agent = getAgent(type);
      expect(typeof agent.validate).toBe('function');
    }
  });

  it('all agents have an execute method', () => {
    for (const type of ALL_AGENTS) {
      const agent = getAgent(type);
      expect(typeof agent.execute).toBe('function');
    }
  });
});
