import { getAnnotation } from '../../annotation/annotationState';
import AnnotationTool from '../../../tools/base/AnnotationTool';
import { getAnnotationsUIDMapFromSegmentation, removeCompleteContourAnnotation, } from '../utilities';
import { isContourSegmentationAnnotation } from '../../../utilities/contourSegmentation';
export function removeContourSegmentAnnotations(segmentationId, segmentIndex, options) {
    const annotationUIDsMap = getAnnotationsUIDMapFromSegmentation(segmentationId);
    if (!annotationUIDsMap) {
        return;
    }
    const annotationUIDsSet = annotationUIDsMap.get(segmentIndex);
    if (!annotationUIDsSet) {
        return;
    }
    const annotationUIDs = Array.from(annotationUIDsSet);
    const annotations = [];
    for (const annotationUID of annotationUIDs) {
        const annotation = getAnnotation(annotationUID);
        if (isContourSegmentationAnnotation(annotation)) {
            annotations.push(annotation);
        }
    }
    if (annotations.length === 0) {
        return;
    }
    for (const annotation of annotations) {
        if (annotation.parentAnnotationUID) {
            continue;
        }
        if (options?.recordHistory) {
            AnnotationTool.createAnnotationMemo(null, annotation, {
                deleting: true,
            });
        }
        removeCompleteContourAnnotation(annotation);
    }
}
