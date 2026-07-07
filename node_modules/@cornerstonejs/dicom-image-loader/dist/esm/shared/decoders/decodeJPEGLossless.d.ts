import type { ByteArray } from 'dicom-parser';
import type { Types } from '@cornerstonejs/core';
import type { WebWorkerDecodeConfig } from '../../types';
export declare function initialize(decodeConfig?: WebWorkerDecodeConfig): Promise<void>;
declare function decodeJPEGLossless(imageFrame: Types.IImageFrame, pixelData: ByteArray): Promise<Types.IImageFrame>;
export default decodeJPEGLossless;
