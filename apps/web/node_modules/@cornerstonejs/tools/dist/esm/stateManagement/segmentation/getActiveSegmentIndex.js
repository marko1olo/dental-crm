import { getSegmentation } from './getSegmentation';
export function getActiveSegmentIndex(segmentationId) {
    const segmentation = getSegmentation(segmentationId);
    if (segmentation) {
        const activeSegmentIndex = Object.keys(segmentation.segments).find((segmentIndex) => segmentation.segments[segmentIndex].active);
        return activeSegmentIndex ? Number(activeSegmentIndex) : undefined;
    }
    return undefined;
}
