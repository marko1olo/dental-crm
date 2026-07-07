import { cache, volumeLoader, utilities as csUtils, } from '@cornerstonejs/core';
function getOrCreateImageVolume(referencedImageIds) {
    if (!referencedImageIds?.length) {
        return;
    }
    const isValidVolume = csUtils.isValidVolume(referencedImageIds);
    if (!isValidVolume) {
        return;
    }
    const volumeId = cache.generateVolumeId(referencedImageIds);
    let imageVolume = cache.getVolume(volumeId);
    if (imageVolume) {
        return imageVolume;
    }
    imageVolume = volumeLoader.createAndCacheVolumeFromImagesSync(volumeId, referencedImageIds);
    return imageVolume;
}
export default getOrCreateImageVolume;
