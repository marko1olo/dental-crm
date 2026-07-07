import type { DataSet } from 'dicom-parser';
import type { LoadRequestFunction, DICOMLoaderDataSetWithFetchMore } from '../../types';
import { loadedDataSets } from './loadedDataSets';
export interface CornerstoneWadoLoaderCacheManagerInfoResponse {
    cacheSizeInBytes: number;
    numberOfDataSetsCached: number;
}
export interface CornerstoneWadoLoaderCachedPromise extends Promise<DataSet | DICOMLoaderDataSetWithFetchMore> {
    cacheCount?: number;
}
declare function isLoaded(uri: string): boolean;
declare function get(uri: string): DataSet;
declare function update(uri: string, dataSet: DataSet): void;
declare function load(uri: string, loadRequest: LoadRequestFunction, imageId: string): CornerstoneWadoLoaderCachedPromise;
declare function unload(uri: string): void;
export declare function getInfo(): CornerstoneWadoLoaderCacheManagerInfoResponse;
declare function purge(): void;
declare const _default: {
    isLoaded: typeof isLoaded;
    load: typeof load;
    unload: typeof unload;
    getInfo: typeof getInfo;
    purge: typeof purge;
    get: typeof get;
    update: typeof update;
};
export default _default;
export { loadedDataSets };
