import * as annotationState from '../../../stateManagement/annotation';
export default function updateChildInterpolationUID(annotation) {
    const { parentAnnotationUID, annotationUID } = annotation;
    if (!parentAnnotationUID) {
        return annotation.interpolationUID;
    }
    const parentAnnotation = annotationState.state.getAnnotation(parentAnnotationUID);
    const { interpolationUID } = parentAnnotation;
    const index = parentAnnotation.childAnnotationUIDs.indexOf(annotationUID);
    annotation.interpolationUID = `${interpolationUID}-${index}`;
    return annotation.interpolationUID;
}
