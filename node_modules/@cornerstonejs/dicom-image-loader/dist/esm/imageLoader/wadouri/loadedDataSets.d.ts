import type { DataSet } from 'dicom-parser';
declare let loadedDataSets: Record<string, {
    dataSet: DataSet;
    cacheCount: number;
}>;
declare const purgeLoadedDataSets: () => void;
export { loadedDataSets, purgeLoadedDataSets };
