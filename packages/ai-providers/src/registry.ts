import type {
  TextGenerationProvider,
  ImageGenerationProvider,
  AudioGenerationProvider,
  VideoGenerationProvider,
} from './types';
import { MockTextProvider } from './providers/text/mock.provider';
import { MockImageProvider } from './providers/image/mock.provider';
import { MockAudioProvider } from './providers/audio/mock.provider';
import { MockVideoProvider } from './providers/video/mock.provider';
import { AnthropicTextProvider } from './providers/text/anthropic.provider';
import { OpenAITextProvider } from './providers/text/openai.provider';
import { OpenAIImageProvider } from './providers/image/openai.provider';
import { StabilityImageProvider } from './providers/image/stability.provider';
import { OpenAITTSProvider } from './providers/audio/openai-tts.provider';
import { ElevenLabsProvider } from './providers/audio/elevenlabs.provider';
import { RunwayVideoProvider } from './providers/video/runway.provider';

const textProviders = new Map<string, TextGenerationProvider>();
const imageProviders = new Map<string, ImageGenerationProvider>();
const audioProviders = new Map<string, AudioGenerationProvider>();
const videoProviders = new Map<string, VideoGenerationProvider>();

// Preferred provider names — first available wins in resolveX() calls
let preferredText: string | null = null;
let preferredImage: string | null = null;
let preferredAudio: string | null = null;

// ── Always register mocks ──
textProviders.set('mock-text', new MockTextProvider());
imageProviders.set('mock-image', new MockImageProvider());
audioProviders.set('mock-audio', new MockAudioProvider());
videoProviders.set('mock-video', new MockVideoProvider());

// ── Conditionally register real providers when API keys are present ──
if (process.env.ANTHROPIC_API_KEY) {
  const provider = new AnthropicTextProvider();
  textProviders.set(provider.name, provider);
  preferredText ??= provider.name;
}

if (process.env.OPENAI_API_KEY) {
  const textProvider = new OpenAITextProvider();
  textProviders.set(textProvider.name, textProvider);
  preferredText ??= textProvider.name;

  const imageProvider = new OpenAIImageProvider();
  imageProviders.set(imageProvider.name, imageProvider);
  preferredImage ??= imageProvider.name;

  const ttsProvider = new OpenAITTSProvider();
  audioProviders.set(ttsProvider.name, ttsProvider);
  preferredAudio ??= ttsProvider.name;
}

if (process.env.STABILITY_API_KEY) {
  const provider = new StabilityImageProvider();
  imageProviders.set(provider.name, provider);
  preferredImage ??= provider.name;
}

if (process.env.ELEVENLABS_API_KEY) {
  const provider = new ElevenLabsProvider();
  audioProviders.set(provider.name, provider);
  preferredAudio ??= provider.name;
}

if (process.env.RUNWAY_API_KEY) {
  const provider = new RunwayVideoProvider();
  videoProviders.set(provider.name, provider);
}

export const providerRegistry = {
  getText(name: string): TextGenerationProvider {
    const p = textProviders.get(name);
    if (!p) throw new Error(`Text provider "${name}" not registered`);
    return p;
  },

  getImage(name: string): ImageGenerationProvider {
    const p = imageProviders.get(name);
    if (!p) throw new Error(`Image provider "${name}" not registered`);
    return p;
  },

  getAudio(name: string): AudioGenerationProvider {
    const p = audioProviders.get(name);
    if (!p) throw new Error(`Audio provider "${name}" not registered`);
    return p;
  },

  getVideo(name: string): VideoGenerationProvider {
    const p = videoProviders.get(name);
    if (!p) throw new Error(`Video provider "${name}" not registered`);
    return p;
  },

  /** Get best available text provider (real if API key set, else mock) */
  resolveText(): TextGenerationProvider {
    if (preferredText) return textProviders.get(preferredText)!;
    return textProviders.get('mock-text')!;
  },

  /** Get best available image provider (real if API key set, else mock) */
  resolveImage(): ImageGenerationProvider {
    if (preferredImage) return imageProviders.get(preferredImage)!;
    return imageProviders.get('mock-image')!;
  },

  /** Get best available audio provider (real if API key set, else mock) */
  resolveAudio(): AudioGenerationProvider {
    if (preferredAudio) return audioProviders.get(preferredAudio)!;
    return audioProviders.get('mock-audio')!;
  },

  /** Get best available video provider (Runway if API key set, else mock) */
  resolveVideo(): VideoGenerationProvider {
    if (videoProviders.has('runway')) return videoProviders.get('runway')!;
    return videoProviders.get('mock-video')!;
  },

  registerText(provider: TextGenerationProvider) {
    textProviders.set(provider.name, provider);
  },
  registerImage(provider: ImageGenerationProvider) {
    imageProviders.set(provider.name, provider);
  },
  registerAudio(provider: AudioGenerationProvider) {
    audioProviders.set(provider.name, provider);
  },
  registerVideo(provider: VideoGenerationProvider) {
    videoProviders.set(provider.name, provider);
  },

  /** List registered provider names per category */
  listProviders() {
    return {
      text: [...textProviders.keys()],
      image: [...imageProviders.keys()],
      audio: [...audioProviders.keys()],
      video: [...videoProviders.keys()],
    };
  },
};
