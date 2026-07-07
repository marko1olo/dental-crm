import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getStackSegmentationImageIdsForViewport(viewportId, segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getStackSegmentationImageIdsForViewport(viewportId, segmentationId);
}
