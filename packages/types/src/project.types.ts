export type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'published' | 'archived';
export type IdeaStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ScriptStatus = 'draft' | 'processing' | 'completed' | 'failed';
export type CutStatus = 'assembling' | 'rendering' | 'completed' | 'failed';
export type CampaignStatus = 'draft' | 'generating' | 'ready' | 'active' | 'paused';
export type AssetType =
  | 'image' | 'audio' | 'video' | 'document'
  | 'storyboard_frame' | 'character_reference' | 'voice_track'
  | 'video_segment' | 'final_cut' | 'thumbnail' | 'trailer';

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface DialogueLine {
  characterId: string;
  line: string;
  direction?: string;
}
