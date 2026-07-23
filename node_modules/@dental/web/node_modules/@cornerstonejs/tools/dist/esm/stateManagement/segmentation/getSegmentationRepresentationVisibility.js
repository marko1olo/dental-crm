import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getSegmentationRepresentationVisibility(viewportId, specifier) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getSegmentationRepresentationVisibility(viewportId, specifier);
}
