import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function updateLabelmapSegmentationImageReferences(viewportId, segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.updateLabelmapSegmentationImageReferences(viewportId, segmentationId);
}
