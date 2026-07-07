import { ImageQualityStatus, RequestType } from '../../enums';
import type { IImagesLoader, ImageLoadRequests, ImageVolumeProps, IStreamingVolumeProperties, ScalingParameters } from '../../types';
import ImageVolume from './ImageVolume';
export declare class BaseStreamingImageVolume extends ImageVolume implements IImagesLoader {
    private framesLoaded;
    private framesProcessed;
    private framesUpdated;
    protected autoRenderOnLoad: boolean;
    protected cachedFrames: any[];
    protected reRenderTarget: number;
    protected reRenderFraction: number;
    loadStatus: {
        loaded: boolean;
        loading: boolean;
        cancelled: boolean;
        callbacks: Array<(...args: unknown[]) => void>;
    };
    imagesLoader: IImagesLoader;
    constructor(imageVolumeProperties: ImageVolumeProps, streamingProperties: IStreamingVolumeProperties);
    protected invalidateVolume(immediate: boolean): void;
    cancelLoading: () => void;
    clearLoadCallbacks(): void;
    protected callLoadStatusCallback(evt: any): void;
    protected updateTextureAndTriggerEvents(imageIdIndex: any, imageId: any, imageQualityStatus?: ImageQualityStatus): void;
    successCallback(imageId: string, image: any): void;
    errorCallback(imageId: any, permanent: any, error: any): void;
    load(callback: (...args: unknown[]) => void): void;
    getLoaderImageOptions(imageId: string): {
        targetBuffer: {
            type: import("../../types").PixelDataTypedArrayString;
            rows: number;
            columns: number;
        };
        allowFloatRendering: boolean;
        preScale: {
            enabled: boolean;
            scalingParameters: ScalingParameters;
        };
        transferPixelData: boolean;
        requestType: RequestType;
        transferSyntaxUID: any;
        additionalDetails: {
            imageId: string;
            imageIdIndex: number;
            volumeId: string;
        };
        retrieveOptions: any;
    };
    callLoadImage(imageId: any, imageIdIndex: any, options: any): any;
    protected getImageIdsRequests(imageIds: string[], priorityDefault: number): {
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
                scalingParameters: ScalingParameters;
            };
            transferPixelData: boolean;
            requestType: RequestType;
            transferSyntaxUID: any;
            additionalDetails: {
                imageId: string;
                imageIdIndex: number;
                volumeId: string;
            };
            retrieveOptions: any;
        };
        priority: number;
        requestType: RequestType;
        additionalDetails: {
            volumeId: string;
        };
    }[];
    getImageLoadRequests(priority?: number): ImageLoadRequests[];
    getImageIdsToLoad(): string[];
    loadImages(): Promise<boolean>;
    private _prefetchImageIds;
    private _addScalingToVolume;
    protected checkDimensionGroupCompletion(imageIdIndex: number): void;
}
export default BaseStreamingImageVolume;
