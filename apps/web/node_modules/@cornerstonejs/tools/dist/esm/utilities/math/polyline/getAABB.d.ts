import type { Types } from '@cornerstonejs/core';
export default function getAABB(polyline: Types.Point2[] | Types.Point3[] | number[], options?: {
    numDimensions: number;
}): Types.AABB2 | Types.AABB3;
