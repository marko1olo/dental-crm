const ORIENTATION_TOLERANCE = 1e-2;
export default function isPointOnLineSegment(lineStart, lineEnd, point) {
    const minX = lineStart[0] <= lineEnd[0] ? lineStart[0] : lineEnd[0];
    const maxX = lineStart[0] >= lineEnd[0] ? lineStart[0] : lineEnd[0];
    const minY = lineStart[1] <= lineEnd[1] ? lineStart[1] : lineEnd[1];
    const maxY = lineStart[1] >= lineEnd[1] ? lineStart[1] : lineEnd[1];
    const aabbContainsPoint = point[0] >= minX - ORIENTATION_TOLERANCE &&
        point[0] <= maxX + ORIENTATION_TOLERANCE &&
        point[1] >= minY - ORIENTATION_TOLERANCE &&
        point[1] <= maxY + ORIENTATION_TOLERANCE;
    if (!aabbContainsPoint) {
        return false;
    }
    const orientation = (lineEnd[1] - lineStart[1]) * (point[0] - lineEnd[0]) -
        (lineEnd[0] - lineStart[0]) * (point[1] - lineEnd[1]);
    const absOrientation = orientation >= 0 ? orientation : -orientation;
    return absOrientation <= ORIENTATION_TOLERANCE;
}
