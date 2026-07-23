export declare const triggerWorkerProgress: (workerType: any, progress: any) => void;
export declare const getSegmentationDataForWorker: (segmentationId: any, segmentIndices: any) => {
    operationData: {
        segmentationId: any;
        volumeId: string;
        imageIds: string[];
    };
    segVolumeId: string;
    segImageIds: string[];
    reconstructableVolume: boolean;
    indices: any;
};
export declare const prepareVolumeStrategyDataForWorker: (operationData: any) => {
    segmentationImageData: any;
    segmentationScalarData: any;
    imageScalarData: any;
    segmentationVoxelManager: any;
    imageVoxelManager: any;
    imageData: any;
};
export declare const prepareImageInfo: (imageVoxelManager: any, imageData: any) => {
    scalarData: any;
    dimensions: any;
    spacing: any;
    origin: any;
    direction: any;
};
export declare const prepareStackDataForWorker: (segImageIds: any) => {
    segmentationInfo: any[];
    imageInfo: any[];
};
export declare const getImageReferenceInfo: (segVolumeId: any, segImageIds: any) => {
    refImageId: any;
    modalityUnitOptions: {
        isPreScaled: boolean;
        isSuvScaled: boolean;
    };
};
