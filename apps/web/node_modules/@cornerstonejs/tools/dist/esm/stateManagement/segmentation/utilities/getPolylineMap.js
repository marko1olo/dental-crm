import { getAnnotationMapFromSegmentation, } from './getAnnotationMapFromSegmentation';
function closePolyline(polyline, closed) {
    if (!polyline || polyline.length === 0) {
        return [];
    }
    if (!closed) {
        return [...polyline];
    }
    const firstPoint = polyline[0];
    const lastPoint = polyline[polyline.length - 1];
    const isAlreadyClosed = firstPoint[0] === lastPoint[0] &&
        firstPoint[1] === lastPoint[1] &&
        firstPoint[2] === lastPoint[2];
    if (isAlreadyClosed) {
        return [...polyline];
    }
    return [...polyline, firstPoint];
}
export function getPolylinesMap(contourRepresentationData, segmentIndex) {
    const { annotationUIDsInSegmentMap } = getAnnotationMapFromSegmentation(contourRepresentationData);
    if (!annotationUIDsInSegmentMap.has(segmentIndex)) {
        console.warn(`No contour information found for segmentIndex ${segmentIndex}`);
        return;
    }
    const polylines = new Map();
    const annotationsInfo = annotationUIDsInSegmentMap.get(segmentIndex);
    for (const annotationInfo of annotationsInfo) {
        polylines.set(annotationInfo.annotationUID, closePolyline(annotationInfo.polyline, annotationInfo.isClosed));
        for (let i = 0; i < annotationInfo.holesUIDs?.length; i++) {
            polylines.set(annotationInfo.holesUIDs[i], closePolyline(annotationInfo.holesPolyline[i], annotationInfo.holesClosed[i]));
        }
    }
    return polylines;
}
