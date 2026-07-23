import type { DataSet } from 'dicom-parser';
declare function getUncompressedImageFrame(dataSet: DataSet, frameIndex: number): Uint8Array;
export default getUncompressedImageFrame;
