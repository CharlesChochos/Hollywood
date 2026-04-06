import type { ImageGenerationProvider, ImageGenOptions } from '../../types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 1x1 pixel PNG placeholder (transparent)
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64',
);

// Generate a simple SVG placeholder with text
function generatePlaceholderSvg(text: string, width: number, height: number): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#1a1a2e"/>
    <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="8,4"/>
    <text x="50%" y="40%" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="16" font-weight="bold">🎬 Mock Frame</text>
    <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">${text.slice(0, 40)}</text>
    <text x="50%" y="70%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="10">${width}x${height}</text>
  </svg>`;
  return Buffer.from(svg, 'utf-8');
}

export class MockImageProvider implements ImageGenerationProvider {
  readonly name = 'mock-image';

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<Buffer> {
    await delay(2000);
    const width = options?.width ?? 1024;
    const height = options?.height ?? 768;
    return generatePlaceholderSvg(prompt, width, height);
  }
}
