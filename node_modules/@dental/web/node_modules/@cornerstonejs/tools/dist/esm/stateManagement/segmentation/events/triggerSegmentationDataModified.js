import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import { Events } from '../../../enums';
import { setSegmentationDirty } from '../../../utilities/segmentation/utilities';
export function triggerSegmentationDataModified(segmentationId, modifiedSlicesToUse, segmentIndex) {
    const eventDetail = {
        segmentationId,
        modifiedSlicesToUse,
        segmentIndex,
    };
    setSegmentationDirty(segmentationId);
    triggerEvent(eventTarget, Events.SEGMENTATION_DATA_MODIFIED, eventDetail);
}
