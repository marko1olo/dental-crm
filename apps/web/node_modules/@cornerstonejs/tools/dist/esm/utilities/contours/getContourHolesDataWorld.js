import { getAnnotation } from '../../stateManagement/annotation/annotationState';
export default function getContourHolesDataWorld(annotation) {
    const childAnnotationUIDs = annotation.childAnnotationUIDs ?? [];
    return childAnnotationUIDs.map((uid) => getAnnotation(uid).data.contour.polyline);
}
