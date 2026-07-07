import { getAnnotation } from '../../annotation/annotationState';
export function getAnnotationMapFromSegmentation(contourRepresentationData, options = {}) {
    const annotationMap = contourRepresentationData.annotationUIDsMap;
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : Array.from(annotationMap.keys());
    const annotationUIDsInSegmentMap = new Map();
    segmentIndices.forEach((index) => {
        const annotationUIDsInSegment = annotationMap.get(index);
        let uids = Array.from(annotationUIDsInSegment);
        uids = uids.filter((uid) => !getAnnotation(uid).parentAnnotationUID);
        const annotations = uids.map((uid) => {
            const annotation = getAnnotation(uid);
            const hasChildAnnotations = annotation.childAnnotationUIDs?.length;
            const childPolylinesInformation = hasChildAnnotations &&
                annotation.childAnnotationUIDs.map((childUID) => {
                    const childAnnotation = getAnnotation(childUID);
                    return {
                        polyline: childAnnotation.data.contour.polyline,
                        isClosed: childAnnotation.data.contour.closed,
                    };
                });
            const holesClosed = hasChildAnnotations &&
                childPolylinesInformation.map((childInfo) => childInfo.isClosed);
            const childPolylines = hasChildAnnotations &&
                childPolylinesInformation.map((childInfo) => childInfo.polyline);
            return {
                polyline: annotation.data.contour.polyline,
                isClosed: annotation.data.contour.closed,
                annotationUID: annotation.annotationUID,
                referencedImageId: annotation.metadata.referencedImageId,
                holesPolyline: childPolylines,
                holesUIDs: annotation.childAnnotationUIDs,
                holesClosed,
            };
        });
        annotationUIDsInSegmentMap.set(index, annotations);
    });
    return { segmentIndices, annotationUIDsInSegmentMap };
}
