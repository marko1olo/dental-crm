import type { PixelDataTypedArray, Point3 } from '../types';
type NeighborhoodStats = {
    mean: number;
    stdDev: number;
    count: number;
};
export declare function calculateNeighborhoodStats(scalarData: PixelDataTypedArray, dimensions: Point3, centerIjk: Point3, radius: number): NeighborhoodStats;
export {};
