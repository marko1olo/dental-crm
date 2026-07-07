import type { Types } from '@cornerstonejs/core';
export declare function generateConvexHullFromContour(contour: Array<Types.Point2>): {
    simplified: Types.Point2[];
    hull: Types.Point2[];
};
