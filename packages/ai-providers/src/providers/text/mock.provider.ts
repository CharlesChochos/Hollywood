import type { TextGenerationProvider, TextGenOptions } from '../../types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockTextProvider implements TextGenerationProvider {
  readonly name = 'mock-text';

  async generateText(prompt: string, options?: TextGenOptions): Promise<string> {
    await delay(1500);

    // Detect what type of content is being requested from the prompt
    if (prompt.includes('screenplay') || prompt.includes('script')) {
      return this.generateMockScript(prompt);
    }
    if (prompt.includes('edit decision') || prompt.includes('EDL')) {
      return this.generateMockEDL();
    }
    if (prompt.includes('social media') || prompt.includes('marketing')) {
      return this.generateMockSocialCopy();
    }

    return `[Mock AI Response]\n\n${prompt.slice(0, 100)}...\n\nGenerated at ${new Date().toISOString()}`;
  }

  async *streamText(prompt: string, options?: TextGenOptions): AsyncIterable<string> {
    const fullText = await this.generateText(prompt, options);
    const words = fullText.split(' ');
    for (const word of words) {
      await delay(30);
      yield word + ' ';
    }
  }

  private generateMockScript(prompt: string): string {
    const idea = prompt.slice(0, 80);
    return JSON.stringify({
      title: `The ${idea.split(' ').slice(0, 3).join(' ')} Chronicles`,
      logline: `A compelling story about ${idea.toLowerCase().slice(0, 60)}.`,
      scenes: [
        {
          sceneNumber: 1,
          heading: 'INT. MYSTERIOUS LABORATORY - NIGHT',
          description: 'A dimly lit laboratory filled with glowing screens and humming machines. Our protagonist enters hesitantly, their silhouette framed by the doorway light.',
          dialogue: [
            { characterName: 'ALEX', line: 'I never thought I\'d see this place again.', direction: '(whispering)' },
            { characterName: 'DR. CHEN', line: 'Welcome back. We\'ve been expecting you.', direction: '(turning from console)' },
          ],
          emotionalBeat: 'tension',
          estimatedDuration: 45,
        },
        {
          sceneNumber: 2,
          heading: 'EXT. CITY ROOFTOP - DAWN',
          description: 'The city skyline stretches endlessly. Morning light bathes everything in gold. Alex stands at the edge, looking out at the world below.',
          dialogue: [
            { characterName: 'ALEX', line: 'Is this really what the future looks like?', direction: '(in awe)' },
            { characterName: 'MAYA', line: 'Only if we make it so.', direction: '(joining at the railing)' },
          ],
          emotionalBeat: 'hope',
          estimatedDuration: 35,
        },
        {
          sceneNumber: 3,
          heading: 'INT. UNDERGROUND BUNKER - DAY',
          description: 'A makeshift command center. Maps and screens cover every wall. The team gathers around a central holographic display.',
          dialogue: [
            { characterName: 'DR. CHEN', line: 'The window is closing. We have twelve hours.', direction: '(urgent)' },
            { characterName: 'ALEX', line: 'Then we better get started.', direction: '(determined)' },
            { characterName: 'MAYA', line: 'I\'ve already mapped the route. Follow me.', direction: '(pulling up hologram)' },
          ],
          emotionalBeat: 'urgency',
          estimatedDuration: 50,
        },
      ],
      characters: [
        { name: 'ALEX', description: 'A resourceful engineer in their 30s with dark hair and determined eyes. Wears a worn leather jacket.', personality: 'Brave but haunted by past failures.' },
        { name: 'DR. CHEN', description: 'A brilliant scientist in their 50s with silver-streaked hair and kind but tired eyes. Always in a lab coat.', personality: 'Wise, patient, carries heavy secrets.' },
        { name: 'MAYA', description: 'A quick-witted strategist in their 20s with bright eyes and a confident smile. Tactical gear always ready.', personality: 'Bold, optimistic, natural leader.' },
      ],
    });
  }

  private generateMockEDL(): string {
    return JSON.stringify({
      transitions: ['cut', 'dissolve', 'cut'],
      colorGrade: 'warm_cinematic',
      pacing: 'moderate',
      musicCues: ['ambient_tension', 'hopeful_dawn', 'action_building'],
    });
  }

  private generateMockSocialCopy(): string {
    return JSON.stringify({
      trailer_tagline: 'The future is not written. It\'s engineered.',
      twitter_post: 'What would you do with 12 hours to change the world? 🎬 Watch now.',
      instagram_caption: 'Behind every great story is a team willing to risk everything. Our new film drops this Friday. #AIFilm #Animation',
    });
  }
}
