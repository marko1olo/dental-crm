import { cache } from '@cornerstonejs/core';
import { getSegmentation } from '../getSegmentation';
import { updateStackSegmentationState } from '../helpers/updateStackSegmentationState';
export async function computeStackLabelmapFromVolume({ volumeId, }) {
    const segmentationVolume = cache.getVolume(volumeId);
    return { imageIds: segmentationVolume.imageIds };
}
export function convertVolumeToStackLabelmap({ segmentationId, options, }) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        return;
    }
    const { volumeId } = segmentation.representationData
        .Labelmap;
    const segmentationVolume = cache.getVolume(volumeId);
    return updateStackSegmentationState({
        segmentationId,
        viewportId: options.viewportId,
        imageIds: segmentationVolume.imageIds,
        options,
    });
}
