import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import {
  users, projects, ideas, scripts, scenes, characters,
  storyboardFrames, voiceTracks, videoSegments, finalCuts,
  assets, agentJobs, marketingCampaigns,
} from '../src/schema';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log('Seeding database...\n');

  // ── 1. User ──────────────────────────────────────────────────────
  const [user] = await db.insert(users).values({
    email: 'demo@hollywood.ai',
    name: 'Demo Director',
    settings: {},
  }).returning();
  console.log(`  User: ${user!.email}`);

  // ── 2. Project ───────────────────────────────────────────────────
  const [project] = await db.insert(projects).values({
    name: 'Mars Garden',
    description: 'A lonely robot discovers a hidden garden on Mars and must protect it from a corporate terraforming mission.',
    status: 'in_production',
    vibeSettings: DEFAULT_VIBE_SETTINGS,
    ownerId: user!.id,
  }).returning();
  const pid = project!.id;
  console.log(`  Project: ${project!.name} (${pid})`);

  // ── 3. Idea ──────────────────────────────────────────────────────
  const [idea] = await db.insert(ideas).values({
    projectId: pid,
    prompt: 'A lonely robot discovers a hidden garden on Mars and must protect it from a corporate terraforming mission.',
    expandedConcept: 'In the year 2157, a maintenance robot named SPROUT has been dutifully tending to an abandoned research station on Mars for 47 years. When it discovers a mysterious underground garden — the last remnant of a failed terraforming experiment — SPROUT must decide between its programmed duty to report all anomalies and its emerging desire to protect something beautiful.',
    status: 'completed',
    canvasPosition: { x: 100, y: 100 },
  }).returning();
  console.log(`  Idea: ${idea!.prompt.substring(0, 50)}...`);

  // ── 4. Script ────────────────────────────────────────────────────
  const [script] = await db.insert(scripts).values({
    ideaId: idea!.id,
    projectId: pid,
    title: 'The Last Garden',
    logline: 'A maintenance robot on Mars discovers a hidden garden and must choose between duty and beauty.',
    fullText: 'FADE IN:\n\nINT. MARS RESEARCH STATION - DAY\n\n...',
    metadata: { genre: 'sci-fi', duration: '8min', tone: 'contemplative' },
    versionNumber: 1,
    isSelected: true,
    status: 'final',
  }).returning();
  console.log(`  Script: ${script!.title}`);

  // ── 5. Scenes ────────────────────────────────────────────────────
  const scenesData = [
    {
      scriptId: script!.id, projectId: pid, sceneNumber: 1,
      heading: 'INT. MARS RESEARCH STATION - DAY',
      description: 'Sprout performs routine maintenance in a dusty, abandoned Mars research station.',
      dialogue: [
        { characterId: '', line: 'Day sixteen thousand, one hundred and seventy-two. All systems nominal.', direction: '(monotone)' },
        { characterId: '', line: 'Anomaly detected. Sector 7-G. Investigating.', direction: '(curious)' },
      ],
      duration: 45, emotionalBeat: 'isolation → curiosity',
    },
    {
      scriptId: script!.id, projectId: pid, sceneNumber: 2,
      heading: 'INT. UNDERGROUND CAVERN - CONTINUOUS',
      description: 'Sprout discovers a vast underground cavern filled with bioluminescent plants.',
      dialogue: [
        { characterId: '', line: 'This... this should not exist.', direction: '(wonder)' },
      ],
      duration: 60, emotionalBeat: 'wonder → awe',
    },
    {
      scriptId: script!.id, projectId: pid, sceneNumber: 3,
      heading: 'EXT. MARS ORBIT - DAY',
      description: 'The corporate vessel Terraform One arrives in Mars orbit.',
      dialogue: [
        { characterId: '', line: 'Prepare for atmospheric conversion. Phase one begins in 72 hours.', direction: '(authoritative)' },
      ],
      duration: 30, emotionalBeat: 'dread → urgency',
    },
  ];
  const insertedScenes = await db.insert(scenes).values(scenesData).returning();
  console.log(`  Scenes: ${insertedScenes.length}`);

  // ── 6. Characters ────────────────────────────────────────────────
  const charsData = [
    {
      projectId: pid, name: 'SPROUT',
      description: 'A compact maintenance robot with worn blue paint, a single expressive optical sensor that glows soft amber.',
      personality: 'Dutiful, curious, developing emotional awareness.',
      voiceProfile: { provider: 'mock-audio', settings: { pitch: 'medium', speed: 0.9 } },
      visualProfile: { artStyle: 'pixar', primaryColor: '#4A90D9' },
    },
    {
      projectId: pid, name: 'COMMANDER HAYES',
      description: 'A stern corporate officer in their 50s with silver-streaked hair and a crisp uniform.',
      personality: 'Pragmatic, results-driven, views Mars as a resource.',
      voiceProfile: { provider: 'mock-audio', settings: { pitch: 'low', speed: 1.0 } },
      visualProfile: { artStyle: 'pixar', primaryColor: '#2C3E50' },
    },
  ];
  const insertedChars = await db.insert(characters).values(charsData).returning();
  console.log(`  Characters: ${insertedChars.length}`);

  // ── 7. Assets (mock placeholders) ────────────────────────────────
  const makeAsset = (type: string, fileName: string, mime: string, generatedBy: string, extra?: Record<string, unknown>) =>
    ({ projectId: pid, type, mimeType: mime, fileName, s3Key: `${pid}/${type}/${fileName}`, s3Bucket: 'hollywood-assets', fileSize: 1024, generatedBy, ...extra });

  // Character reference sheets
  const charAssets = await db.insert(assets).values(
    insertedChars.map((c) => makeAsset('character_reference', `${c.name.toLowerCase()}_ref.svg`, 'image/svg+xml', 'character_generator', { width: 1536, height: 1024 })),
  ).returning();
  console.log(`  Character assets: ${charAssets.length}`);

  // Link reference assets to characters
  for (let i = 0; i < insertedChars.length; i++) {
    await db.update(characters)
      .set({ referenceAssetId: charAssets[i]!.id })
      .where(eq(characters.id, insertedChars[i]!.id));
  }

  // Storyboard frame assets (4 per scene)
  const allFrameAssets = [];
  for (const scene of insertedScenes) {
    for (let f = 1; f <= 4; f++) {
      const [a] = await db.insert(assets).values(
        makeAsset('storyboard_frame', `scene${scene.sceneNumber}_frame${f}.svg`, 'image/svg+xml', 'storyboard_creator', { width: 1024, height: 768 }),
      ).returning();
      allFrameAssets.push({ asset: a!, sceneId: scene.id, frameNumber: f });
    }
  }
  console.log(`  Storyboard frame assets: ${allFrameAssets.length}`);

  // ── 8. Storyboard Frames ─────────────────────────────────────────
  const frameRecords = await db.insert(storyboardFrames).values(
    allFrameAssets.map((f) => ({
      sceneId: f.sceneId,
      projectId: pid,
      frameNumber: f.frameNumber,
      prompt: `Storyboard frame ${f.frameNumber}`,
      composition: `Frame ${f.frameNumber} of 4`,
      assetId: f.asset.id,
    })),
  ).returning();
  console.log(`  Storyboard frames: ${frameRecords.length}`);

  // ── 9. Voice Track assets + records ──────────────────────────────
  const allVoiceTracks = [];
  for (const scene of insertedScenes) {
    const sceneDialogue = scenesData.find((s) => s.sceneNumber === scene.sceneNumber)?.dialogue ?? [];
    for (let l = 0; l < sceneDialogue.length; l++) {
      const [a] = await db.insert(assets).values(
        makeAsset('voice_track', `scene${scene.sceneNumber}_line${l + 1}.wav`, 'audio/wav', 'voice_actor', { duration: 3 }),
      ).returning();

      const [track] = await db.insert(voiceTracks).values({
        sceneId: scene.id,
        characterId: insertedChars[0]!.id, // Default to SPROUT
        projectId: pid,
        dialogueLine: sceneDialogue[l].line,
        emotion: sceneDialogue[l].direction?.replace(/[()]/g, ''),
        assetId: a!.id,
        duration: 3,
      }).returning();
      allVoiceTracks.push(track!);
    }
  }
  console.log(`  Voice tracks: ${allVoiceTracks.length}`);

  // ── 10. Video Segments ───────────────────────────────────────────
  const allSegments = [];
  for (const scene of insertedScenes) {
    const [vAsset] = await db.insert(assets).values(
      makeAsset('video_segment', `scene${scene.sceneNumber}_segment.mp4`, 'video/mp4', 'video_generator', { width: 1920, height: 1080, duration: scene.duration ?? 30 }),
    ).returning();

    const [seg] = await db.insert(videoSegments).values({
      sceneId: scene.id,
      projectId: pid,
      assetId: vAsset!.id,
      duration: scene.duration ?? 30,
      resolution: '1920x1080',
      fps: 24,
      renderSettings: { vibeSettings: DEFAULT_VIBE_SETTINGS },
    }).returning();
    allSegments.push(seg!);
  }
  console.log(`  Video segments: ${allSegments.length}`);

  // ── 11. Final Cut ────────────────────────────────────────────────
  const totalDuration = insertedScenes.reduce((s, sc) => s + (sc.duration ?? 30), 0);
  const [fcAsset] = await db.insert(assets).values(
    makeAsset('final_cut', 'final_cut_v1.mp4', 'video/mp4', 'editing', { width: 1920, height: 1080, duration: totalDuration }),
  ).returning();

  const [finalCut] = await db.insert(finalCuts).values({
    projectId: pid,
    editDecisionList: insertedScenes.map((s) => ({
      sceneNumber: s.sceneNumber, sceneId: s.id,
      inPoint: 0, outPoint: s.duration ?? 30, transition: 'dissolve',
    })),
    assetId: fcAsset!.id,
    duration: totalDuration,
    status: 'completed',
  }).returning();
  console.log(`  Final cut: ${totalDuration}s total`);

  // ── 12. Marketing Campaign ───────────────────────────────────────
  const [thumbAsset] = await db.insert(assets).values(
    makeAsset('thumbnail', 'thumbnail_v1.svg', 'image/svg+xml', 'marketing', { width: 1280, height: 720 }),
  ).returning();
  const [trailerAsset] = await db.insert(assets).values(
    makeAsset('trailer', 'trailer_v1.mp4', 'video/mp4', 'marketing', { width: 1920, height: 1080, duration: 30 }),
  ).returning();

  await db.insert(marketingCampaigns).values({
    projectId: pid,
    finalCutId: finalCut!.id,
    trailerAssetId: trailerAsset!.id,
    thumbnailAssetId: thumbAsset!.id,
    socialMediaAssets: [
      { platform: 'youtube', caption: 'What happens when a robot discovers beauty on Mars? Watch "The Last Garden" now.' },
      { platform: 'tiktok', caption: 'A robot. A garden. Mars. 🌱🤖 #AIFilm #MarsGarden' },
      { platform: 'instagram', caption: 'Duty vs beauty — meet SPROUT, a robot who must choose. Our AI-generated short drops this week. #AnimatedShort' },
    ],
    status: 'ready',
  });
  console.log(`  Marketing campaign: ready`);

  // ── 13. Agent Jobs (all completed) ───────────────────────────────
  const now = new Date();
  const jobsData = [
    { agentType: 'script_writer' as const, targetEntityType: 'idea', targetEntityId: idea!.id, startOffset: -300, duration: 45 },
    ...insertedScenes.map((s) => ({ agentType: 'storyboard_creator' as const, targetEntityType: 'scene', targetEntityId: s.id, startOffset: -240, duration: 30 })),
    ...insertedChars.map((c) => ({ agentType: 'character_generator' as const, targetEntityType: 'character', targetEntityId: c.id, startOffset: -240, duration: 20 })),
    ...insertedScenes.map((s) => ({ agentType: 'voice_actor' as const, targetEntityType: 'scene', targetEntityId: s.id, startOffset: -240, duration: 15 })),
    ...insertedScenes.map((s) => ({ agentType: 'video_generator' as const, targetEntityType: 'scene', targetEntityId: s.id, startOffset: -180, duration: 60 })),
    { agentType: 'editing' as const, targetEntityType: 'script', targetEntityId: script!.id, startOffset: -60, duration: 30 },
    { agentType: 'marketing' as const, targetEntityType: 'final_cut', targetEntityId: finalCut!.id, startOffset: -20, duration: 25 },
  ];

  await db.insert(agentJobs).values(
    jobsData.map((j) => {
      const started = new Date(now.getTime() + j.startOffset * 1000);
      const completed = new Date(started.getTime() + j.duration * 1000);
      return {
        projectId: pid,
        agentType: j.agentType,
        status: 'completed' as const,
        progress: 100,
        input: { targetEntityId: j.targetEntityId },
        output: { success: true },
        startedAt: started,
        completedAt: completed,
        targetEntityType: j.targetEntityType,
        targetEntityId: j.targetEntityId,
      };
    }),
  );
  console.log(`  Agent jobs: ${jobsData.length} (all completed)`);

  // ── 14. Canvas State ─────────────────────────────────────────────
  const canvasNodes = [
    { id: `idea-${idea!.id}`, type: 'idea', position: { x: 0, y: 0 }, data: { label: idea!.prompt.slice(0, 40), entityId: idea!.id, prompt: idea!.prompt, status: 'completed', projectId: pid } },
    { id: `script-${script!.id}`, type: 'script', position: { x: 300, y: 0 }, data: { label: script!.title, entityId: script!.id, title: script!.title, status: 'final', projectId: pid } },
    ...insertedScenes.map((s, i) => ({
      id: `scene-${s.id}`, type: 'scene', position: { x: 600, y: i * 200 },
      data: { label: s.heading, entityId: s.id, sceneNumber: s.sceneNumber, heading: s.heading, emotionalBeat: s.emotionalBeat, projectId: pid },
    })),
    ...insertedChars.map((c, i) => ({
      id: `char-${c.id}`, type: 'character', position: { x: 600, y: 600 + i * 150 },
      data: { label: c.name, entityId: c.id, name: c.name, description: c.description, projectId: pid },
    })),
  ];
  const canvasEdges = [
    { id: 'e-idea-script', source: `idea-${idea!.id}`, target: `script-${script!.id}` },
    ...insertedScenes.map((s) => ({ id: `e-script-scene-${s.id}`, source: `script-${script!.id}`, target: `scene-${s.id}` })),
    ...insertedChars.map((c) => ({ id: `e-script-char-${c.id}`, source: `script-${script!.id}`, target: `char-${c.id}` })),
  ];

  await db.update(projects).set({
    canvasState: { nodes: canvasNodes, edges: canvasEdges, viewport: { x: 0, y: 0, zoom: 0.8 } },
    updatedAt: new Date(),
  }).where(eq(projects.id, pid));
  console.log(`  Canvas: ${canvasNodes.length} nodes, ${canvasEdges.length} edges`);

  console.log('\n✓ Seed complete!');
  console.log(`  Project ID: ${pid}`);
  console.log(`  Visit: http://localhost:3000/project/${pid}`);
  console.log(`  Login: demo@hollywood.ai\n`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
