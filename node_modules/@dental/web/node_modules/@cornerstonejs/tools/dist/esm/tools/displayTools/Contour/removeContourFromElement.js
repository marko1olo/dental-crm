import { getSegmentation } from '../../../stateManagement/segmentation/getSegmentation';
import { removeAnnotation } from '../../../stateManagement';
function removeContourFromElement(viewportId, segmentationId, removeFromCache = false) {
    const segmentation = getSegmentation(segmentationId);
    const { annotationUIDsMap } = segmentation.representationData.Contour;
    annotationUIDsMap.forEach((annotationSet) => {
        annotationSet.forEach((annotationUID) => {
            removeAnnotation(annotationUID);
        });
    });
}
export default removeContourFromElement;
