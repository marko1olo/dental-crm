import type { Types } from '@cornerstonejs/core';
export declare enum SegmentationEnum {
    SEGMENT = -1,
    ISLAND = -2,
    INTERIOR = -3,
    EXTERIOR = -4,
    INTERIOR_SMALL = -5,
    INTERIOR_TEST = -6
}
export default class IslandRemoval {
    segmentSet: Types.RLEVoxelMap<SegmentationEnum>;
    segmentIndex: number;
    fillSegments: (index: number) => boolean;
    previewVoxelManager: Types.VoxelManager<number>;
    previewSegmentIndex: number;
    selectedPoints: Types.Point3[];
    private fillInternalEdge;
    private maxInternalRemove;
    constructor(options?: {
        maxInternalRemove?: number;
        fillInternalEdge?: boolean;
    });
    initialize(viewport: any, segmentationVoxels: any, options: any): boolean;
    floodFillSegmentIsland(): number;
    removeExternalIslands(): void;
    removeInternalIslands(): number[];
    static covers(rle: any, row: any): boolean;
}
