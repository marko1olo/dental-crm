import { getAnnotations } from '../../../stateManagement/annotation/annotationState';
const DEFAULT_CONTOUR_SEG_TOOLNAME = 'PlanarFreehandContourSegmentationTool';
export default function getInterpolationData(viewportData, filterParams = []) {
    const { viewport, sliceData, annotation } = viewportData;
    const interpolationDatas = new Map();
    const { toolName, originalToolName } = annotation.metadata;
    const testToolName = originalToolName || toolName;
    const annotations = (getAnnotations(testToolName, viewport.element) || []).filter((annotation) => !annotation.metadata.originalToolName ||
        annotation.metadata.originalToolName === testToolName);
    if (testToolName !== DEFAULT_CONTOUR_SEG_TOOLNAME) {
        const modifiedAnnotations = getAnnotations(DEFAULT_CONTOUR_SEG_TOOLNAME, viewport.element);
        if (modifiedAnnotations?.length) {
            modifiedAnnotations.forEach((annotation) => {
                const { metadata } = annotation;
                if (metadata.originalToolName === testToolName &&
                    metadata.originalToolName !== metadata.toolName) {
                    annotations.push(annotation);
                }
            });
        }
    }
    if (!annotations?.length) {
        return interpolationDatas;
    }
    for (let i = 0; i < sliceData.numberOfSlices; i++) {
        const imageAnnotations = annotations.filter((x) => x.metadata.sliceIndex === i);
        if (!imageAnnotations?.length) {
            continue;
        }
        const filteredInterpolatedAnnotations = imageAnnotations.filter((imageAnnotation) => {
            return filterParams.every((x) => {
                const parent = x.parentKey
                    ? x.parentKey(imageAnnotation)
                    : imageAnnotation;
                const value = parent?.[x.key];
                if (Array.isArray(value)) {
                    return value.every((item, index) => item === x.value[index]);
                }
                return value === x.value;
            });
        });
        if (filteredInterpolatedAnnotations.length) {
            interpolationDatas.set(i, filteredInterpolatedAnnotations);
        }
    }
    return interpolationDatas;
}
