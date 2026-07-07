import type { WADORSMetaData } from '../../types';
declare let metadataByImageURI: any[];
declare function retrieveMultiframeMetadataImageId(imageId: any): {
    metadata: any;
    frame: number;
};
declare function isMultiframe(metadata: any): boolean;
declare function add(imageId: string, metadata: WADORSMetaData): void;
declare function get(imageId: string): WADORSMetaData;
declare function remove(imageId: any): void;
declare function purge(): void;
export { metadataByImageURI, isMultiframe, retrieveMultiframeMetadataImageId };
declare const _default: {
    add: typeof add;
    get: typeof get;
    remove: typeof remove;
    purge: typeof purge;
};
export default _default;
