import type { Types } from '@cornerstonejs/core';
import type { Annotation } from './AnnotationTypes';
export declare enum ContourWindingDirection {
    CounterClockwise = -1,
    Unknown = 0,
    Clockwise = 1
}
export type ContourAnnotationData = {
    data: {
        cachedStats?: Record<string, unknown>;
        polyline?: Types.Point3[];
        contour: {
            polyline: Types.Point3[];
            closed: boolean;
            windingDirection?: ContourWindingDirection;
            pointsManager?: Types.IPointsManager<Types.Point3>;
        };
    };
    onInterpolationComplete?: () => void;
};
export type ContourAnnotation = Annotation & ContourAnnotationData;
