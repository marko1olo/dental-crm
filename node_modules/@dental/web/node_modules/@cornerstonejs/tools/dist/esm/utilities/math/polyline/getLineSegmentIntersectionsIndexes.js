import areLineSegmentsIntersecting from './areLineSegmentsIntersecting';
export default function getLineSegmentIntersectionsIndexes(polyline, p1, q1, closed = true) {
    const intersections = [];
    const numPoints = polyline.length;
    const maxI = numPoints - (closed ? 1 : 2);
    for (let i = 0; i <= maxI; i++) {
        const p2 = polyline[i];
        const j = i === numPoints - 1 ? 0 : i + 1;
        const q2 = polyline[j];
        if (areLineSegmentsIntersecting(p1, q1, p2, q2)) {
            intersections.push([i, j]);
        }
    }
    return intersections;
}
