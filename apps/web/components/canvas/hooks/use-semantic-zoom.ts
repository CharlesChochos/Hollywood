import { useState, useCallback } from 'react';
import type { Viewport } from '@xyflow/react';

export type ZoomLevel = 'macro' | 'mid' | 'micro';

const ZOOM_THRESHOLDS = {
  macro: 0.35,  // < 0.35 = macro (story arc dots)
  mid: 0.75,    // 0.35-0.75 = mid (thumbnails + titles)
                // > 0.75 = micro (full detail: dialogue, frames)
};

export function useSemanticZoom() {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('mid');

  const onViewportChange = useCallback((viewport: Viewport) => {
    const zoom = viewport.zoom;
    if (zoom < ZOOM_THRESHOLDS.macro) {
      setZoomLevel('macro');
    } else if (zoom < ZOOM_THRESHOLDS.mid) {
      setZoomLevel('mid');
    } else {
      setZoomLevel('micro');
    }
  }, []);

  return { zoomLevel, onViewportChange };
}
