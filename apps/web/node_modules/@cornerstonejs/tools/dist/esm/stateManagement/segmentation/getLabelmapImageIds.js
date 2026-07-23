import { getSegmentation } from './getSegmentation';
import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getLabelmapImageIds(segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    const segmentation = getSegmentation(segmentationId);
    return segmentationStateManager.getLabelmapImageIds(segmentation.representationData);
}
