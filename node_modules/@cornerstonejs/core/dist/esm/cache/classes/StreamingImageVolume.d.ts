import type { ImageLoadRequests, ImageVolumeProps, IStreamingVolumeProperties, PixelDataTypedArray } from '../../types';
import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingImageVolume extends BaseStreamingImageVolume {
    constructor(imageVolumeProperties: ImageVolumeProps, streamingProperties: IStreamingVolumeProperties);
    getScalarData(): PixelDataTypedArray;
    getImageLoadRequests(priority: number): ImageLoadRequests[];
    getImageIdsToLoad: () => string[];
}
