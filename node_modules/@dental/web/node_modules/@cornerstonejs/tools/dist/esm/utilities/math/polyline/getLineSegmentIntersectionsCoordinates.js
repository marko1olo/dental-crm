import getLineSegmentIntersectionsIndexes from './getLineSegmentIntersectionsIndexes';
import getLinesIntersection from './getLinesIntersection';
export default function getLineSegmentIntersectionsCoordinates(points, p1, q1, closed = true) {
    const result = [];
    const polylineIndexes = getLineSegmentIntersectionsIndexes(points, p1, q1, closed);
    for (let i = 0; i < polylineIndexes.length; i++) {
        const p2 = points[polylineIndexes[i][0]];
        const q2 = points[polylineIndexes[i][1]];
        const intersection = getLinesIntersection(p1, q1, p2, q2);
        result.push(intersection);
    }
    return result;
}
