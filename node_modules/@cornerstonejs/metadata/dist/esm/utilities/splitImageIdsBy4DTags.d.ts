interface MultiframeSplitResult {
    imageIdGroups: string[][];
    splittingTag: string;
}
declare function generateFrameImageId(baseImageId: string, frameNumber: number): string;
declare function handleMultiframe4D(imageIds: string[]): MultiframeSplitResult | null;
declare function splitImageIdsBy4DTags(imageIds: string[]): {
    imageIdGroups: string[][];
    splittingTag: string | null;
};
export default splitImageIdsBy4DTags;
export { handleMultiframe4D, generateFrameImageId };
