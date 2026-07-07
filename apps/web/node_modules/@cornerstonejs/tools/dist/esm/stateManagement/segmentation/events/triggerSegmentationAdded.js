import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import { Events } from '../../../enums';
export function triggerSegmentationAdded(segmentationId) {
    const eventDetail = {
        segmentationId,
    };
    triggerEvent(eventTarget, Events.SEGMENTATION_ADDED, eventDetail);
}
