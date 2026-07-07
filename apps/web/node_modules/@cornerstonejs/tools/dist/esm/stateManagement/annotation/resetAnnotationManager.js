import { checkAndDefineCachedStatsProperty, checkAndDefineTextBoxProperty, } from './utilities/defineProperties';
import { checkAndSetAnnotationLocked } from './annotationLocking';
import { checkAndSetAnnotationVisibility } from './annotationVisibility';
import { defaultFrameOfReferenceSpecificAnnotationManager } from './FrameOfReferenceSpecificAnnotationManager';
import { setAnnotationManager } from './annotationState';
const defaultManager = defaultFrameOfReferenceSpecificAnnotationManager;
const preprocessingFn = (annotation) => {
    annotation = checkAndDefineTextBoxProperty(annotation);
    annotation = checkAndDefineCachedStatsProperty(annotation);
    const uid = annotation.annotationUID;
    const isLocked = checkAndSetAnnotationLocked(uid);
    annotation.isLocked = isLocked;
    const isVisible = checkAndSetAnnotationVisibility(uid);
    annotation.isVisible = isVisible;
    return annotation;
};
defaultManager.setPreprocessingFn(preprocessingFn);
setAnnotationManager(defaultManager);
export function resetAnnotationManager() {
    setAnnotationManager(defaultManager);
}
