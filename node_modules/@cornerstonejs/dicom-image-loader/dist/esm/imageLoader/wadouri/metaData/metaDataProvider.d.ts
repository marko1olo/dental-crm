import * as dicomParser from 'dicom-parser';
declare function metaDataProvider(type: any, imageId: any): any;
export declare function metadataForDataset(type: any, imageId: any, dataSet: dicomParser.DataSet): any;
export default metaDataProvider;
