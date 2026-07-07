import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getSegmentationRepresentations(viewportId, specifier = {}) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getSegmentationRepresentations(viewportId, specifier);
}
export function getSegmentationRepresentation(viewportId, specifier) {
    const segmentationStateManager = defaultSegmentationStateManager;
    if (!specifier.segmentationId || !specifier.type) {
        throw new Error('getSegmentationRepresentation: No segmentationId or type provided, you need to provide at least one of them');
    }
    const representations = segmentationStateManager.getSegmentationRepresentations(viewportId, specifier);
    return representations?.[0];
}
export function getSegmentationRepresentationsBySegmentationId(segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getSegmentationRepresentationsBySegmentationId(segmentationId);
}
