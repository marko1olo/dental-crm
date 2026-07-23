import type { Types } from '@cornerstonejs/core';
export default function getClosestLineSegmentIntersection(points: Types.Point2[], p1: Types.Point2, q1: Types.Point2, closed?: boolean): {
    segment: Types.Point2;
    distance: number;
} | undefined;
