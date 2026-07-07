import type { Types } from '@cornerstonejs/core';
import type { DataSet } from 'dicom-parser';
declare function getImagePixelModule(dataSet: DataSet): Types.ImagePixelModuleMetadata;
export default getImagePixelModule;
