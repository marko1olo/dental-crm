import type { Types } from '@cornerstonejs/core';
import type { BoundsIJK } from '../../types';
import type { ThresholdInformation } from './utilities';
export type ThresholdRangeOptions = {
    overwrite: boolean;
    segmentationId: string;
    boundsIJK: BoundsIJK;
    overlapType?: number;
    segmentIndex?: number;
};
declare function thresholdVolumeByRange(segmentationVolume: Types.IImageVolume, thresholdVolumeInformation: ThresholdInformation[], options: ThresholdRangeOptions): Types.IImageVolume;
export default thresholdVolumeByRange;
