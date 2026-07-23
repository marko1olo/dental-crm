import type { ImageQualityStatus, RequestType } from '../enums';
import type { ImageLoadListener } from './ImageLoadListener';
export interface RetrieveStage {
    id: string;
    positions?: number[];
    decimate?: number;
    offset?: number;
    retrieveType?: string;
    requestType?: RequestType;
    priority?: number;
    nearbyFrames?: NearbyFrames[];
}
export interface NearbyFrames {
    offset: number;
    imageQualityStatus?: ImageQualityStatus;
}
export interface BaseRetrieveOptions {
    urlArguments?: string;
    framesPath?: string;
    decodeLevel?: number;
    imageQualityStatus?: ImageQualityStatus;
}
export type RangeRetrieveOptions = BaseRetrieveOptions & {
    rangeIndex: number;
    chunkSize?: number | ((metadata: any) => number);
};
export type StreamingRetrieveOptions = BaseRetrieveOptions & {
    streaming: boolean;
};
export type RetrieveOptions = BaseRetrieveOptions | StreamingRetrieveOptions | RangeRetrieveOptions;
export interface IRetrieveConfiguration {
    create?: (IRetrieveConfiguration: any) => IImagesLoader;
    retrieveOptions?: Record<string, RetrieveOptions>;
    stages?: RetrieveStage[];
}
export interface IImagesLoader {
    loadImages: (imageIds: string[], listener: ImageLoadListener) => Promise<unknown>;
}
