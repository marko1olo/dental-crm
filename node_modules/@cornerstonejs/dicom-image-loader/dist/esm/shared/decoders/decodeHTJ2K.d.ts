import type { ByteArray } from 'dicom-parser';
import type { LoaderDecodeOptions } from '../../types';
export declare function initialize(decodeConfig?: LoaderDecodeOptions): Promise<void>;
declare function decodeAsync(compressedImageFrame: ByteArray, imageInfo: any): Promise<any>;
export default decodeAsync;
