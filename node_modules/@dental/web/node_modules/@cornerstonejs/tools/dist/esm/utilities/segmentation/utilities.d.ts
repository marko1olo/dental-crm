import type { Types } from '@cornerstonejs/core';
import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
export type ThresholdInformation = {
    volume: Types.IImageVolume;
    lower: number;
    upper: number;
};
export type VolumeInfo = {
    imageData: vtkImageData;
    lower: number;
    upper: number;
    spacing: Types.Point3;
    dimensions: Types.Point3;
    volumeSize: number;
    voxelManager: Types.IVoxelManager<number> | Types.IVoxelManager<Types.RGB>;
};
export declare function getVoxelOverlap(imageData: any, dimensions: any, voxelSpacing: any, voxelCenter: any): [Types.Point2, Types.Point2, null] | [Types.Point2, Types.Point2, Types.Point2];
export declare function processVolumes(segmentationVolume: Types.IImageVolume, thresholdVolumeInformation: ThresholdInformation[]): {
    volumeInfoList: VolumeInfo[];
    baseVolumeIdx: number;
};
export declare const setSegmentationDirty: (segmentationId: string) => void;
export declare const setSegmentationClean: (segmentationId: string) => void;
export declare const getCachedSegmentIndices: (segmentationId: string) => number[];
export declare const setCachedSegmentIndices: (segmentationId: string, indices: number[]) => void;
