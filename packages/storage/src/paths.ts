export function scriptPath(projectId: string, scriptId: string, version: number): string {
  return `${projectId}/scripts/${scriptId}_v${version}.md`;
}

export function storyboardFramePath(projectId: string, sceneId: string, frameNumber: number, version: number): string {
  return `${projectId}/storyboard/${sceneId}/frame_${frameNumber}_v${version}.png`;
}

export function characterRefPath(projectId: string, characterId: string): string {
  return `${projectId}/characters/${characterId}/reference_sheet.png`;
}

export function voiceTrackPath(projectId: string, sceneId: string, characterId: string, lineNumber: number, version: number): string {
  return `${projectId}/voice/${sceneId}/${characterId}_line_${lineNumber}_v${version}.wav`;
}

export function videoSegmentPath(projectId: string, sceneId: string, version: number): string {
  return `${projectId}/video/${sceneId}/segment_v${version}.mp4`;
}

export function finalCutPath(projectId: string, version: number): string {
  return `${projectId}/final/cut_v${version}.mp4`;
}

export function marketingPath(projectId: string, subPath: string): string {
  return `${projectId}/marketing/${subPath}`;
}
