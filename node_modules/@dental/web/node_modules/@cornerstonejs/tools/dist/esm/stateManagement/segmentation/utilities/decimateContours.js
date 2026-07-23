import { getAnnotation, invalidateAnnotation, } from '../../annotation/annotationState';
import { getSegmentation } from '../getSegmentation';
import { extractSegmentPolylines } from './extractSegmentPolylines';
import decimate from '../../../utilities/math/polyline/decimate';
import { getViewportsAssociatedToSegmentation, getViewportWithMatchingViewPlaneNormal, } from './getViewportAssociatedToSegmentation';
export default function decimateContours(segmentationId, segmentIndex, options = { epsilon: 0.1 }) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        console.warn(`Invalid segmentation given ${segmentationId}`);
        return;
    }
    if (!segmentation.representationData.Contour) {
        console.warn(`No contour representation found for segmentation ${segmentationId}`);
        return;
    }
    const viewports = getViewportsAssociatedToSegmentation(segmentationId);
    if (!viewports) {
        console.warn('No viewport associated to the segmentation found');
        return;
    }
    const polylinesCanvasMap = extractSegmentPolylines(segmentationId, segmentIndex);
    if (!polylinesCanvasMap) {
        console.warn(`Error extracting contour data from segment ${segmentIndex} in segmentation ${segmentationId}`);
        return;
    }
    const keys = Array.from(polylinesCanvasMap?.keys());
    for (const annotationUID of keys) {
        const annotation = getAnnotation(annotationUID);
        if (!annotation) {
            continue;
        }
        const polylineCanvas = polylinesCanvasMap.get(annotationUID);
        const decimatedPolyline2D = decimate(polylineCanvas, options.epsilon);
        const viewport = getViewportWithMatchingViewPlaneNormal(viewports, annotation);
        if (viewport) {
            annotation.data.contour.polyline = decimatedPolyline2D.map((point2D) => viewport.canvasToWorld(point2D));
            invalidateAnnotation(annotation);
        }
    }
}
