import containsPoint from './containsPoint';
export default function containsPoints(polyline, points) {
    for (let i = 0, numPoint = points.length; i < numPoint; i++) {
        if (!containsPoint(polyline, points[i])) {
            return false;
        }
    }
    return true;
}
