import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function setActiveSegmentation(viewportId, segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    segmentationStateManager.setActiveSegmentation(viewportId, segmentationId);
}
