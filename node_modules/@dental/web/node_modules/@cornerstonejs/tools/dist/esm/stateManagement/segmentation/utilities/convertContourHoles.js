import { findContourHoles } from '../../../utilities/contours';
import { getAnnotation, clearParentAnnotation, } from '../../annotation/annotationState';
import { getSegmentation } from '../getSegmentation';
import { extractSegmentPolylines } from './extractSegmentPolylines';
export default function convertContourHoles(segmentationId, segmentIndex, targetSegmentationId, targetSegmentationIndex) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        console.warn(`Invalid segmentation given ${segmentationId}`);
        return;
    }
    if (!segmentation.representationData.Contour) {
        console.warn(`No contour representation found for segmentation ${segmentationId}`);
        return;
    }
    const { annotationUIDsMap } = segmentation?.representationData.Contour || {};
    if (!annotationUIDsMap) {
        console.warn(`No annotation map found for segmentation ${segmentationId}`);
        return;
    }
    const annotationsUIDsSet = annotationUIDsMap?.get(segmentIndex);
    if (!annotationsUIDsSet) {
        console.warn(`Segmentation index ${segmentIndex} has no annotations in segmentation ${segmentationId}`);
        return;
    }
    let targetUIDsSet;
    if (targetSegmentationId && typeof targetSegmentationIndex === 'number') {
        const targetSegmentation = getSegmentation(targetSegmentationId);
        if (!targetSegmentation) {
            console.warn(`Target segmentation ${targetSegmentationId} does not exist.`);
            return;
        }
        if (!targetSegmentation.representationData.Contour) {
            console.warn(`No contour representation found for target segmentation ${targetSegmentationId}`);
            return;
        }
        targetUIDsSet =
            targetSegmentation.representationData.Contour.annotationUIDsMap.get(targetSegmentationIndex);
        if (!targetUIDsSet) {
            targetUIDsSet = new Set();
            targetSegmentation.representationData.Contour.annotationUIDsMap.set(targetSegmentationIndex, targetUIDsSet);
        }
    }
    const polylinesCanvasMap = extractSegmentPolylines(segmentationId, segmentIndex);
    if (!polylinesCanvasMap) {
        console.warn(`Error extracting contour data from segment ${segmentIndex} in segmentation ${segmentationId}`);
        return;
    }
    const keys = Array.from(polylinesCanvasMap?.keys());
    const polylines = keys.map((key) => polylinesCanvasMap.get(key));
    const holeDetectionResults = findContourHoles(polylines);
    if (holeDetectionResults?.length > 0) {
        holeDetectionResults.forEach((hole) => {
            hole.holeIndexes.forEach((index) => {
                const annotation = getAnnotation(keys[index]);
                clearParentAnnotation(annotation);
                if (targetSegmentationId &&
                    typeof targetSegmentationIndex === 'number') {
                    targetUIDsSet.add(annotation.annotationUID);
                }
                else {
                    annotationsUIDsSet.add(annotation.annotationUID);
                }
            });
        });
    }
}
