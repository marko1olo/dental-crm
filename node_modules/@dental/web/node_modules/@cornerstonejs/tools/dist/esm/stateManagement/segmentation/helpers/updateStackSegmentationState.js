import { cache, eventTarget } from '@cornerstonejs/core';
import { Events, SegmentationRepresentations } from '../../../enums';
import { getSegmentation } from '../getSegmentation';
import { triggerSegmentationDataModified } from '../triggerSegmentationEvents';
import { addSegmentationRepresentations } from '../addSegmentationRepresentationsToViewport';
export async function updateStackSegmentationState({ segmentationId, viewportId, imageIds, options, }) {
    const segmentation = getSegmentation(segmentationId);
    if (options?.removeOriginal) {
        const data = segmentation.representationData
            .Labelmap;
        if (cache.getVolume(data.volumeId)) {
            cache.removeVolumeLoadObject(data.volumeId);
        }
        segmentation.representationData.Labelmap = {
            imageIds,
        };
    }
    else {
        segmentation.representationData.Labelmap = {
            ...segmentation.representationData.Labelmap,
            imageIds,
        };
    }
    await addSegmentationRepresentations(viewportId, [
        {
            segmentationId,
            type: SegmentationRepresentations.Labelmap,
        },
    ]);
    eventTarget.addEventListenerOnce(Events.SEGMENTATION_RENDERED, () => triggerSegmentationDataModified(segmentationId));
}
