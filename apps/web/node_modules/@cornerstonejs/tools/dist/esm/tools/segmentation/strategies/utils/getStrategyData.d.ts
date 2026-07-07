import { type Types } from '@cornerstonejs/core';
import type { LabelmapToolOperationDataStack, LabelmapToolOperationDataVolume } from '../../../../types';
declare function getStrategyData({ operationData, viewport, strategy, }: {
    operationData: LabelmapToolOperationDataStack | LabelmapToolOperationDataVolume;
    viewport?: Types.IStackViewport | Types.IVolumeViewport;
    strategy: unknown;
}): {
    segmentationImageData: any;
    segmentationScalarData: any;
    imageScalarData: any;
    segmentationVoxelManager: any;
    imageVoxelManager: any;
    imageData: any;
};
export { getStrategyData };
