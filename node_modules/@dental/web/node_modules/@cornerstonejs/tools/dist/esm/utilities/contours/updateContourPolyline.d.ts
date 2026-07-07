import type { Types } from '@cornerstonejs/core';
import type { ContourAnnotation } from '../../types';
import type { ContourWindingDirection } from '../../types/ContourAnnotation';
export default function updateContourPolyline(annotation: ContourAnnotation, polylineData: {
    points: Types.Point2[];
    closed?: boolean;
    targetWindingDirection?: ContourWindingDirection;
}, transforms: {
    canvasToWorld: (point: Types.Point2) => Types.Point3;
    worldToCanvas: (point: Types.Point3) => Types.Point2;
}, options?: {
    updateWindingDirection?: boolean;
    decimate?: {
        enabled?: boolean;
        epsilon?: number;
    };
}): void;
