import { StackViewport } from '@cornerstonejs/core';
import * as vec3 from 'gl-matrix/vec3';
export function moveAnnotationToViewPlane(annotation, viewport) {
    const { data } = annotation;
    const { points } = data.handles;
    const { focalPoint, viewPlaneNormal } = viewport.getCamera();
    const projectedDistance = vec3.dot(vec3.sub(vec3.create(), points[0], focalPoint), viewPlaneNormal);
    points.forEach((point) => {
        vec3.add(point, point, vec3.scale(vec3.create(), [-viewPlaneNormal[0], -viewPlaneNormal[1], -viewPlaneNormal[2]], projectedDistance));
    });
    if (viewport instanceof StackViewport) {
        annotation.metadata.referencedImageId = viewport.getCurrentImageId();
    }
    return annotation;
}
