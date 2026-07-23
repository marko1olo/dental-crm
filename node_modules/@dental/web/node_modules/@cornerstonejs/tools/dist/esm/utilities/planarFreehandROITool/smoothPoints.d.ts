import type { Types } from '@cornerstonejs/core';
export declare function shouldSmooth(configuration: Record<string, {
    smoothOnAdd: boolean;
    smoothOnEdit: boolean;
}>, annotation?: any): boolean;
export declare function getInterpolatedPoints(configuration: Record<string, {
    smoothOnAdd: boolean;
    smoothOnEdit: boolean;
    knotsRatioPercentageOnAdd: number;
    knotsRatioPercentageOnEdit: number;
}>, points: Types.Point2[], pointsOfReference?: Types.Point2[]): Types.Point2[];
