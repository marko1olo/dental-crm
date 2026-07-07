import type { Types } from '@cornerstonejs/core';
import type { ThresholdInformation } from './utilities';
export type ThresholdOptions = {
    segmentationId: string;
    numSlicesToProject?: number;
    overwrite: boolean;
    overlapType?: number;
    segmentIndex?: number;
};
export type AnnotationForThresholding = {
    data: {
        handles: {
            points: Types.Point3[];
        };
        cachedStats?: {
            projectionPoints?: Types.Point3[][];
        };
    };
};
declare function rectangleROIThresholdVolumeByRange(annotationUIDs: string[], segmentationVolume: Types.IImageVolume, thresholdVolumeInformation: ThresholdInformation[], options: ThresholdOptions): Types.IImageVolume;
export default rectangleROIThresholdVolumeByRange;
