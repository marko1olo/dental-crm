import getInterpolationData from './getInterpolationData';
export default function getInterpolationDataCollection(viewportData, filterParams) {
    const imageAnnotations = getInterpolationData(viewportData, filterParams);
    const interpolatedDataCollection = [];
    if (!imageAnnotations?.size) {
        return interpolatedDataCollection;
    }
    for (const annotations of imageAnnotations.values()) {
        annotations.forEach((annotation) => {
            interpolatedDataCollection.push(annotation);
        });
    }
    return interpolatedDataCollection;
}
