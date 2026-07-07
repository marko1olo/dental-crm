import { defaultSegmentationStateManager } from './SegmentationStateManager';
import { triggerSegmentationModified } from './triggerSegmentationEvents';
import normalizeSegmentationInput from './helpers/normalizeSegmentationInput';
export function addSegmentations(segmentationInputArray, suppressEvents) {
    const segmentationStateManager = defaultSegmentationStateManager;
    segmentationInputArray.forEach((segmentationInput) => {
        const segmentation = normalizeSegmentationInput(segmentationInput);
        segmentationStateManager.addSegmentation(segmentation);
        if (!suppressEvents) {
            triggerSegmentationModified(segmentation.segmentationId);
        }
    });
}
export default addSegmentations;
