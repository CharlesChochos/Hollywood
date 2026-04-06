import { describe, it, expect, beforeEach } from 'vitest';
import { providerRegistry } from '../registry';

describe('providerRegistry', () => {
  it('has mock-text provider registered by default', () => {
    const provider = providerRegistry.getText('mock-text');
    expect(provider.name).toBe('mock-text');
  });

  it('has mock-image provider registered by default', () => {
    const provider = providerRegistry.getImage('mock-image');
    expect(provider.name).toBe('mock-image');
  });

  it('has mock-audio provider registered by default', () => {
    const provider = providerRegistry.getAudio('mock-audio');
    expect(provider.name).toBe('mock-audio');
  });

  it('has mock-video provider registered by default', () => {
    const provider = providerRegistry.getVideo('mock-video');
    expect(provider.name).toBe('mock-video');
  });

  it('throws for unregistered text provider', () => {
    expect(() => providerRegistry.getText('nonexistent')).toThrow(
      'Text provider "nonexistent" not registered',
    );
  });

  it('throws for unregistered image provider', () => {
    expect(() => providerRegistry.getImage('nonexistent')).toThrow(
      'Image provider "nonexistent" not registered',
    );
  });

  it('resolveText returns a provider', () => {
    const provider = providerRegistry.resolveText();
    expect(provider).toBeDefined();
    expect(provider.name).toBeTruthy();
  });

  it('resolveImage returns a provider', () => {
    const provider = providerRegistry.resolveImage();
    expect(provider).toBeDefined();
  });

  it('resolveAudio returns a provider', () => {
    const provider = providerRegistry.resolveAudio();
    expect(provider).toBeDefined();
  });

  it('resolveVideo returns mock-video (no real video provider)', () => {
    const provider = providerRegistry.resolveVideo();
    expect(provider.name).toBe('mock-video');
  });

  it('listProviders returns all categories', () => {
    const providers = providerRegistry.listProviders();
    expect(providers.text).toContain('mock-text');
    expect(providers.image).toContain('mock-image');
    expect(providers.audio).toContain('mock-audio');
    expect(providers.video).toContain('mock-video');
  });

  it('registers a custom text provider', () => {
    const custom = {
      name: 'custom-text',
      generateText: async () => 'custom',
      async *streamText() { yield 'custom'; },
    };
    providerRegistry.registerText(custom);
    expect(providerRegistry.getText('custom-text')).toBe(custom);
    expect(providerRegistry.listProviders().text).toContain('custom-text');
  });
});
