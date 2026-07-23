import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getActiveSegmentation(viewportId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getActiveSegmentation(viewportId);
}
