import { Enums as csCoreEnums, type Types } from '@cornerstonejs/core';
import type { DICOMLoaderImageOptions } from '../../types';
export declare function getTransferSyntaxForContentType(contentType: string): string;
export interface StreamingData {
    url: string;
    encodedData?: Uint8Array;
    totalBytes?: number;
    chunkSize?: number;
    totalRanges?: number;
    rangesFetched?: number;
}
export interface CornerstoneWadoRsLoaderOptions extends DICOMLoaderImageOptions {
    requestType?: csCoreEnums.RequestType;
    additionalDetails?: {
        imageId: string;
    };
    priority?: number;
    addToBeginning?: boolean;
    retrieveType?: string;
    transferSyntaxUID?: string;
    retrieveOptions?: Types.RangeRetrieveOptions;
    streamingData?: StreamingData;
}
declare function loadImage(imageId: string, options?: CornerstoneWadoRsLoaderOptions): Types.IImageLoadObject;
export default loadImage;
