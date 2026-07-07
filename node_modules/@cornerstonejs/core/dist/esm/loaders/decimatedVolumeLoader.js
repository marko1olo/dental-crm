import StreamingImageVolume from '../cache/classes/StreamingImageVolume';
import { generateVolumePropsFromImageIds } from '../utilities/generateVolumePropsFromImageIds';
import decimate from '../utilities/decimate';
import VoxelManager from '../utilities/VoxelManager';
import { applyDecimatedVolumeModifiers, inPlaneDecimationModifier, } from './decimatedVolumeModifiers';
export function decimatedVolumeLoader(volumeId, options) {
    if (!options || !options.imageIds || !options.imageIds.length) {
        throw new Error('ImageIds must be provided to create a streaming image volume ');
    }
    const [iDecimation = 1, jDecimation = iDecimation, kDecimation = 1] = options.ijkDecimation ?? [];
    const columnDecimation = Math.max(1, Math.floor(iDecimation));
    const rowDecimation = jDecimation > 1 ? Math.max(1, Math.floor(jDecimation)) : columnDecimation;
    const kAxisDecimation = Math.max(1, Math.floor(kDecimation));
    const hasInPlaneDecimation = columnDecimation > 1 || rowDecimation > 1;
    const modifierOptions = {
        ijkDecimation: [
            columnDecimation,
            rowDecimation,
            kAxisDecimation,
        ],
    };
    const modifiers = [inPlaneDecimationModifier];
    function addDecimationToImageId(imageId, factor) {
        if (factor === 1) {
            return imageId;
        }
        return `${imageId}#decimation=${factor}`;
    }
    const expectedDecimatedCount = Math.floor(options.imageIds.length / kAxisDecimation);
    const isAlreadyDecimated = kAxisDecimation > 1 &&
        options.imageIds.length <= expectedDecimatedCount + 1;
    if (kAxisDecimation > 1 && !isAlreadyDecimated) {
        const decimatedResult = decimate(options.imageIds, kAxisDecimation);
        const decimatedImageIds = Array.isArray(decimatedResult) &&
            decimatedResult.length &&
            typeof decimatedResult[0] === 'number'
            ? decimatedResult.map((idx) => options.imageIds[idx])
            : decimatedResult;
        options.imageIds = decimatedImageIds;
    }
    if (columnDecimation > 1) {
        options.imageIds = options.imageIds.map((imageId) => addDecimationToImageId(imageId, columnDecimation));
    }
    async function getStreamingImageVolume() {
        const baseVolumeProps = generateVolumePropsFromImageIds(options.imageIds, volumeId);
        const modifierContext = {
            volumeId,
            imageIds: options.imageIds,
            options: modifierOptions,
        };
        const volumeProps = applyDecimatedVolumeModifiers(baseVolumeProps, modifiers, modifierContext);
        const { dimensions, spacing, origin, direction, metadata, imageIds, dataType, numberOfComponents, } = volumeProps;
        const streamingImageVolume = new StreamingImageVolume({
            volumeId,
            metadata,
            dimensions,
            spacing,
            origin,
            direction,
            imageIds,
            dataType,
            numberOfComponents,
        }, {
            imageIds,
            loadStatus: {
                loaded: false,
                loading: false,
                cancelled: false,
                cachedFrames: [],
                callbacks: [],
            },
        });
        if (hasInPlaneDecimation) {
            const vtkImageData = streamingImageVolume.imageData;
            if (vtkImageData) {
                vtkImageData.setDimensions(streamingImageVolume.dimensions);
                vtkImageData.setSpacing(streamingImageVolume.spacing);
                vtkImageData.modified();
            }
            const newVoxelManager = VoxelManager.createImageVolumeVoxelManager({
                dimensions: streamingImageVolume.dimensions,
                imageIds: streamingImageVolume.imageIds,
                numberOfComponents: numberOfComponents,
            });
            streamingImageVolume.voxelManager = newVoxelManager;
            if (vtkImageData) {
                vtkImageData.set({
                    voxelManager: newVoxelManager,
                });
            }
        }
        return streamingImageVolume;
    }
    const streamingImageVolumePromise = getStreamingImageVolume();
    return {
        promise: streamingImageVolumePromise,
        decache: () => {
            streamingImageVolumePromise.then((streamingImageVolume) => {
                streamingImageVolume.destroy();
                streamingImageVolume = null;
            });
        },
        cancel: () => {
            streamingImageVolumePromise.then((streamingImageVolume) => {
                streamingImageVolume.cancelLoading();
            });
        },
    };
}
export default decimatedVolumeLoader;
