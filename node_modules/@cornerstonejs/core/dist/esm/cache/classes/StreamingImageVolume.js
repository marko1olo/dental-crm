import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingImageVolume extends BaseStreamingImageVolume {
    constructor(imageVolumeProperties, streamingProperties) {
        if (!imageVolumeProperties.imageIds) {
            imageVolumeProperties.imageIds = streamingProperties.imageIds;
        }
        super(imageVolumeProperties, streamingProperties);
        this.getImageIdsToLoad = () => {
            const { imageIds } = this;
            this.numFrames = imageIds.length;
            return imageIds;
        };
    }
    getScalarData() {
        return this.voxelManager.getScalarData();
    }
    getImageLoadRequests(priority) {
        const { imageIds } = this;
        return this.getImageIdsRequests(imageIds, priority);
    }
}
