import { getWebWorkerManager } from '@cornerstonejs/core';
import { WorkerTypes } from '../../enums';
import { registerComputeWorker } from '../registerComputeWorker';
import { triggerWorkerProgress, getSegmentationDataForWorker, prepareVolumeStrategyDataForWorker, prepareStackDataForWorker, } from './utilsForWorker';
export async function getSegmentLargestBidirectional({ segmentationId, segmentIndices, mode = 'individual', }) {
    registerComputeWorker();
    triggerWorkerProgress(WorkerTypes.COMPUTE_LARGEST_BIDIRECTIONAL, 0);
    const segData = getSegmentationDataForWorker(segmentationId, segmentIndices);
    if (!segData) {
        return;
    }
    const { operationData, segImageIds, reconstructableVolume, indices } = segData;
    const bidirectionalData = reconstructableVolume
        ? await calculateVolumeBidirectional({
            operationData,
            indices,
            mode,
        })
        : await calculateStackBidirectional({
            segImageIds,
            indices,
            mode,
        });
    triggerWorkerProgress(WorkerTypes.COMPUTE_LARGEST_BIDIRECTIONAL, 100);
    return bidirectionalData;
}
async function calculateVolumeBidirectional({ operationData, indices, mode }) {
    const strategyData = prepareVolumeStrategyDataForWorker(operationData);
    const { segmentationVoxelManager, segmentationImageData } = strategyData;
    const segmentationScalarData = segmentationVoxelManager.getCompleteScalarDataArray();
    const segmentationInfo = {
        scalarData: segmentationScalarData,
        dimensions: segmentationImageData.getDimensions(),
        spacing: segmentationImageData.getSpacing(),
        origin: segmentationImageData.getOrigin(),
        direction: segmentationImageData.getDirection(),
    };
    const bidirectionalData = await getWebWorkerManager().executeTask('compute', 'getSegmentLargestBidirectionalInternal', {
        segmentationInfo,
        indices,
        mode,
    });
    return bidirectionalData;
}
async function calculateStackBidirectional({ segImageIds, indices, mode }) {
    const { segmentationInfo } = prepareStackDataForWorker(segImageIds);
    const bidirectionalData = await getWebWorkerManager().executeTask('compute', 'getSegmentLargestBidirectionalInternal', {
        segmentationInfo,
        indices,
        mode,
        isStack: true,
    });
    return bidirectionalData;
}
