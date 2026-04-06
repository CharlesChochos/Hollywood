import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, projects, ideas, scripts, scenes, characters } from '../src/schema';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log('Seeding database...');

  // 1. Create demo user
  const [user] = await db.insert(users).values({
    email: 'demo@hollywood.ai',
    name: 'Demo Director',
    settings: {},
  }).returning();
  console.log(`  Created user: ${user!.email}`);

  // 2. Create demo project
  const [project] = await db.insert(projects).values({
    name: 'Mars Garden',
    description: 'A lonely robot discovers a hidden garden on Mars and must protect it from a corporate terraforming mission.',
    status: 'in_production',
    vibeSettings: DEFAULT_VIBE_SETTINGS,
    ownerId: user!.id,
  }).returning();
  console.log(`  Created project: ${project!.name}`);

  // 3. Create idea
  const [idea] = await db.insert(ideas).values({
    projectId: project!.id,
    prompt: 'A lonely robot discovers a hidden garden on Mars and must protect it from a corporate terraforming mission.',
    expandedConcept: 'In the year 2157, a maintenance robot named SPROUT has been dutifully tending to an abandoned research station on Mars for 47 years. When it discovers a mysterious underground garden — the last remnant of a failed terraforming experiment — SPROUT must decide between its programmed duty to report all anomalies and its emerging desire to protect something beautiful.',
    status: 'completed',
    canvasPosition: { x: 100, y: 100 },
  }).returning();
  console.log(`  Created idea: ${idea!.prompt.substring(0, 50)}...`);

  // 4. Create script
  const [script] = await db.insert(scripts).values({
    ideaId: idea!.id,
    projectId: project!.id,
    title: 'The Last Garden',
    logline: 'A maintenance robot on Mars discovers a hidden garden and must choose between duty and beauty.',
    fullText: `FADE IN:

INT. MARS RESEARCH STATION - DAY

A dimly lit corridor. Dust particles float in thin beams of light. SPROUT, a compact maintenance robot with worn paint and a single expressive optical sensor, rolls along the corridor performing routine checks.

SPROUT (V.O.)
Day sixteen thousand, one hundred and seventy-two. All systems nominal. Temperature: -63 Celsius. Atmospheric pressure: 636 pascals. Status: alone.

Sprout pauses at a crack in the wall. A faint green glow seeps through.

SPROUT (V.O.)
Anomaly detected. Sector 7-G. Investigating.

INT. UNDERGROUND CAVERN - CONTINUOUS

Sprout squeezes through the crack and discovers a vast underground cavern filled with bioluminescent plants. A garden, impossibly alive on Mars.

SPROUT (V.O.)
This... this should not exist.

A flower turns toward Sprout's optical sensor, as if greeting an old friend.

SMASH CUT TO:

EXT. MARS ORBIT - DAY

A massive corporate vessel, the TERRAFORM ONE, enters Mars orbit. Its shadow falls across the red surface.

COMMANDER HAYES (V.O.)
Prepare for atmospheric conversion. Phase one begins in 72 hours.

FADE OUT.`,
    metadata: { genre: 'sci-fi', duration: '8min', tone: 'contemplative' },
    versionNumber: 1,
    isSelected: true,
    status: 'final',
  }).returning();
  console.log(`  Created script: ${script!.title}`);

  // 5. Create scenes
  const scenesData = [
    {
      scriptId: script!.id,
      projectId: project!.id,
      sceneNumber: 1,
      heading: 'INT. MARS RESEARCH STATION - DAY',
      description: 'Sprout performs routine maintenance in a dusty, abandoned Mars research station. The robot is alone, as it has been for 47 years.',
      dialogue: [
        { characterName: 'SPROUT', line: 'Day sixteen thousand, one hundred and seventy-two. All systems nominal.', emotion: 'melancholic' },
        { characterName: 'SPROUT', line: 'Anomaly detected. Sector 7-G. Investigating.', emotion: 'curious' },
      ],
      duration: 45,
      emotionalBeat: 'isolation → curiosity',
    },
    {
      scriptId: script!.id,
      projectId: project!.id,
      sceneNumber: 2,
      heading: 'INT. UNDERGROUND CAVERN - CONTINUOUS',
      description: 'Sprout discovers a vast underground cavern filled with bioluminescent plants — a hidden garden that has somehow survived on Mars.',
      dialogue: [
        { characterName: 'SPROUT', line: 'This... this should not exist.', emotion: 'wonder' },
      ],
      duration: 60,
      emotionalBeat: 'wonder → awe',
    },
    {
      scriptId: script!.id,
      projectId: project!.id,
      sceneNumber: 3,
      heading: 'EXT. MARS ORBIT - DAY',
      description: 'The corporate vessel Terraform One arrives in Mars orbit, casting a shadow over the planet. Commander Hayes announces the terraforming countdown.',
      dialogue: [
        { characterName: 'COMMANDER HAYES', line: 'Prepare for atmospheric conversion. Phase one begins in 72 hours.', emotion: 'authoritative' },
      ],
      duration: 30,
      emotionalBeat: 'dread → urgency',
    },
  ];

  const insertedScenes = await db.insert(scenes).values(scenesData).returning();
  console.log(`  Created ${insertedScenes.length} scenes`);

  // 6. Create characters
  const charactersData = [
    {
      projectId: project!.id,
      name: 'SPROUT',
      description: 'A compact maintenance robot with worn blue paint, a single expressive optical sensor that glows soft amber, and articulated manipulator arms. 47 years old, showing signs of wear but meticulously self-maintained.',
      personality: 'Dutiful, curious, developing emotional awareness. Speaks in precise technical language but increasingly poetic when describing the garden.',
      voiceProfile: { provider: 'mock-audio', settings: { pitch: 'medium', speed: 0.9, tone: 'robotic-warm' } },
      visualProfile: { style: 'pixar', primaryColor: '#4A90D9', accentColor: '#F5A623', height: 'small' },
    },
    {
      projectId: project!.id,
      name: 'COMMANDER HAYES',
      description: 'A stern corporate officer in their 50s with silver-streaked hair and a crisp uniform bearing the TerraForm Corp logo. All business, no sentiment.',
      personality: 'Pragmatic, results-driven, views Mars as a resource to be exploited. Not evil — just unable to see beyond quarterly targets.',
      voiceProfile: { provider: 'mock-audio', settings: { pitch: 'low', speed: 1.0, tone: 'authoritative' } },
      visualProfile: { style: 'pixar', primaryColor: '#2C3E50', accentColor: '#C0392B', height: 'tall' },
    },
  ];

  const insertedCharacters = await db.insert(characters).values(charactersData).returning();
  console.log(`  Created ${insertedCharacters.length} characters`);

  console.log('\nSeed complete!');
  console.log(`  Project ID: ${project!.id}`);
  console.log(`  Visit: http://localhost:3000/project/${project!.id}`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
