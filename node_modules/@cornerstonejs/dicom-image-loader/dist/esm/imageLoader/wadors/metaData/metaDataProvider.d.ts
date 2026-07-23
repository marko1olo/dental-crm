declare function metaDataProvider(type: any, imageId: any): {};
export declare function getImageUrlModule(imageId: any, metaData: any): {
    isVideo: string | false;
    rendered: any;
    thumbnail: any;
};
export declare function getCineModule(imageId: any, metaData: any): {
    cineRate: string;
    numberOfFrames: number;
};
export declare function getTransferSyntax(imageId: any, metaData: any): {
    transferSyntaxUID: string;
};
export default metaDataProvider;
