import type { Types } from '@cornerstonejs/core';
export interface ContourHoleDetectionResult {
    contourIndex: number;
    holeIndexes: number[];
}
export default function findContourHoles(polylines: Types.Point2[][]): ContourHoleDetectionResult[];
export { findContourHoles };
