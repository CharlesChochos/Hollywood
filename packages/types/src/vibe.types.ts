export type ArtStyle = 'pixar' | 'anime' | 'watercolor' | 'realistic' | 'comic' | 'custom';
export type ColorGrade = 'noir' | 'vibrant' | 'pastel' | 'muted' | 'custom';
export type LightingMood = 'natural' | 'dramatic' | 'soft' | 'neon' | 'golden_hour';
export type CameraMovement = 'static' | 'handheld' | 'steady' | 'dynamic';
export type CameraAngle = 'eye_level' | 'low_angle' | 'high_angle' | 'dutch';

export interface VibeSettings {
  // Pacing
  pacing: number;             // 0 (glacial) to 100 (frenetic)
  cutFrequency: number;       // 0 (long takes) to 100 (rapid cuts)

  // Visual
  colorGrade: ColorGrade;
  colorTemperature: number;   // 0 (cool) to 100 (warm)
  saturation: number;         // 0 to 100
  contrast: number;           // 0 to 100

  // Art Style
  artStyle: ArtStyle;
  artStyleCustomPrompt: string;

  // Lighting
  lightingMood: LightingMood;

  // Camera
  cameraMovement: CameraMovement;
  cameraAnglePreference: CameraAngle;

  // Emotional
  emotionalIntensity: number; // 0 (subtle) to 100 (melodramatic)
  dialoguePace: number;       // 0 (contemplative) to 100 (snappy)
  musicIntensity: number;     // 0 (ambient) to 100 (bombastic)
}

export const DEFAULT_VIBE_SETTINGS: VibeSettings = {
  pacing: 50,
  cutFrequency: 50,
  colorGrade: 'vibrant',
  colorTemperature: 50,
  saturation: 60,
  contrast: 50,
  artStyle: 'pixar',
  artStyleCustomPrompt: '',
  lightingMood: 'natural',
  cameraMovement: 'steady',
  cameraAnglePreference: 'eye_level',
  emotionalIntensity: 50,
  dialoguePace: 50,
  musicIntensity: 50,
};
