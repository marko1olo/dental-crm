import type { DataSet } from 'dicom-parser';
declare function getImageTypeSubItemFromDataset(dataSet: DataSet, index: number): string;
declare function extractOrientationFromDataset(dataSet: DataSet): number[];
declare function extractPositionFromDataset(dataSet: DataSet): number[];
declare function extractSpacingFromDataset(dataSet: DataSet): number[];
declare function extractSliceThicknessFromDataset(dataSet: DataSet): number;
export { extractOrientationFromDataset, extractPositionFromDataset, extractSliceThicknessFromDataset, extractSpacingFromDataset, getImageTypeSubItemFromDataset, };
