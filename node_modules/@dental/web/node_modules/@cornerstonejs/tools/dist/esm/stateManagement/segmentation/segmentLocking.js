import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
import { setAnnotationLocked } from '../annotation/annotationLocking';
import { triggerSegmentationModified } from './triggerSegmentationEvents';
import { getAnnotationsUIDMapFromSegmentation } from './utilities';
function _setContourSegmentationSegmentAnnotationsLocked(segmentation, segmentIndex, locked) {
    const annotationUIDsMap = getAnnotationsUIDMapFromSegmentation(segmentation.segmentationId);
    if (!annotationUIDsMap) {
        return;
    }
    const annotationUIDs = annotationUIDsMap.get(segmentIndex);
    if (!annotationUIDs) {
        return;
    }
    annotationUIDs.forEach((annotationUID) => {
        setAnnotationLocked(annotationUID, locked);
    });
}
function isSegmentIndexLocked(segmentationId, segmentIndex) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        throw new Error(`No segmentation state found for ${segmentationId}`);
    }
    const { segments } = segmentation;
    return segments[segmentIndex].locked;
}
function setSegmentIndexLocked(segmentationId, segmentIndex, locked = true) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        throw new Error(`No segmentation state found for ${segmentationId}`);
    }
    const { segments } = segmentation;
    segments[segmentIndex].locked = locked;
    if (segmentation?.representationData?.Contour) {
        _setContourSegmentationSegmentAnnotationsLocked(segmentation, segmentIndex, locked);
    }
    triggerSegmentationModified(segmentationId);
}
function getLockedSegmentIndices(segmentationId) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        throw new Error(`No segmentation state found for ${segmentationId}`);
    }
    const { segments } = segmentation;
    const lockedSegmentIndices = Object.keys(segments).filter((segmentIndex) => segments[segmentIndex].locked);
    return lockedSegmentIndices.map((segmentIndex) => parseInt(segmentIndex));
}
export { isSegmentIndexLocked, setSegmentIndexLocked, getLockedSegmentIndices };
