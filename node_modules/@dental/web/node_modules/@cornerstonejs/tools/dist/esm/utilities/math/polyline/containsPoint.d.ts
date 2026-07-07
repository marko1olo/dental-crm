import type { Types } from '@cornerstonejs/core';
export default function containsPoint(polyline: Types.Point2[], point: Types.Point2, options?: {
    closed?: boolean;
    holes?: Types.Point2[][];
}): boolean;
