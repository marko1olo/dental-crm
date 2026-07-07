import type { PointsArray3 } from './interpolate';
export interface SelectHandlesOptions {
    handleCount?: number;
    isOpenUShapeContour?: boolean;
}
export default function selectHandles(polyline: PointsArray3, options?: SelectHandlesOptions): PointsArray3;
export declare function createDotValues(polyline: PointsArray3, distance?: number): Float32Array;
export declare function addInterval(indices: any, start: any, finish: any, interval: any, length: any): any;
