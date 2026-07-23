import type { ByteArray, DataSet } from 'dicom-parser';
declare function getPixelData(dataSet: DataSet, frameIndex?: number): ByteArray;
export default getPixelData;
