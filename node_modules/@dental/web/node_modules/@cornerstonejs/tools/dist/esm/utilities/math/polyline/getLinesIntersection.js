import * as mathLine from '../line';
const PARALLEL_LINES_TOLERANCE = 1e-2;
export default function getLinesIntersection(p1, q1, p2, q2) {
    const diffQ1P1 = [q1[0] - p1[0], q1[1] - p1[1]];
    const diffQ2P2 = [q2[0] - p2[0], q2[1] - p2[1]];
    const denominator = diffQ2P2[1] * diffQ1P1[0] - diffQ2P2[0] * diffQ1P1[1];
    const absDenominator = denominator >= 0 ? denominator : -denominator;
    if (absDenominator < PARALLEL_LINES_TOLERANCE) {
        const line1AABB = [
            p1[0] < q1[0] ? p1[0] : q1[0],
            p1[0] > q1[0] ? p1[0] : q1[0],
            p1[1] < q1[1] ? p1[1] : q1[1],
            p1[1] > q1[1] ? p1[1] : q1[1],
        ];
        const line2AABB = [
            p2[0] < q2[0] ? p2[0] : q2[0],
            p2[0] > q2[0] ? p2[0] : q2[0],
            p2[1] < q2[1] ? p2[1] : q2[1],
            p2[1] > q2[1] ? p2[1] : q2[1],
        ];
        const aabbIntersects = line1AABB[0] <= line2AABB[1] &&
            line1AABB[1] >= line2AABB[0] &&
            line1AABB[2] <= line2AABB[3] &&
            line1AABB[3] >= line2AABB[2];
        if (!aabbIntersects) {
            return;
        }
        const overlap = mathLine.isPointOnLineSegment(p1, q1, p2) ||
            mathLine.isPointOnLineSegment(p1, q1, q2) ||
            mathLine.isPointOnLineSegment(p2, q2, p1);
        if (!overlap) {
            return;
        }
        const minX = line1AABB[0] > line2AABB[0] ? line1AABB[0] : line2AABB[0];
        const maxX = line1AABB[1] < line2AABB[1] ? line1AABB[1] : line2AABB[1];
        const minY = line1AABB[2] > line2AABB[2] ? line1AABB[2] : line2AABB[2];
        const maxY = line1AABB[3] < line2AABB[3] ? line1AABB[3] : line2AABB[3];
        const midX = (minX + maxX) * 0.5;
        const midY = (minY + maxY) * 0.5;
        return [midX, midY];
    }
    let a = p1[1] - p2[1];
    let b = p1[0] - p2[0];
    const numerator1 = diffQ2P2[0] * a - diffQ2P2[1] * b;
    const numerator2 = diffQ1P1[0] * a - diffQ1P1[1] * b;
    a = numerator1 / denominator;
    b = numerator2 / denominator;
    const resultX = p1[0] + a * diffQ1P1[0];
    const resultY = p1[1] + a * diffQ1P1[1];
    return [resultX, resultY];
}
