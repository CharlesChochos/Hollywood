import { relations } from 'drizzle-orm';
import {
  users, projects, ideas, scripts, scenes,
  characters, storyboardFrames, voiceTracks,
  videoSegments, finalCuts, assets, agentJobs,
  marketingCampaigns,
} from './schema';

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  ideas: many(ideas),
  scripts: many(scripts),
  scenes: many(scenes),
  characters: many(characters),
  assets: many(assets),
  agentJobs: many(agentJobs),
  finalCuts: many(finalCuts),
  marketingCampaigns: many(marketingCampaigns),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  project: one(projects, { fields: [ideas.projectId], references: [projects.id] }),
  scripts: many(scripts),
}));

export const scriptsRelations = relations(scripts, ({ one, many }) => ({
  idea: one(ideas, { fields: [scripts.ideaId], references: [ideas.id] }),
  project: one(projects, { fields: [scripts.projectId], references: [projects.id] }),
  scenes: many(scenes),
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
  script: one(scripts, { fields: [scenes.scriptId], references: [scripts.id] }),
  project: one(projects, { fields: [scenes.projectId], references: [projects.id] }),
  storyboardFrames: many(storyboardFrames),
  voiceTracks: many(voiceTracks),
  videoSegments: many(videoSegments),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  project: one(projects, { fields: [characters.projectId], references: [projects.id] }),
  referenceAsset: one(assets, { fields: [characters.referenceAssetId], references: [assets.id] }),
}));

export const storyboardFramesRelations = relations(storyboardFrames, ({ one }) => ({
  scene: one(scenes, { fields: [storyboardFrames.sceneId], references: [scenes.id] }),
  project: one(projects, { fields: [storyboardFrames.projectId], references: [projects.id] }),
  asset: one(assets, { fields: [storyboardFrames.assetId], references: [assets.id] }),
}));

export const voiceTracksRelations = relations(voiceTracks, ({ one }) => ({
  scene: one(scenes, { fields: [voiceTracks.sceneId], references: [scenes.id] }),
  character: one(characters, { fields: [voiceTracks.characterId], references: [characters.id] }),
  project: one(projects, { fields: [voiceTracks.projectId], references: [projects.id] }),
  asset: one(assets, { fields: [voiceTracks.assetId], references: [assets.id] }),
}));

export const videoSegmentsRelations = relations(videoSegments, ({ one }) => ({
  scene: one(scenes, { fields: [videoSegments.sceneId], references: [scenes.id] }),
  project: one(projects, { fields: [videoSegments.projectId], references: [projects.id] }),
  asset: one(assets, { fields: [videoSegments.assetId], references: [assets.id] }),
}));

export const finalCutsRelations = relations(finalCuts, ({ one }) => ({
  project: one(projects, { fields: [finalCuts.projectId], references: [projects.id] }),
  asset: one(assets, { fields: [finalCuts.assetId], references: [assets.id] }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
}));

export const agentJobsRelations = relations(agentJobs, ({ one }) => ({
  project: one(projects, { fields: [agentJobs.projectId], references: [projects.id] }),
}));

export const marketingCampaignsRelations = relations(marketingCampaigns, ({ one }) => ({
  project: one(projects, { fields: [marketingCampaigns.projectId], references: [projects.id] }),
  finalCut: one(finalCuts, { fields: [marketingCampaigns.finalCutId], references: [finalCuts.id] }),
  trailerAsset: one(assets, { fields: [marketingCampaigns.trailerAssetId], references: [assets.id] }),
  thumbnailAsset: one(assets, { fields: [marketingCampaigns.thumbnailAssetId], references: [assets.id] }),
}));
