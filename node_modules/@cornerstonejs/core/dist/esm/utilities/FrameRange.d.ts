export type FramesRange = [number, number] | number;
export default class FrameRange {
    protected static frameRangeExtractor: RegExp;
    protected static imageIdToFrames(imageId: string): FramesRange;
    static imageIdToFrameEnd(imageId: string): number;
    static imageIdToFrameStart(imageId: string): number;
    static framesToString(range: any): string;
    protected static framesToImageId(imageId: string, range: FramesRange | string): string;
}
