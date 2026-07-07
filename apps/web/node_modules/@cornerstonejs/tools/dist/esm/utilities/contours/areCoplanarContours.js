import { glMatrix, vec3 } from 'gl-matrix';
export default function areCoplanarContours(firstAnnotation, secondAnnotation) {
    const { viewPlaneNormal: firstViewPlaneNormal } = firstAnnotation.metadata;
    const { viewPlaneNormal: secondViewPlaneNormal } = secondAnnotation.metadata;
    const dot = vec3.dot(firstViewPlaneNormal, secondViewPlaneNormal);
    const parallelPlanes = glMatrix.equals(1, Math.abs(dot));
    if (!parallelPlanes) {
        return false;
    }
    const { polyline: firstPolyline } = firstAnnotation.data.contour;
    const { polyline: secondPolyline } = secondAnnotation.data.contour;
    const firstDistance = vec3.dot(firstViewPlaneNormal, firstPolyline[0]);
    const secondDistance = vec3.dot(firstViewPlaneNormal, secondPolyline[0]);
    return glMatrix.equals(firstDistance, secondDistance);
}
