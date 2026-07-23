import { removeContourSegmentationAnnotation } from '../../../utilities/contourSegmentation';
import { clearParentAnnotation, removeAnnotation, } from '../../annotation/annotationState';
export function removeCompleteContourAnnotation(annotation) {
    if (!annotation) {
        return;
    }
    if (annotation.parentAnnotationUID) {
        clearParentAnnotation(annotation);
    }
    removeAnnotation(annotation.annotationUID);
    removeContourSegmentationAnnotation(annotation);
}
