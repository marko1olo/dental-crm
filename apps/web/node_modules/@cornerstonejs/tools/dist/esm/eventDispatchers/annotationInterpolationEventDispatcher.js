import { eventTarget } from '@cornerstonejs/core';
import Events from '../enums/Events';
import InterpolationManager from '../utilities/segmentation/InterpolationManager/InterpolationManager';
const enable = function () {
    eventTarget.addEventListener(Events.ANNOTATION_COMPLETED, InterpolationManager.handleAnnotationCompleted);
    eventTarget.addEventListener(Events.ANNOTATION_MODIFIED, InterpolationManager.handleAnnotationUpdate);
    eventTarget.addEventListener(Events.ANNOTATION_REMOVED, InterpolationManager.handleAnnotationDelete);
};
const disable = function () {
    eventTarget.removeEventListener(Events.ANNOTATION_COMPLETED, InterpolationManager.handleAnnotationCompleted);
    eventTarget.removeEventListener(Events.ANNOTATION_MODIFIED, InterpolationManager.handleAnnotationUpdate);
    eventTarget.removeEventListener(Events.ANNOTATION_REMOVED, InterpolationManager.handleAnnotationDelete);
};
export default {
    enable,
    disable,
};
