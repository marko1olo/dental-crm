import type Point3 from '../types/Point3';
import type BoundsIJK from '../types/BoundsIJK';
import type { PixelDataTypedArray } from '../types';
export type RLERun<T> = {
    value: T;
    start: number;
    end: number;
};
export type PlaneNormalizer = {
    toIJK: (ijkPrime: Point3) => Point3;
    fromIJK: (ijk: Point3) => Point3;
    boundsIJKPrime: BoundsIJK;
};
export default class RLEVoxelMap<T> {
    normalizer: PlaneNormalizer;
    protected rows: Map<number, RLERun<T>[]>;
    height: number;
    width: number;
    depth: number;
    protected jMultiple: number;
    protected kMultiple: number;
    protected numComps: number;
    defaultValue: T;
    pixelDataConstructor: Uint8ArrayConstructor;
    static copyMap<T>(destination: RLEVoxelMap<T>, source: RLEVoxelMap<T>): void;
    constructor(width: number, height: number, depth?: number);
    static getScalarData: (ArrayType?: Uint8ClampedArrayConstructor) => Uint8ClampedArray;
    updateScalarData: (scalarData: PixelDataTypedArray) => void;
    get: (index: number) => T;
    toIJK(index: number): Point3;
    toIndex([i, j, k]: Point3): number;
    protected getRLE(i: number, j: number, k?: number): RLERun<T>;
    has(index: number): boolean;
    delete(index: number): void;
    protected findIndex(row: RLERun<T>[], i: number): number;
    forEach(callback: any, options?: {
        rowModified?: boolean;
    }): void;
    forEachRow(callback: any): void;
    getRun: (j: number, k: number) => RLERun<T>[];
    set: (index: number, value: T) => void;
    clear(): void;
    keys(): number[];
    getPixelData(k?: number, pixelData?: PixelDataTypedArray): PixelDataTypedArray;
    floodFill(i: number, j: number, k: number, value: T, options?: {
        planar?: boolean;
        diagonals?: boolean;
        singlePlane?: boolean;
    }): number;
    private flood;
    fillFrom(getter: (i: number, j: number, k: number) => T, boundsIJK: BoundsIJK): void;
    findAdjacents(item: [RLERun<T>, number, number, Point3[]?], { diagonals, planar, singlePlane }: {
        diagonals?: boolean;
        planar?: boolean;
        singlePlane?: boolean;
    }): any[];
}
