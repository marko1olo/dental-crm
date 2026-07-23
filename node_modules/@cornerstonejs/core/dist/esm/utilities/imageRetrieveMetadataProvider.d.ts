declare const imageRetrieveMetadataProvider: {
    IMAGE_RETRIEVE_CONFIGURATION: string;
    clear: () => void;
    add: (key: string, payload: any) => void;
    clone: () => Map<string, unknown>;
    restore: (state: Map<string, unknown>) => void;
    get: (type: string, ...queries: string[]) => unknown;
};
export default imageRetrieveMetadataProvider;
