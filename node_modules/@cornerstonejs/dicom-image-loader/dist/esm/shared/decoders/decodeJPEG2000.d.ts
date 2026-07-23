import type { Types } from '@cornerstonejs/core';
import type { WebWorkerDecodeConfig } from '../../types';
export declare function initialize(decodeConfig?: WebWorkerDecodeConfig): Promise<void>;
declare function decodeAsync(compressedImageFrame: any, imageInfo: any): Promise<Types.IImageFrame>;
export default decodeAsync;
