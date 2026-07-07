import { StreamingDynamicImageVolume } from '../cache';
import { generateVolumePropsFromImageIds, sortImageIdsAndGetSpacing, splitImageIdsBy4DTags, VoxelManager, } from '../utilities';
function cornerstoneStreamingDynamicImageVolumeLoader(volumeId, options) {
    if (!options || !options.imageIds || !options.imageIds.length) {
        throw new Error('ImageIds must be provided to create a 4D streaming image volume');
    }
    const { imageIds } = options;
    const { splittingTag, imageIdGroups } = splitImageIdsBy4DTags(imageIds);
    const middleIndex = Math.floor(imageIdGroups.length / 2);
    const volumeProps = generateVolumePropsFromImageIds(imageIdGroups[middleIndex], volumeId);
    const { metadata: volumeMetadata, dimensions, spacing, direction, sizeInBytes, origin, numberOfComponents, dataType, } = volumeProps;
    const scanAxisNormal = direction.slice(6, 9);
    const sortedImageIdGroups = imageIdGroups.map((imageIds) => {
        const sortedImageIds = sortImageIdsAndGetSpacing(imageIds, scanAxisNormal).sortedImageIds;
        return sortedImageIds;
    });
    const sortedFlatImageIds = sortedImageIdGroups.flat();
    const voxelManager = VoxelManager.createScalarDynamicVolumeVoxelManager({
        dimensions,
        imageIdGroups: sortedImageIdGroups,
        dimensionGroupNumber: 1,
        numberOfComponents,
    });
    let streamingImageVolume = new StreamingDynamicImageVolume({
        volumeId,
        metadata: volumeMetadata,
        dimensions,
        spacing,
        origin,
        direction,
        sizeInBytes,
        imageIds: sortedFlatImageIds,
        imageIdGroups: sortedImageIdGroups,
        splittingTag,
        voxelManager,
        numberOfComponents,
        dataType,
    }, {
        imageIds: sortedFlatImageIds,
        loadStatus: {
            loaded: false,
            loading: false,
            cancelled: false,
            cachedFrames: [],
            callbacks: [],
        },
    });
    return {
        promise: Promise.resolve(streamingImageVolume),
        decache: () => {
            streamingImageVolume.destroy();
            streamingImageVolume = null;
        },
        cancel: () => {
            streamingImageVolume.cancelLoading();
        },
    };
}
export { cornerstoneStreamingDynamicImageVolumeLoader };
