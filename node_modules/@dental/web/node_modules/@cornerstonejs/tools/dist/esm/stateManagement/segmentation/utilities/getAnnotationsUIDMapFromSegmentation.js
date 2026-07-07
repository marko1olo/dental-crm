import { getSegmentation } from '../getSegmentation';
export function getAnnotationsUIDMapFromSegmentation(segmentationId) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        return;
    }
    const contourRepresentationData = segmentation.representationData
        ?.Contour;
    if (!contourRepresentationData) {
        return;
    }
    const { annotationUIDsMap } = contourRepresentationData;
    if (!annotationUIDsMap) {
        return;
    }
    return annotationUIDsMap;
}
