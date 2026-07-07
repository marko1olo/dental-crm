import { generateContourSetsFromLabelmap } from '../contours';
import findLargestBidirectional from './findLargestBidirectional';
import getOrCreateSegmentationVolume from './getOrCreateSegmentationVolume';
export default async function contourAndFindLargestBidirectional(segmentation) {
    const contours = await generateContourSetsFromLabelmap({
        segmentations: segmentation,
    });
    if (!contours?.length || !contours[0].sliceContours.length) {
        return;
    }
    const { segments = [
        null,
        { label: 'Unspecified', color: null, containedSegmentIndices: null },
    ], } = segmentation;
    const vol = getOrCreateSegmentationVolume(segmentation.segmentationId);
    if (!vol) {
        return;
    }
    const segmentIndex = segments.findIndex((it) => !!it);
    if (segmentIndex === -1) {
        return;
    }
    segments[segmentIndex].segmentIndex = segmentIndex;
    return findLargestBidirectional(contours[0], vol.volumeId, segments[segmentIndex]);
}
