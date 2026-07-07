import { eventTarget, triggerEvent } from '@cornerstonejs/core';
import { Events } from '../../enums';
import { isAnnotationSelected, deselectAnnotation, } from './annotationSelection';
import { getAnnotation } from './annotationState';
const globalHiddenAnnotationUIDsSet = new Set();
function setAnnotationVisibility(annotationUID, visible = true) {
    const detail = makeEventDetail();
    if (annotationUID) {
        if (visible) {
            show(annotationUID, globalHiddenAnnotationUIDsSet, detail);
        }
        else {
            hide(annotationUID, globalHiddenAnnotationUIDsSet, detail);
        }
    }
    publish(detail);
}
function showAllAnnotations() {
    const detail = makeEventDetail();
    globalHiddenAnnotationUIDsSet.forEach((annotationUID) => {
        show(annotationUID, globalHiddenAnnotationUIDsSet, detail);
    });
    publish(detail);
}
function isAnnotationVisible(annotationUID) {
    const annotation = getAnnotation(annotationUID);
    if (annotation) {
        return !globalHiddenAnnotationUIDsSet.has(annotationUID);
    }
}
function makeEventDetail() {
    return Object.freeze({
        lastVisible: [],
        lastHidden: [],
        hidden: [],
    });
}
function show(annotationUID, annotationUIDsSet, detail) {
    if (annotationUIDsSet.delete(annotationUID)) {
        detail.lastVisible.push(annotationUID);
        const annotation = getAnnotation(annotationUID);
        annotation.isVisible = true;
    }
}
function hide(annotationUID, annotationUIDsSet, detail) {
    if (!annotationUIDsSet.has(annotationUID)) {
        annotationUIDsSet.add(annotationUID);
        if (isAnnotationSelected(annotationUID)) {
            deselectAnnotation(annotationUID);
        }
        detail.lastHidden.push(annotationUID);
        const annotation = getAnnotation(annotationUID);
        annotation.isVisible = false;
    }
}
function publish(detail) {
    if (detail.lastHidden.length > 0 || detail.lastVisible.length > 0) {
        globalHiddenAnnotationUIDsSet.forEach((item) => void detail.hidden.push(item));
        triggerEvent(eventTarget, Events.ANNOTATION_VISIBILITY_CHANGE, detail);
    }
}
function checkAndSetAnnotationVisibility(annotationUID) {
    const isVisible = !globalHiddenAnnotationUIDsSet.has(annotationUID);
    setAnnotationVisibility(annotationUID, isVisible);
    return isVisible;
}
export { setAnnotationVisibility, showAllAnnotations, isAnnotationVisible, checkAndSetAnnotationVisibility, };
