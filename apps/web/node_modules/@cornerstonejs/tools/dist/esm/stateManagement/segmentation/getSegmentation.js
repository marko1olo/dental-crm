import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getSegmentation(segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getSegmentation(segmentationId);
}
