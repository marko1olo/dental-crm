import { getAnnotation } from '../../annotation/annotationState';
import { getSegmentation } from '../getSegmentation';
import { extractSegmentPolylines } from './extractSegmentPolylines';
import findIslands from '../../../utilities/contours/findIslands';
import { removeCompleteContourAnnotation } from './removeCompleteContourAnnotation';
export default function removeContourIslands(segmentationId, segmentIndex, options = { threshold: 3 }) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        console.warn(`Invalid segmentation given ${segmentationId}`);
        return;
    }
    if (!segmentation.representationData.Contour) {
        console.warn(`No contour representation found for segmentation ${segmentationId}`);
        return;
    }
    const polylinesCanvasMap = extractSegmentPolylines(segmentationId, segmentIndex);
    if (!polylinesCanvasMap) {
        console.warn(`Error extracting contour data from segment ${segmentIndex} in segmentation ${segmentationId}`);
        return;
    }
    const keys = Array.from(polylinesCanvasMap?.keys());
    const polylines = keys.map((key) => polylinesCanvasMap.get(key));
    const islands = findIslands(polylines, options.threshold);
    if (islands?.length > 0) {
        islands.forEach((index) => {
            const annotation = getAnnotation(keys[index]);
            removeCompleteContourAnnotation(annotation);
        });
    }
}
