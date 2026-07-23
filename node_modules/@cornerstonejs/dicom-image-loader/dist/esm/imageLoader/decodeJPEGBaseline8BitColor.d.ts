import type { ByteArray } from 'dicom-parser';
import type { Types } from '@cornerstonejs/core';
declare function decodeJPEGBaseline8BitColor(imageFrame: Types.IImageFrame, pixelData: ByteArray, canvas: HTMLCanvasElement): Promise<Types.IImageFrame>;
export default decodeJPEGBaseline8BitColor;
