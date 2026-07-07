import { getSegmentation } from './getSegmentation';
import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getViewportSegmentations(viewportId, type) {
    const viewportRepresentations = getViewportSegmentationRepresentations(viewportId);
    const segmentations = viewportRepresentations.map((representation) => {
        if (type && representation.type === type) {
            return getSegmentation(representation.segmentationId);
        }
        return getSegmentation(representation.segmentationId);
    });
    const filteredSegmentations = segmentations.filter((segmentation) => segmentation !== undefined);
    return filteredSegmentations;
}
export function getViewportSegmentationRepresentations(viewportId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    const state = segmentationStateManager.getState();
    const viewportRepresentations = state.viewportSegRepresentations[viewportId];
    return viewportRepresentations;
}
