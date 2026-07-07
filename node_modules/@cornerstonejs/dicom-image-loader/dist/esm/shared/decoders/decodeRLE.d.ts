import type { ByteArray } from 'dicom-parser';
import type { Types } from '@cornerstonejs/core';
declare function decodeRLE(imageFrame: Types.IImageFrame, pixelData: ByteArray): Promise<Types.IImageFrame>;
export default decodeRLE;
