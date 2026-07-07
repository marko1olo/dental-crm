export default function areLineSegmentsIntersecting(p1, q1, p2, q2) {
    let result = false;
    const line1MinX = p1[0] < q1[0] ? p1[0] : q1[0];
    const line1MinY = p1[1] < q1[1] ? p1[1] : q1[1];
    const line1MaxX = p1[0] > q1[0] ? p1[0] : q1[0];
    const line1MaxY = p1[1] > q1[1] ? p1[1] : q1[1];
    const line2MinX = p2[0] < q2[0] ? p2[0] : q2[0];
    const line2MinY = p2[1] < q2[1] ? p2[1] : q2[1];
    const line2MaxX = p2[0] > q2[0] ? p2[0] : q2[0];
    const line2MaxY = p2[1] > q2[1] ? p2[1] : q2[1];
    if (line1MinX > line2MaxX ||
        line1MaxX < line2MinX ||
        line1MinY > line2MaxY ||
        line1MaxY < line2MinY) {
        return false;
    }
    const orient = [
        orientation(p1, q1, p2),
        orientation(p1, q1, q2),
        orientation(p2, q2, p1),
        orientation(p2, q2, q1),
    ];
    if (orient[0] !== orient[1] && orient[2] !== orient[3]) {
        return true;
    }
    if (orient[0] === 0 && onSegment(p1, p2, q1)) {
        result = true;
    }
    else if (orient[1] === 0 && onSegment(p1, q2, q1)) {
        result = true;
    }
    else if (orient[2] === 0 && onSegment(p2, p1, q2)) {
        result = true;
    }
    else if (orient[3] === 0 && onSegment(p2, q1, q2)) {
        result = true;
    }
    return result;
}
function orientation(p, q, r) {
    const orientationValue = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
    if (orientationValue === 0) {
        return 0;
    }
    return orientationValue > 0 ? 1 : 2;
}
function onSegment(p, q, r) {
    if (q[0] <= Math.max(p[0], r[0]) &&
        q[0] >= Math.min(p[0], r[0]) &&
        q[1] <= Math.max(p[1], r[1]) &&
        q[1] >= Math.min(p[1], r[1])) {
        return true;
    }
    return false;
}
