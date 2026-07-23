import { vec2 } from 'gl-matrix';
import areLineSegmentsIntersecting from './areLineSegmentsIntersecting';
export default function getClosestLineSegmentIntersection(points, p1, q1, closed = true) {
    let initialQ2Index;
    let p2Index;
    if (closed) {
        p2Index = points.length - 1;
        initialQ2Index = 0;
    }
    else {
        p2Index = 0;
        initialQ2Index = 1;
    }
    const intersections = [];
    for (let q2Index = initialQ2Index; q2Index < points.length; q2Index++) {
        const p2 = points[p2Index];
        const q2 = points[q2Index];
        if (areLineSegmentsIntersecting(p1, q1, p2, q2)) {
            intersections.push([p2Index, q2Index]);
        }
        p2Index = q2Index;
    }
    if (intersections.length === 0) {
        return;
    }
    const distances = [];
    intersections.forEach((intersection) => {
        const intersectionPoints = [
            points[intersection[0]],
            points[intersection[1]],
        ];
        const midpoint = [
            (intersectionPoints[0][0] + intersectionPoints[1][0]) / 2,
            (intersectionPoints[0][1] + intersectionPoints[1][1]) / 2,
        ];
        distances.push(vec2.distance(midpoint, p1));
    });
    const minDistance = Math.min(...distances);
    const indexOfMinDistance = distances.indexOf(minDistance);
    return {
        segment: intersections[indexOfMinDistance],
        distance: minDistance,
    };
}
