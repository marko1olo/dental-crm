import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
export function removeContourSegmentationAnnotation(annotation) {
    if (!annotation.data.segmentation) {
        throw new Error('removeContourSegmentationAnnotation: annotation does not have a segmentation data');
    }
    const { segmentationId, segmentIndex } = annotation.data.segmentation;
    const segmentation = getSegmentation(segmentationId);
    const { annotationUIDsMap } = segmentation?.representationData.Contour || {};
    const annotationsUIDsSet = annotationUIDsMap?.get(segmentIndex);
    if (!annotationsUIDsSet) {
        return;
    }
    annotationsUIDsSet.delete(annotation.annotationUID);
    if (!annotationsUIDsSet.size) {
        annotationUIDsMap.delete(segmentIndex);
    }
}
