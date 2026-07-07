import { utilities as csUtils } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
const { isEqual } = csUtils;
export default function findHandlePolylineIndex(annotation, handleIndex) {
    const { polyline } = annotation.data.contour;
    const { points } = annotation.data.handles;
    const { length } = points;
    if (handleIndex === length) {
        return polyline.length;
    }
    if (handleIndex < 0) {
        handleIndex = (handleIndex + length) % length;
    }
    if (handleIndex === 0) {
        return 0;
    }
    const handle = points[handleIndex];
    const index = polyline.findIndex((point) => isEqual(handle, point));
    if (index !== -1) {
        return index;
    }
    let closestDistance = Infinity;
    return polyline.reduce((closestIndex, point, testIndex) => {
        const distance = vec3.squaredDistance(point, handle);
        if (distance < closestDistance) {
            closestDistance = distance;
            return testIndex;
        }
        return closestIndex;
    }, -1);
}
