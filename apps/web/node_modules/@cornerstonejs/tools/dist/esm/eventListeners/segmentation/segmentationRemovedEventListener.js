import { getAllAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
const segmentationRemovedListener = function (evt) {
    const { segmentationId } = evt.detail;
    const annotationsToRemove = getAllAnnotations().filter((annotation) => segmentationId ===
        annotation?.data?.segmentation
            ?.segmentationId);
    annotationsToRemove.forEach((annotation) => {
        removeAnnotation(annotation.annotationUID);
    });
};
export default segmentationRemovedListener;
