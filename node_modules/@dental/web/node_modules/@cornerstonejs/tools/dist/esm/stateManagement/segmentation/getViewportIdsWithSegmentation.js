import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getViewportIdsWithSegmentation(segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    const state = segmentationStateManager.getState();
    const viewportSegRepresentations = state.viewportSegRepresentations;
    const viewportIdsWithSegmentation = Object.entries(viewportSegRepresentations)
        .filter(([, viewportSegmentations]) => viewportSegmentations.some((segRep) => segRep.segmentationId === segmentationId))
        .map(([viewportId]) => viewportId);
    return viewportIdsWithSegmentation;
}
