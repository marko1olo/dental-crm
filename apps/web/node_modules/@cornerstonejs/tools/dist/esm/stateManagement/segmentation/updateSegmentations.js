import { defaultSegmentationStateManager } from './SegmentationStateManager';
import { triggerSegmentationModified } from './triggerSegmentationEvents';
export function updateSegmentations(segmentationUpdateArray, suppressEvents) {
    const segmentationStateManager = defaultSegmentationStateManager;
    segmentationUpdateArray.forEach((segmentationUpdate) => {
        segmentationStateManager.updateSegmentation(segmentationUpdate.segmentationId, segmentationUpdate.payload);
        if (!suppressEvents) {
            triggerSegmentationModified(segmentationUpdate.segmentationId);
        }
    });
}
