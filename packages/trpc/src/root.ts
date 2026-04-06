import { router } from './trpc';
import {
  projectRouter,
  ideaRouter,
  scriptRouter,
  sceneRouter,
  characterRouter,
  storyboardRouter,
  voiceTrackRouter,
  agentRouter,
  assetRouter,
} from './routers';

export const appRouter = router({
  project: projectRouter,
  idea: ideaRouter,
  script: scriptRouter,
  scene: sceneRouter,
  character: characterRouter,
  storyboard: storyboardRouter,
  voiceTrack: voiceTrackRouter,
  agent: agentRouter,
  asset: assetRouter,
});

export type AppRouter = typeof appRouter;
