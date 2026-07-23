import type { DataSet } from 'dicom-parser';
declare function getNumberValues(dataSet: DataSet, tag: string, minimumLength: number): number[];
export default getNumberValues;
