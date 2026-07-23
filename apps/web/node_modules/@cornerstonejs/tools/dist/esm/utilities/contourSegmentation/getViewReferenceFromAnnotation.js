export function getViewReferenceFromAnnotation(annotation) {
    const { metadata } = annotation;
    if (!metadata) {
        return {};
    }
    const { FrameOfReferenceUID, referencedImageId, referencedImageURI, multiSliceReference, cameraFocalPoint, viewPlaneNormal, viewUp, sliceIndex, volumeId, bounds, } = metadata;
    const viewReference = {
        FrameOfReferenceUID,
        referencedImageId,
        referencedImageURI,
        multiSliceReference,
        cameraFocalPoint,
        viewPlaneNormal,
        viewUp,
        sliceIndex,
        volumeId,
        bounds,
    };
    return viewReference;
}
