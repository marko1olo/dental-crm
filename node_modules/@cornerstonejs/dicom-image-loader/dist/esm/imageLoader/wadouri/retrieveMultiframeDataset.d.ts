declare function _get(uri: any): {
    dataSet: import("dicom-parser").DataSet;
    cacheCount: number;
};
declare function isMultiframeDataset(uri: any): boolean;
declare function retrieveMultiframeDataset(uri: any): {
    dataSet: any;
    frame: number;
};
declare function generateMultiframeWADOURIs(uri: any): any[];
declare const _default: {
    _get: typeof _get;
    generateMultiframeWADOURIs: typeof generateMultiframeWADOURIs;
    retrieveMultiframeDataset: typeof retrieveMultiframeDataset;
    isMultiframeDataset: typeof isMultiframeDataset;
};
export default _default;
