import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function setSegmentationRepresentationVisibility(viewportId, specifier, visible) {
    const segmentationStateManager = defaultSegmentationStateManager;
    segmentationStateManager.setSegmentationRepresentationVisibility(viewportId, specifier, visible);
}
