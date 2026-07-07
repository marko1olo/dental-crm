import type { Types } from '@cornerstonejs/core';
type FloodFillResult = {
    flooded: Types.Point2[] | Types.Point3[];
};
type FloodFillGetter3D = (x: number, y: number, z: number) => unknown;
type FloodFillGetter2D = (x: number, y: number) => unknown;
type FloodFillGetter = FloodFillGetter2D | FloodFillGetter3D;
type FloodFillOptions = {
    onFlood?: (x: number, y: number, z?: number) => void;
    onBoundary?: (x: number, y: number, z?: number) => void;
    equals?: (a: any, b: any) => boolean;
    diagonals?: boolean;
    bounds?: Map<number, Types.Point2 | Types.Point3>;
    filter?: (point: any) => boolean;
};
export type { FloodFillResult, FloodFillGetter, FloodFillOptions };
