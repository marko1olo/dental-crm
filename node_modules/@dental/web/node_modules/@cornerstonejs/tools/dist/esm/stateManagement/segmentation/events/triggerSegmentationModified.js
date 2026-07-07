import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import { Events } from '../../../enums';
export function triggerSegmentationModified(segmentationId) {
    const eventDetail = {
        segmentationId,
    };
    triggerEvent(eventTarget, Events.SEGMENTATION_MODIFIED, eventDetail);
}
