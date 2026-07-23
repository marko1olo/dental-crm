import type { IDynamicImageVolume, ImageVolumeProps, IStreamingVolumeProperties } from '../../types';
import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingDynamicImageVolume extends BaseStreamingImageVolume implements IDynamicImageVolume {
    private _dimensionGroupNumber;
    private _splittingTag;
    private _imageIdGroups;
    private _loadedDimensionGroups;
    numDimensionGroups: number;
    constructor(imageVolumeProperties: ImageVolumeProps & {
        splittingTag: string;
        imageIdGroups: string[][];
    }, streamingProperties: IStreamingVolumeProperties);
    private _getImageIdsToLoad;
    private _getImageIdRequests;
    getImageIdsToLoad(): string[];
    get dimensionGroupNumber(): number;
    set dimensionGroupNumber(dimensionGroupNumber: number);
    scroll(delta: number): void;
    getCurrentDimensionGroupImageIds(): string[];
    flatImageIdIndexToDimensionGroupNumber(flatImageIdIndex: number): number;
    flatImageIdIndexToImageIdIndex(flatImageIdIndex: number): number;
    get splittingTag(): string;
    getImageLoadRequests: (priority: number) => {
        callLoadImage: (imageId: any, imageIdIndex: any, options: any) => any;
        imageId: string;
        imageIdIndex: number;
        options: {
            targetBuffer: {
                type: import("../../types").PixelDataTypedArrayString;
                rows: number;
                columns: number;
            };
            allowFloatRendering: boolean;
            preScale: {
                enabled: boolean;
                scalingParameters: import("../../types").ScalingParameters;
            };
            transferPixelData: boolean;
            requestType: import("../../enums").RequestType;
            transferSyntaxUID: any;
            additionalDetails: {
                imageId: string;
                imageIdIndex: number;
                volumeId: string;
            };
            retrieveOptions: any;
        };
        priority: number;
        requestType: import("../../enums").RequestType;
        additionalDetails: {
            volumeId: string;
        };
    }[];
    isDimensionGroupLoaded(dimensionGroupNumber: number): boolean;
    private markDimensionGroupAsLoaded;
    protected checkDimensionGroupCompletion(imageIdIndex: number): void;
}
