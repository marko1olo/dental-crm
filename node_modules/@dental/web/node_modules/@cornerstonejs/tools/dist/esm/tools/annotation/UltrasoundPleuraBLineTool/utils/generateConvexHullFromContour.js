import * as math from '../../../../utilities/math';
export function generateConvexHullFromContour(contour) {
    const simplified = math.polyline.decimate(contour, 2);
    const hull = math.polyline.convexHull(simplified);
    return { simplified, hull };
}
