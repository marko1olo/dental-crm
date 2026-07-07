import * as math from '../math';
import { checkIntersection, convertContourPolylineToCanvasSpace, } from './sharedOperations';
import arePolylinesIdentical from '../math/polyline/arePolylinesIdentical';
import { getViewReferenceFromAnnotation } from './getViewReferenceFromAnnotation';
import { areViewReferencesEqual } from './areViewReferencesEqual';
export function unifyPolylineSets(polylinesSetA, polylinesSetB) {
    const result = [];
    const processedFromA = new Set();
    const processedFromB = new Set();
    for (let i = 0; i < polylinesSetA.length; i++) {
        if (processedFromA.has(i)) {
            continue;
        }
        const polylineA = polylinesSetA[i];
        let merged = false;
        for (let j = 0; j < polylinesSetB.length; j++) {
            if (processedFromB.has(j)) {
                continue;
            }
            const polylineB = polylinesSetB[j];
            if (!areViewReferencesEqual(polylineA.viewReference, polylineB.viewReference)) {
                continue;
            }
            if (arePolylinesIdentical(polylineA.polyline, polylineB.polyline)) {
                result.push(polylineA);
                processedFromA.add(i);
                processedFromB.add(j);
                merged = true;
                break;
            }
            const intersection = checkIntersection(polylineA.polyline, polylineB.polyline);
            if (intersection.hasIntersection && !intersection.isContourHole) {
                const mergedPolyline = math.polyline.mergePolylines(polylineA.polyline, polylineB.polyline);
                result.push({
                    polyline: mergedPolyline,
                    viewReference: polylineA.viewReference,
                });
                processedFromA.add(i);
                processedFromB.add(j);
                merged = true;
                break;
            }
        }
        if (!merged) {
            result.push(polylineA);
            processedFromA.add(i);
        }
    }
    for (let j = 0; j < polylinesSetB.length; j++) {
        if (!processedFromB.has(j)) {
            result.push(polylinesSetB[j]);
        }
    }
    return result;
}
export function unifyMultiplePolylineSets(polylineSets) {
    if (polylineSets.length === 0) {
        return [];
    }
    if (polylineSets.length === 1) {
        return [...polylineSets[0]];
    }
    let result = [...polylineSets[0]];
    for (let i = 1; i < polylineSets.length; i++) {
        result = unifyPolylineSets(result, polylineSets[i]);
    }
    return result;
}
export function unifyAnnotationPolylines(annotationsSetA, annotationsSetB, viewport) {
    const polylinesSetA = annotationsSetA.map((annotation) => ({
        polyline: convertContourPolylineToCanvasSpace(annotation.data.contour.polyline, viewport),
        viewReference: getViewReferenceFromAnnotation(annotation),
    }));
    const polylinesSetB = annotationsSetB.map((annotation) => ({
        polyline: convertContourPolylineToCanvasSpace(annotation.data.contour.polyline, viewport),
        viewReference: getViewReferenceFromAnnotation(annotation),
    }));
    return unifyPolylineSets(polylinesSetA, polylinesSetB);
}
