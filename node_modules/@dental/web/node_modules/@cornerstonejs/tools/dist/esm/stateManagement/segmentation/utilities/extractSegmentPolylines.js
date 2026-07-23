import { getSegmentation } from '../getSegmentation';
import { convertContourPolylineToCanvasSpace } from '../../../utilities/contourSegmentation';
import { getViewportsAssociatedToSegmentation, getViewportWithMatchingViewPlaneNormal, } from './getViewportAssociatedToSegmentation';
import { getPolylinesMap } from './getPolylineMap';
import { getAnnotation } from '../../annotation/annotationState';
export function extractSegmentPolylines(segmentationId, segmentIndex) {
    const viewports = getViewportsAssociatedToSegmentation(segmentationId);
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        return;
    }
    if (!segmentation.representationData.Contour) {
        return;
    }
    const contourRepresentationData = segmentation.representationData
        .Contour;
    const { annotationUIDsMap } = contourRepresentationData;
    if (!annotationUIDsMap) {
        return;
    }
    if (!annotationUIDsMap.get(segmentIndex)) {
        return;
    }
    const polyLinesMap = getPolylinesMap(contourRepresentationData, segmentIndex);
    if (!polyLinesMap) {
        return;
    }
    const keys = Array.from(polyLinesMap?.keys());
    const polylinesCanvasMap = new Map();
    for (const key of keys) {
        const annotation = getAnnotation(key);
        const viewport = getViewportWithMatchingViewPlaneNormal(viewports, annotation);
        polylinesCanvasMap.set(key, convertContourPolylineToCanvasSpace(polyLinesMap.get(key), viewport));
    }
    return polylinesCanvasMap;
}
