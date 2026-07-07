import { Events, ImageQualityStatus } from '../../enums';
import eventTarget from '../../eventTarget';
import { triggerEvent } from '../../utilities';
import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingDynamicImageVolume extends BaseStreamingImageVolume {
    constructor(imageVolumeProperties, streamingProperties) {
        super(imageVolumeProperties, streamingProperties);
        this._dimensionGroupNumber = 1;
        this._loadedDimensionGroups = new Set();
        this._getImageIdRequests = (imageIds, priority) => {
            return this.getImageIdsRequests(imageIds, priority);
        };
        this.getImageLoadRequests = (priority) => {
            const imageIds = this.getImageIdsToLoad();
            return this._getImageIdRequests(imageIds, priority);
        };
        const { imageIdGroups, splittingTag } = imageVolumeProperties;
        this._splittingTag = splittingTag;
        this._imageIdGroups = imageIdGroups;
        this.numDimensionGroups = this._imageIdGroups.length;
    }
    _getImageIdsToLoad() {
        const imageIdGroups = this._imageIdGroups;
        const initialImageIdGroupIndex = this._dimensionGroupNumber - 1;
        const imageIds = [...imageIdGroups[initialImageIdGroupIndex]];
        let leftIndex = initialImageIdGroupIndex - 1;
        let rightIndex = initialImageIdGroupIndex + 1;
        while (leftIndex >= 0 || rightIndex < imageIdGroups.length) {
            if (leftIndex >= 0) {
                imageIds.push(...imageIdGroups[leftIndex--]);
            }
            if (rightIndex < imageIdGroups.length) {
                imageIds.push(...imageIdGroups[rightIndex++]);
            }
        }
        return imageIds;
    }
    getImageIdsToLoad() {
        return this._getImageIdsToLoad();
    }
    get dimensionGroupNumber() {
        return this._dimensionGroupNumber;
    }
    set dimensionGroupNumber(dimensionGroupNumber) {
        if (this._dimensionGroupNumber === dimensionGroupNumber) {
            return;
        }
        this._dimensionGroupNumber = dimensionGroupNumber;
        this.voxelManager.setDimensionGroupNumber(dimensionGroupNumber);
        this.invalidateVolume(true);
        triggerEvent(eventTarget, Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED, {
            volumeId: this.volumeId,
            dimensionGroupNumber: dimensionGroupNumber,
            numDimensionGroups: this.numDimensionGroups,
            imageIdGroupIndex: dimensionGroupNumber - 1,
            numImageIdGroups: this.numDimensionGroups,
            splittingTag: this.splittingTag,
        });
    }
    scroll(delta) {
        const newDimensionGroupNumber = this._dimensionGroupNumber + delta;
        if (newDimensionGroupNumber < 1) {
            this.dimensionGroupNumber = this.numDimensionGroups;
        }
        else if (newDimensionGroupNumber > this.numDimensionGroups) {
            this.dimensionGroupNumber = 1;
        }
        else {
            this.dimensionGroupNumber = newDimensionGroupNumber;
        }
    }
    getCurrentDimensionGroupImageIds() {
        return this._imageIdGroups[this._dimensionGroupNumber - 1];
    }
    flatImageIdIndexToDimensionGroupNumber(flatImageIdIndex) {
        return Math.floor(flatImageIdIndex / this._imageIdGroups[0].length) + 1;
    }
    flatImageIdIndexToImageIdIndex(flatImageIdIndex) {
        return flatImageIdIndex % this._imageIdGroups[0].length;
    }
    get splittingTag() {
        return this._splittingTag;
    }
    isDimensionGroupLoaded(dimensionGroupNumber) {
        return this._loadedDimensionGroups.has(dimensionGroupNumber);
    }
    markDimensionGroupAsLoaded(dimensionGroupNumber) {
        this._loadedDimensionGroups.add(dimensionGroupNumber);
        triggerEvent(eventTarget, Events.DYNAMIC_VOLUME_DIMENSION_GROUP_LOADED, {
            volumeId: this.volumeId,
            dimensionGroupNumber: dimensionGroupNumber,
        });
    }
    checkDimensionGroupCompletion(imageIdIndex) {
        const dimensionGroupNumber = this.flatImageIdIndexToDimensionGroupNumber(imageIdIndex);
        const imageIdsInDimensionGroup = this._imageIdGroups[dimensionGroupNumber - 1];
        const allLoaded = imageIdsInDimensionGroup.every((imageId) => {
            const index = this.getImageIdIndex(imageId);
            return this.cachedFrames[index] === ImageQualityStatus.FULL_RESOLUTION;
        });
        if (allLoaded && !this.isDimensionGroupLoaded(dimensionGroupNumber)) {
            this.markDimensionGroupAsLoaded(dimensionGroupNumber);
        }
    }
}
