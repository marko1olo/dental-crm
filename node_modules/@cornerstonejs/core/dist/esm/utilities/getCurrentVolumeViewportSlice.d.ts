import type { IVolumeViewport } from '../types';
declare function getCurrentVolumeViewportSlice(viewport: IVolumeViewport): {
    width: number;
    height: number;
    scalarData: import("../types").PixelDataTypedArray;
    sliceToIndexMatrix: import("gl-matrix").mat4;
    indexToSliceMatrix: import("gl-matrix").mat4;
};
export { getCurrentVolumeViewportSlice as default, getCurrentVolumeViewportSlice, };
