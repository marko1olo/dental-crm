import cache from '../cache/cache';
import StreamingImageVolume from '../cache/classes/StreamingImageVolume';
import { RequestType } from '../enums';
import imageLoadPoolManager from '../requestPool/imageLoadPoolManager';
import { generateVolumePropsFromImageIds } from '../utilities/generateVolumePropsFromImageIds';
import { loadImage } from './imageLoader';
function cornerstoneStreamingImageVolumeLoader(volumeId, options) {
    if (!options || !options.imageIds || !options.imageIds.length) {
        throw new Error('ImageIds must be provided to create a streaming image volume');
    }
    async function getStreamingImageVolume() {
        if (options.imageIds[0].split(':')[0] === 'wadouri') {
            const [middleImageIndex, lastImageIndex] = [
                Math.floor(options.imageIds.length / 2),
                options.imageIds.length - 1,
            ];
            const indexesToPrefetch = [0, middleImageIndex, lastImageIndex];
            await Promise.all(indexesToPrefetch.map((index) => {
                if (cache.isLoaded(options.imageIds[index])) {
                    return Promise.resolve(true);
                }
                return new Promise((resolve, reject) => {
                    const imageId = options.imageIds[index];
                    imageLoadPoolManager.addRequest(async () => {
                        loadImage(imageId)
                            .then(() => {
                            console.log(`Prefetched imageId: ${imageId}`);
                            resolve(true);
                        })
                            .catch((err) => {
                            reject(err);
                        });
                    }, RequestType.Prefetch, { volumeId }, 1);
                });
            })).catch(console.error);
        }
        const volumeProps = generateVolumePropsFromImageIds(options.imageIds, volumeId);
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
export { cornerstoneStreamingImageVolumeLoader };
