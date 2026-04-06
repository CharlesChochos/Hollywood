import type { Agent, AgentType } from '@hollywood/types';
import { ScriptWriterAgent } from './agents/script-writer.agent';
import { StoryboardCreatorAgent } from './agents/storyboard-creator.agent';
import { CharacterGeneratorAgent } from './agents/character-generator.agent';
import { VoiceActorAgent } from './agents/voice-actor.agent';
import { VideoGeneratorAgent } from './agents/video-generator.agent';
import { EditingAgent } from './agents/editing.agent';
import { MarketingAgent } from './agents/marketing.agent';

const agents = new Map<AgentType, Agent>();

// Register all agents
agents.set('script_writer', new ScriptWriterAgent());
agents.set('storyboard_creator', new StoryboardCreatorAgent());
agents.set('character_generator', new CharacterGeneratorAgent());
agents.set('voice_actor', new VoiceActorAgent());
agents.set('video_generator', new VideoGeneratorAgent());
agents.set('editing', new EditingAgent());
agents.set('marketing', new MarketingAgent());

export function getAgent(type: AgentType): Agent {
  const agent = agents.get(type);
  if (!agent) throw new Error(`Agent "${type}" not registered`);
  return agent;
}

export function hasAgent(type: AgentType): boolean {
  return agents.has(type);
}
