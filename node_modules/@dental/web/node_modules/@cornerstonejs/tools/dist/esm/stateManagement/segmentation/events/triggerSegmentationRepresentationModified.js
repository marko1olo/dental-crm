import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import { Events } from '../../../enums';
export function triggerSegmentationRepresentationModified(viewportId, segmentationId, type) {
    const eventDetail = {
        segmentationId,
        type,
        viewportId,
    };
    triggerEvent(eventTarget, Events.SEGMENTATION_REPRESENTATION_MODIFIED, eventDetail);
}
