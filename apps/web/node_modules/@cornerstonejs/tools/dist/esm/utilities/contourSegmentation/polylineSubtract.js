import * as math from '../math';
import { checkIntersection, cleanupPolylines, convertContourPolylineToCanvasSpace, removeDuplicatePoints, } from './sharedOperations';
import arePolylinesIdentical from '../math/polyline/arePolylinesIdentical';
import { getViewReferenceFromAnnotation } from './getViewReferenceFromAnnotation';
import { areViewReferencesEqual } from './areViewReferencesEqual';
export function subtractPolylineSets(polylinesSetA, polylinesSetB) {
    const result = [];
    for (let i = 0; i < polylinesSetA.length; i++) {
        let currentPolylines = [polylinesSetA[i]];
        for (let j = 0; j < polylinesSetB.length; j++) {
            const polylineB = polylinesSetB[j];
            const newPolylines = [];
            for (const currentPolyline of currentPolylines) {
                if (!areViewReferencesEqual(currentPolyline.viewReference, polylineB.viewReference)) {
                    newPolylines.push(currentPolyline);
                    continue;
                }
                if (arePolylinesIdentical(currentPolyline.polyline, polylineB.polyline)) {
                    continue;
                }
                const intersection = checkIntersection(currentPolyline.polyline, polylineB.polyline);
                if (intersection.hasIntersection && !intersection.isContourHole) {
                    const subtractedPolylines = cleanupPolylines(math.polyline.subtractPolylines(currentPolyline.polyline, polylineB.polyline));
                    for (const subtractedPolyline of subtractedPolylines) {
                        const cleaned = removeDuplicatePoints(subtractedPolyline);
                        if (cleaned.length >= 3) {
                            newPolylines.push({
                                polyline: cleaned,
                                viewReference: currentPolyline.viewReference,
                            });
                        }
                    }
                }
                else {
                    newPolylines.push({
                        polyline: currentPolyline.polyline,
                        viewReference: currentPolyline.viewReference,
                    });
                }
            }
            currentPolylines = newPolylines;
        }
        result.push(...currentPolylines);
    }
    return result;
}
export function subtractMultiplePolylineSets(basePolylineSet, subtractorSets) {
    if (subtractorSets.length === 0) {
        return [...basePolylineSet];
    }
    let result = [...basePolylineSet];
    for (let i = 0; i < subtractorSets.length; i++) {
        result = subtractPolylineSets(result, subtractorSets[i]);
    }
    return result;
}
export function subtractAnnotationPolylines(baseAnnotations, subtractorAnnotations, viewport) {
    const basePolylines = baseAnnotations.map((annotation) => ({
        polyline: convertContourPolylineToCanvasSpace(annotation.data.contour.polyline, viewport),
        viewReference: getViewReferenceFromAnnotation(annotation),
    }));
    const subtractorPolylines = subtractorAnnotations.map((annotation) => ({
        polyline: convertContourPolylineToCanvasSpace(annotation.data.contour.polyline, viewport),
        viewReference: getViewReferenceFromAnnotation(annotation),
    }));
    return subtractPolylineSets(basePolylines, subtractorPolylines);
}
