import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import { Events } from '../../../enums';
export function triggerSegmentationRepresentationRemoved(viewportId, segmentationId, type) {
    const eventDetail = {
        viewportId,
        segmentationId,
        type,
    };
    triggerEvent(eventTarget, Events.SEGMENTATION_REPRESENTATION_REMOVED, eventDetail);
}
