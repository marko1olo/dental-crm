import { eventTarget, triggerEvent } from '@cornerstonejs/core';
import { Events } from '../../enums';
import { getAnnotation } from './annotationState';
const globalLockedAnnotationUIDsSet = new Set();
function setAnnotationLocked(annotationUID, locked = true) {
    const detail = makeEventDetail();
    if (annotationUID) {
        if (locked) {
            lock(annotationUID, globalLockedAnnotationUIDsSet, detail);
        }
        else {
            unlock(annotationUID, globalLockedAnnotationUIDsSet, detail);
        }
    }
    publish(detail, globalLockedAnnotationUIDsSet);
}
function unlockAllAnnotations() {
    const detail = makeEventDetail();
    clearLockedAnnotationsSet(globalLockedAnnotationUIDsSet, detail);
    publish(detail, globalLockedAnnotationUIDsSet);
}
function getAnnotationsLocked() {
    return Array.from(globalLockedAnnotationUIDsSet);
}
function isAnnotationLocked(annotationUID) {
    return globalLockedAnnotationUIDsSet.has(annotationUID);
}
function getAnnotationsLockedCount() {
    return globalLockedAnnotationUIDsSet.size;
}
function checkAndSetAnnotationLocked(annotationUID) {
    const isLocked = isAnnotationLocked(annotationUID);
    setAnnotationLocked(annotationUID, isLocked);
    return isLocked;
}
function makeEventDetail() {
    return Object.freeze({
        added: [],
        removed: [],
        locked: [],
    });
}
function lock(annotationUID, lockedAnnotationUIDsSet, detail) {
    if (!lockedAnnotationUIDsSet.has(annotationUID)) {
        lockedAnnotationUIDsSet.add(annotationUID);
        detail.added.push(annotationUID);
        const annotation = getAnnotation(annotationUID);
        if (annotation) {
            annotation.isLocked = true;
        }
    }
}
function unlock(annotationUID, lockedAnnotationUIDsSet, detail) {
    if (lockedAnnotationUIDsSet.delete(annotationUID)) {
        detail.removed.push(annotationUID);
        const annotation = getAnnotation(annotationUID);
        if (annotation) {
            annotation.isLocked = false;
        }
    }
}
function clearLockedAnnotationsSet(lockedAnnotationUIDsSet, detail) {
    lockedAnnotationUIDsSet.forEach((annotationUID) => {
        unlock(annotationUID, lockedAnnotationUIDsSet, detail);
    });
}
function publish(detail, lockedAnnotationUIDsSet) {
    if (detail.added.length > 0 || detail.removed.length > 0) {
        lockedAnnotationUIDsSet.forEach((item) => void detail.locked.push(item));
        triggerEvent(eventTarget, Events.ANNOTATION_LOCK_CHANGE, detail);
    }
}
export { setAnnotationLocked, getAnnotationsLocked, getAnnotationsLockedCount, unlockAllAnnotations, isAnnotationLocked, checkAndSetAnnotationLocked, };
