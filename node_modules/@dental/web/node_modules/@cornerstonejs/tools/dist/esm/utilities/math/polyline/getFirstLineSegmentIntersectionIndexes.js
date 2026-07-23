import areLineSegmentsIntersecting from './areLineSegmentsIntersecting';
export default function getFirstLineSegmentIntersectionIndexes(points, p1, q1, closed = true) {
    let initialI;
    let j;
    if (closed) {
        j = points.length - 1;
        initialI = 0;
    }
    else {
        j = 0;
        initialI = 1;
    }
    for (let i = initialI; i < points.length; i++) {
        const p2 = points[j];
        const q2 = points[i];
        if (areLineSegmentsIntersecting(p1, q1, p2, q2)) {
            return [j, i];
        }
        j = i;
    }
}
