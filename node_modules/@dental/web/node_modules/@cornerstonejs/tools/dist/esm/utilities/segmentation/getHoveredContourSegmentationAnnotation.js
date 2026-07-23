import { getAnnotation } from '../../stateManagement';
import { getSegmentation } from '../../stateManagement/segmentation/segmentationState';
export function getHoveredContourSegmentationAnnotation(segmentationId) {
    const segmentation = getSegmentation(segmentationId);
    const { annotationUIDsMap } = segmentation.representationData.Contour;
    for (const [segmentIndex, annotationUIDs] of annotationUIDsMap.entries()) {
        const highlightedAnnotationUID = Array.from(annotationUIDs).find((annotationUID) => getAnnotation(annotationUID).highlighted);
        if (highlightedAnnotationUID) {
            return segmentIndex;
        }
    }
    return undefined;
}
