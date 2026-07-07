import { getAnnotation } from '../../annotation/annotationState';
import { getSegmentation } from '../getSegmentation';
import interpolateSegmentPoints from '../../../utilities/planarFreehandROITool/interpolation/interpolateSegmentPoints';
export default function smoothContours(segmentationId, segmentIndex, options = { knotsRatioPercentage: 30 }) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        console.warn(`Invalid segmentation given ${segmentationId}`);
        return;
    }
    if (!segmentation.representationData.Contour) {
        console.warn(`No contour representation found for segmentation ${segmentationId}`);
        return;
    }
    const contourRepresentationData = segmentation.representationData
        .Contour;
    const { annotationUIDsMap } = contourRepresentationData;
    if (!annotationUIDsMap) {
        console.warn(`No contours found for segmentation ${segmentationId}`);
        return;
    }
    if (!annotationUIDsMap.has(segmentIndex)) {
        console.warn(`Error extracting contour data from segment ${segmentIndex} in segmentation ${segmentationId}`);
        return;
    }
    const annotationList = annotationUIDsMap.get(segmentIndex);
    annotationList.forEach((annotationUID) => {
        const annotation = getAnnotation(annotationUID);
        if (!annotation) {
            return;
        }
        const polyline = annotation.data.contour.polyline;
        if (!polyline || polyline.length < 3) {
            return;
        }
        const smoothedPolyline = interpolateSegmentPoints(polyline, 0, polyline.length - 1, options.knotsRatioPercentage);
        annotation.data.contour.polyline = smoothedPolyline;
    });
}
