import * as math from '../math';
function findAllIntersectingContours(viewport, sourcePolyline, contourSegmentationAnnotations) {
    const intersectingContours = [];
    const sourceAABB = math.polyline.getAABB(sourcePolyline);
    for (let i = 0; i < contourSegmentationAnnotations.length; i++) {
        const targetAnnotation = contourSegmentationAnnotations[i];
        const targetPolyline = convertContourPolylineToCanvasSpace(targetAnnotation.data.contour.polyline, viewport);
        const targetAABB = math.polyline.getAABB(targetPolyline);
        const aabbIntersect = math.aabb.intersectAABB(sourceAABB, targetAABB);
        if (!aabbIntersect) {
            continue;
        }
        const lineSegmentsIntersect = math.polyline.intersectPolyline(sourcePolyline, targetPolyline);
        const isContourHole = !lineSegmentsIntersect &&
            math.polyline.containsPoints(targetPolyline, sourcePolyline);
        if (lineSegmentsIntersect || isContourHole) {
            intersectingContours.push({
                targetAnnotation,
                targetPolyline,
                isContourHole,
            });
        }
    }
    return intersectingContours;
}
function convertContourPolylineToCanvasSpace(polyline, viewport) {
    const numPoints = polyline.length;
    const projectedPolyline = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
        projectedPolyline[i] = viewport.worldToCanvas(polyline[i]);
    }
    return projectedPolyline;
}
export { findAllIntersectingContours };
