declare const metadataProvider: {
    add: (imageId: string, payload: {
        metadata: unknown;
        type: string;
    }) => void;
    addRaw: (imageId: string, payload: {
        metadata: unknown;
        type: string;
    }) => void;
    get: (type: string, imageId: string) => unknown;
    clear: () => void;
};
export default metadataProvider;
