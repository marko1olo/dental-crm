declare function getDirectFrameInformation(dataSet: any, frame: any): {
    NumberOfFrames: any;
    PerFrameFunctionalInformation: {};
    SharedFunctionalInformation: {};
} | {
    NumberOfFrames: any;
    PerFrameFunctionalInformation?: undefined;
    SharedFunctionalInformation?: undefined;
};
declare function getFrameInformation(PerFrameFunctionalGroupsSequence: any, SharedFunctionalGroupsSequence: any, frameNumber: any): {
    shared: {};
    perFrame: {};
};
declare function getMultiframeInformation(dataSet: any): {
    NumberOfFrames: any;
    PerFrameFunctionalGroupsSequence: any;
    SharedFunctionalGroupsSequence: any;
    otherElements: any;
    otherAttributtes: any;
};
declare function combineFrameInstanceDataset(frameNumber: any, dataSet: any): any;
export { combineFrameInstanceDataset, getMultiframeInformation, getFrameInformation, getDirectFrameInformation, };
