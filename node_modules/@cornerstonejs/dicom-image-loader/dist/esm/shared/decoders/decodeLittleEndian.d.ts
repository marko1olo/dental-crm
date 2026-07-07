import type { ByteArray } from 'dicom-parser';
import type { Types } from '@cornerstonejs/core';
declare function decodeLittleEndian(imageFrame: Types.IImageFrame, pixelData: ByteArray): Promise<Types.IImageFrame>;
export default decodeLittleEndian;
