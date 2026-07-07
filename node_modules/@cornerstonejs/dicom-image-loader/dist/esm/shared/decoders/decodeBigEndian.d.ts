import type { ByteArray } from 'dicom-parser';
import type { Types } from '@cornerstonejs/core';
declare function decodeBigEndian(imageFrame: Types.IImageFrame, pixelData: ByteArray): Promise<Types.IImageFrame>;
export default decodeBigEndian;
