declare function getFrameInformation(PerFrameFunctionalGroupsSequence: any, SharedFunctionalGroupsSequence: any, frameNumber: any): {
    shared: any[];
    perFrame: any[];
};
declare function getMultiframeInformation(metaData: any): {
    PerFrameFunctionalGroupsSequence: any;
    SharedFunctionalGroupsSequence: any;
    NumberOfFrames: any;
    rest: any;
};
declare function combineFrameInstance(frameNumber: any, instance: any): any;
export { combineFrameInstance, getMultiframeInformation, getFrameInformation };
