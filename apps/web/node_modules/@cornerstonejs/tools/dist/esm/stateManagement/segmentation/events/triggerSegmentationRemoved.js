import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import { Events } from '../../../enums';
export function triggerSegmentationRemoved(segmentationId) {
    const eventDetail = {
        segmentationId,
    };
    triggerEvent(eventTarget, Events.SEGMENTATION_REMOVED, eventDetail);
}
