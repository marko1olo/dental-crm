export default function isContourSegmentationAnnotation(annotation) {
    return !!annotation.data?.segmentation;
}
