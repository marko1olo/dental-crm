import { intersectLine } from '../../../../utilities/math/line';
function angleRad(center, p) {
    return Math.atan2(p[1] - center[1], p[0] - center[0]);
}
export function deriveFanGeometry(params) {
    const { P1, P2, P3, P4 } = params;
    const centerResult = intersectLine(P1, P2, P4, P3, true);
    if (!centerResult) {
        throw new Error('Fan edges appear parallel — no apex found');
    }
    const center = centerResult;
    let startAngle = angleRad(center, P1) * (180 / Math.PI);
    let endAngle = angleRad(center, P4) * (180 / Math.PI);
    if (endAngle <= startAngle) {
        const tempAngle = startAngle;
        startAngle = endAngle;
        endAngle = tempAngle;
    }
    const d1 = Math.hypot(P1[0] - center[0], P1[1] - center[1]);
    const d4 = Math.hypot(P4[0] - center[0], P4[1] - center[1]);
    const d2 = Math.hypot(P2[0] - center[0], P2[1] - center[1]);
    const d3 = Math.hypot(P3[0] - center[0], P3[1] - center[1]);
    const innerRadius = Math.min(d1, d4);
    const outerRadius = Math.max(d2, d3);
    return {
        center,
        startAngle,
        endAngle,
        innerRadius,
        outerRadius,
    };
}
