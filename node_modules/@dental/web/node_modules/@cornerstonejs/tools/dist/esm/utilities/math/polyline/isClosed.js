import { glMatrix } from 'gl-matrix';
import { distanceToPointSquared } from '../point';
export default function isClosed(polyline) {
    if (polyline.length < 3) {
        return false;
    }
    const numPolylinePoints = polyline.length;
    const firstPoint = polyline[0];
    const lastPoint = polyline[numPolylinePoints - 1];
    const distFirstToLastPoints = distanceToPointSquared(firstPoint, lastPoint);
    return glMatrix.equals(0, distFirstToLastPoints);
}
