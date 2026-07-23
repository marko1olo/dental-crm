import { Enums } from '@cornerstonejs/core';
export default function extractMultipart(contentType: string, imageFrameAsArrayBuffer: any, options?: any): {
    contentType: string;
    imageQualityStatus: Enums.ImageQualityStatus;
    pixelData: Uint8Array;
    extractDone?: undefined;
    tokenIndex?: undefined;
    responseHeaders?: undefined;
    boundary?: undefined;
    multipartContentType?: undefined;
} | {
    contentType: any;
    extractDone: boolean;
    tokenIndex: any;
    responseHeaders: any;
    boundary: any;
    multipartContentType: any;
    pixelData: any;
    imageQualityStatus?: undefined;
};
export declare function findBoundary(header: string[]): string;
export declare function findContentType(header: string[]): string;
export declare function uint8ArrayToString(data: any, offset: any, length: any): string;
