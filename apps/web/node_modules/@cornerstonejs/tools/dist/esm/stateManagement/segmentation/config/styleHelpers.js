import { getSegmentations } from '../getSegmentations';
import { getViewportSegmentations } from '../getViewportSegmentations';
import { triggerSegmentationRender } from '../SegmentationRenderingEngine';
import { segmentationStyle } from '../SegmentationStyle';
import { triggerSegmentationRepresentationModified } from '../triggerSegmentationEvents';
function getStyle(specifier) {
    return segmentationStyle.getStyle(specifier);
}
function setStyle(specifier, style, merge) {
    segmentationStyle.setStyle(specifier, style, merge);
    if (!specifier.viewportId && !specifier.segmentationId) {
        const segmentations = getSegmentations();
        segmentations.forEach((segmentation) => {
            triggerSegmentationRender(segmentation.segmentationId);
        });
    }
    triggerSegmentationRepresentationModified(specifier.viewportId, specifier.segmentationId, specifier.type);
}
function setRenderInactiveSegmentations(viewportId, renderInactiveSegmentations) {
    segmentationStyle.setRenderInactiveSegmentations(viewportId, renderInactiveSegmentations);
    triggerSegmentationRender(viewportId);
    const segmentations = getViewportSegmentations(viewportId);
    segmentations.forEach((segmentation) => {
        triggerSegmentationRepresentationModified(viewportId, segmentation.segmentationId);
    });
}
function getRenderInactiveSegmentations(viewportId) {
    return segmentationStyle.getRenderInactiveSegmentations(viewportId);
}
function resetToGlobalStyle() {
    segmentationStyle.resetToGlobalStyle();
    triggerSegmentationRender();
}
function hasCustomStyle(specifier) {
    return segmentationStyle.hasCustomStyle(specifier);
}
export { getStyle, setStyle, setRenderInactiveSegmentations, getRenderInactiveSegmentations, resetToGlobalStyle, hasCustomStyle, };
