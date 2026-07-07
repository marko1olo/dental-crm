function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}
export function angleFromCenter(center, point) {
    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return normalizeAngle(angle);
}
export function intervalFromPoints(center, pair) {
    const start = angleFromCenter(center, pair[0]);
    const end = angleFromCenter(center, pair[1]);
    return start < end ? [start, end] : [end, start];
}
export function mergeIntervals(intervals) {
    if (!intervals.length) {
        return [];
    }
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [intervals[0].slice()];
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        const current = intervals[i];
        if (current[0] <= last[1]) {
            last[1] = Math.max(last[1], current[1]);
        }
        else {
            merged.push(current.slice());
        }
    }
    return merged;
}
export function subtractIntervals(blocked, target) {
    const [T0, T1] = target;
    if (T1 <= T0) {
        return [];
    }
    const overlaps = blocked
        .map(([a, b]) => [Math.max(a, T0), Math.min(b, T1)])
        .filter(([a, b]) => b > a);
    if (overlaps.length === 0) {
        return [[T0, T1]];
    }
    overlaps.sort((p, q) => p[0] - q[0]);
    const merged = [];
    let [curA, curB] = overlaps[0];
    for (let i = 1; i < overlaps.length; i++) {
        const [a, b] = overlaps[i];
        if (a <= curB) {
            curB = Math.max(curB, b);
        }
        else {
            merged.push([curA, curB]);
            [curA, curB] = [a, b];
        }
    }
    merged.push([curA, curB]);
    const gaps = [];
    let cursor = T0;
    for (const [a, b] of merged) {
        if (a > cursor) {
            gaps.push([cursor, a]);
        }
        cursor = Math.max(cursor, b);
    }
    if (cursor < T1) {
        gaps.push([cursor, T1]);
    }
    return gaps;
}
export function clipInterval(inner, outerMerged) {
    const result = [];
    for (const out of outerMerged) {
        const start = Math.max(inner[0], out[0]);
        const end = Math.min(inner[1], out[1]);
        if (start < end) {
            result.push([start, end]);
        }
    }
    return result;
}
export function calculateInnerFanPercentage(center, outerFanPairs, innerFanPairs) {
    const outerIntervals = outerFanPairs.map((pair) => intervalFromPoints(center, pair));
    const mergedOuter = mergeIntervals(outerIntervals);
    const outerTotal = mergedOuter.reduce((sum, [a, b]) => sum + (b - a), 0);
    if (outerTotal === 0) {
        return 0;
    }
    const clippedInnerIntervals = [];
    for (const pair of innerFanPairs) {
        const innerInterval = intervalFromPoints(center, pair);
        const clipped = clipInterval(innerInterval, mergedOuter);
        clippedInnerIntervals.push(...clipped);
    }
    const mergedInner = mergeIntervals(clippedInnerIntervals);
    const innerTotal = mergedInner.reduce((sum, [a, b]) => sum + (b - a), 0);
    const percentage = (innerTotal / outerTotal) * 100;
    return Math.min(100, Math.max(0, percentage));
}
