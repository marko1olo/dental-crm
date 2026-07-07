import { utilities, getWebWorkerManager } from '@cornerstonejs/core';
import { triggerWorkerProgress } from './utilsForWorker';
import { WorkerTypes } from '../../enums';
import { registerComputeWorker } from '../registerComputeWorker';
import createMergedLabelmapForIndex from './createMergedLabelmapForIndex';
import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
import getOrCreateSegmentationVolume from './getOrCreateSegmentationVolume';
import { getReferenceVolumeForSegmentation } from './getReferenceVolumeForSegmentation';
async function computeMetabolicStats({ segmentationIds, segmentIndex, }) {
    registerComputeWorker();
    triggerWorkerProgress(WorkerTypes.COMPUTE_STATISTICS, 0);
    const segmentation = getSegmentation(segmentationIds[0]);
    const { imageIds: segImageIds } = segmentation.representationData
        .Labelmap;
    const isValidVolume = utilities.isValidVolume(segImageIds);
    if (!isValidVolume) {
        throw new Error('Invalid volume - TMTV cannot be calculated');
    }
    const stats = await calculateForVolume({
        segmentationIds,
        segmentIndex,
    });
    return stats;
}
async function calculateForVolume({ segmentationIds, segmentIndex }) {
    const labelmapVolumes = segmentationIds.map((id) => {
        return getOrCreateSegmentationVolume(id);
    });
    const mergedLabelmap = createMergedLabelmapForIndex(labelmapVolumes, segmentIndex);
    if (!mergedLabelmap) {
        throw new Error('Invalid volume - TMTV cannot be calculated');
    }
    const { imageData, dimensions, direction, origin, voxelManager } = mergedLabelmap;
    const spacing = imageData.getSpacing();
    const segmentationScalarData = voxelManager.getCompleteScalarDataArray();
    const segmentationInfo = {
        scalarData: segmentationScalarData,
        dimensions,
        spacing,
        origin,
        direction,
    };
    const referenceVolume = getReferenceVolumeForSegmentation(segmentationIds[0]);
    const imageInfo = {
        dimensions: referenceVolume.dimensions,
        spacing: referenceVolume.spacing,
        origin: referenceVolume.origin,
        direction: referenceVolume.direction,
        scalarData: referenceVolume.voxelManager.getCompleteScalarDataArray(),
    };
    if (imageInfo.scalarData.length === 0 ||
        segmentationInfo.scalarData.length === 0) {
        return {
            [segmentIndex]: {
                name: 'TMTV',
                value: 0,
            },
        };
    }
    const stats = await getWebWorkerManager().executeTask('compute', 'computeMetabolicStats', {
        segmentationInfo,
        imageInfo,
    });
    triggerWorkerProgress(WorkerTypes.COMPUTE_STATISTICS, 100);
    return stats;
}
export { computeMetabolicStats };
