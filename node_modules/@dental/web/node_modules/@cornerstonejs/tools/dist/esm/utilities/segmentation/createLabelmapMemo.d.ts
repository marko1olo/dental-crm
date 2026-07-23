import { utilities } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
export type LabelmapMemo = Types.Memo & {
    segmentationVoxelManager: Types.IVoxelManager<number>;
    voxelManager: Types.IVoxelManager<number>;
    redoVoxelManager?: Types.IVoxelManager<number>;
    undoVoxelManager?: Types.IVoxelManager<number>;
    memo?: LabelmapMemo;
    id: string;
};
export declare function createLabelmapMemo<T>(segmentationId: string, segmentationVoxelManager: Types.IVoxelManager<T>): {
    segmentationId: string;
    restoreMemo: typeof restoreMemo;
    commitMemo: typeof commitMemo;
    segmentationVoxelManager: Types.IVoxelManager<T>;
    voxelManager: utilities.VoxelManager<T>;
    id: string;
    operationType: string;
};
export declare function restoreMemo(isUndo?: boolean): void;
export declare function createRleMemo<T>(segmentationId: string, segmentationVoxelManager: Types.IVoxelManager<T>): {
    segmentationId: string;
    restoreMemo: typeof restoreMemo;
    commitMemo: typeof commitMemo;
    segmentationVoxelManager: Types.IVoxelManager<T>;
    voxelManager: utilities.VoxelManager<T>;
    id: string;
    operationType: string;
};
declare function commitMemo(): boolean;
export {};
