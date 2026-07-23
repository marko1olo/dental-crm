export function areViewReferencesEqual(a, b) {
    if (!a || !b) {
        return false;
    }
    if (a.FrameOfReferenceUID !== b.FrameOfReferenceUID) {
        return false;
    }
    if (a.referencedImageId !== b.referencedImageId) {
        return false;
    }
    if (!a.viewPlaneNormal || !b.viewPlaneNormal) {
        return false;
    }
    if (a.viewPlaneNormal.length !== b.viewPlaneNormal.length) {
        return false;
    }
    for (let i = 0; i < a.viewPlaneNormal.length; i++) {
        if (a.viewPlaneNormal[i] !== b.viewPlaneNormal[i]) {
            return false;
        }
    }
    return true;
}
