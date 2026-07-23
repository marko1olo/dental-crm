export default function areSameSegment(firstAnnotation, secondAnnotation) {
    const { segmentation: firstSegmentation } = firstAnnotation.data;
    const { segmentation: secondSegmentation } = secondAnnotation.data;
    return (firstSegmentation.segmentationId === secondSegmentation.segmentationId &&
        firstSegmentation.segmentIndex === secondSegmentation.segmentIndex);
}
