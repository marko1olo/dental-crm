import type { ByteArray } from 'dicom-parser';
import type { DICOMLoaderImageOptions, DICOMLoaderIImage } from '../types';
import type { Types } from '@cornerstonejs/core';
declare function createImage(imageId: string, pixelData: ByteArray, transferSyntax: string, options?: DICOMLoaderImageOptions): Promise<DICOMLoaderIImage | Types.IImageFrame>;
export default createImage;
