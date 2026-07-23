import { point } from '../utilities/math';
export const distancePointToContour = (viewport, annotation, coords) => {
    if (!annotation?.data?.contour?.polyline?.length) {
        return;
    }
    const { polyline } = annotation.data.contour;
    const { length } = polyline;
    let distance = Infinity;
    for (let i = 0; i < length; i++) {
        const canvasPoint = viewport.worldToCanvas(polyline[i]);
        const distanceToPoint = point.distanceToPoint(canvasPoint, coords);
        distance = Math.min(distance, distanceToPoint);
    }
    if (distance === Infinity || isNaN(distance)) {
        return;
    }
    return distance;
};
