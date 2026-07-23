import { utilities } from '@cornerstonejs/core';
import { vec2 } from 'gl-matrix';
export const EPSILON = 1e-7;
export function vec2CrossZ(a, b) {
    return a[0] * b[1] - a[1] * b[0];
}
export function pointsAreEqual(p1, p2) {
    return utilities.isEqual(p1, p2, EPSILON);
}
export function robustSegmentIntersection(p1, p2, q1, q2) {
    const r = vec2.subtract(vec2.create(), p2, p1);
    const s = vec2.subtract(vec2.create(), q2, q1);
    const rxs = vec2CrossZ(r, s);
    const qmp = vec2.subtract(vec2.create(), q1, p1);
    const qmpxr = vec2CrossZ(qmp, r);
    if (Math.abs(rxs) < EPSILON) {
        if (Math.abs(qmpxr) < EPSILON) {
            const rDotR = vec2.dot(r, r);
            const sDotS = vec2.dot(s, s);
            if (rDotR < EPSILON || sDotS < EPSILON) {
                if (pointsAreEqual(p1, q1) || pointsAreEqual(p1, q2)) {
                    return p1;
                }
                if (pointsAreEqual(p2, q1) || pointsAreEqual(p2, q2)) {
                    return p2;
                }
                return null;
            }
            const t0 = vec2.dot(vec2.subtract(vec2.create(), q1, p1), r) / rDotR;
            const t1 = vec2.dot(vec2.subtract(vec2.create(), q2, p1), r) / rDotR;
            const u0 = vec2.dot(vec2.subtract(vec2.create(), p1, q1), s) / sDotS;
            const u1 = vec2.dot(vec2.subtract(vec2.create(), p2, q1), s) / sDotS;
            const isInRange = (t) => t >= -EPSILON && t <= 1 + EPSILON;
            if (isInRange(t0)) {
                const projectedPoint = vec2.scaleAndAdd(vec2.create(), p1, r, t0);
                if (pointsAreEqual(q1, projectedPoint)) {
                    return q1;
                }
            }
            if (isInRange(t1)) {
                const projectedPoint = vec2.scaleAndAdd(vec2.create(), p1, r, t1);
                if (pointsAreEqual(q2, projectedPoint)) {
                    return q2;
                }
            }
            if (isInRange(u0)) {
                const projectedPoint = vec2.scaleAndAdd(vec2.create(), q1, s, u0);
                if (pointsAreEqual(p1, projectedPoint)) {
                    return p1;
                }
            }
            if (isInRange(u1)) {
                const projectedPoint = vec2.scaleAndAdd(vec2.create(), q1, s, u1);
                if (pointsAreEqual(p2, projectedPoint)) {
                    return p2;
                }
            }
        }
        return null;
    }
    const t = vec2CrossZ(qmp, s) / rxs;
    const u = qmpxr / rxs;
    if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON) {
        return [p1[0] + t * r[0], p1[1] + t * r[1]];
    }
    return null;
}
export var PolylineNodeType;
(function (PolylineNodeType) {
    PolylineNodeType[PolylineNodeType["Vertex"] = 0] = "Vertex";
    PolylineNodeType[PolylineNodeType["Intersection"] = 1] = "Intersection";
})(PolylineNodeType || (PolylineNodeType = {}));
export var IntersectionDirection;
(function (IntersectionDirection) {
    IntersectionDirection[IntersectionDirection["Entering"] = 0] = "Entering";
    IntersectionDirection[IntersectionDirection["Exiting"] = 1] = "Exiting";
    IntersectionDirection[IntersectionDirection["Unknown"] = 2] = "Unknown";
})(IntersectionDirection || (IntersectionDirection = {}));
