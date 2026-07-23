import type { Types } from '@cornerstonejs/core';
import type { FanShapeCorners, RefinementOptions } from './types';
export declare function pickPoints(hull: Array<Types.Point2>, slack?: number): FanShapeCorners;
export declare function computeEdgeBuffer(buffer: any, width: any, height: any): Float32Array;
export declare function refineCornersDirectional(edgeBuf: Float32Array, width: number, height: number, rough: FanShapeCorners, contour: Array<Types.Point2>, opts?: RefinementOptions & {
    slack?: number;
}): FanShapeCorners;
export declare function calculateFanShapeCorners(imageBuffer: any, width: any, height: any, hull: Array<Types.Point2>, roughContour: Array<Types.Point2>): FanShapeCorners;
