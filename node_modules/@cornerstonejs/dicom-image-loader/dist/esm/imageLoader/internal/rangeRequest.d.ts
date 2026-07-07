import type { Enums } from '@cornerstonejs/core';
import type { LoaderXhrRequestPromise } from '../../types';
import type { CornerstoneWadoRsLoaderOptions } from '../wadors/loadImage';
export default function rangeRequest(url: string, imageId: string, defaultHeaders?: Record<string, string>, options?: CornerstoneWadoRsLoaderOptions): LoaderXhrRequestPromise<{
    contentType: string;
    pixelData: Uint8Array;
    imageQualityStatus: Enums.ImageQualityStatus;
    percentComplete: number;
}>;
