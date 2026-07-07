import { cache, volumeLoader, utilities, ImageVolume, } from '@cornerstonejs/core';
import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
function getOrCreateSegmentationVolume(segmentationId) {
    const { representationData } = getSegmentation(segmentationId);
    if (!representationData.Labelmap) {
        return;
    }
    let { volumeId } = representationData.Labelmap;
    let segVolume;
    if (volumeId) {
        segVolume = cache.getVolume(volumeId);
        if (segVolume) {
            return segVolume;
        }
    }
    const { imageIds: labelmapImageIds } = representationData.Labelmap;
    volumeId = cache.generateVolumeId(labelmapImageIds);
    if (!labelmapImageIds || labelmapImageIds.length === 0) {
        return;
    }
    const isValidVolume = utilities.isValidVolume(labelmapImageIds);
    if (!isValidVolume) {
        return;
    }
    segVolume = volumeLoader.createAndCacheVolumeFromImagesSync(volumeId, labelmapImageIds);
    return segVolume;
}
export default getOrCreateSegmentationVolume;
