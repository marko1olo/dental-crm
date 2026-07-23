import getViewportsForAnnotation from './getViewportsForAnnotation';
export default function getViewportForAnnotation(annotation) {
    const viewports = getViewportsForAnnotation(annotation);
    if (!viewports?.length) {
        return undefined;
    }
    const viewport = viewports.find((viewport) => viewport
        .getImageIds()
        .some((imageId) => imageId === annotation.metadata.referencedImageId));
    return viewport ?? viewports[0];
}
