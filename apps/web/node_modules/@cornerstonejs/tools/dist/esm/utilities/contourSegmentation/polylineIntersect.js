import { checkIntersection, cleanupPolylines } from './sharedOperations';
import { intersectPolylines } from '../math/polyline';
import arePolylinesIdentical from '../math/polyline/arePolylinesIdentical';
import { areViewReferencesEqual } from './areViewReferencesEqual';
export function intersectPolylinesSets(set1, set2) {
    if (!set1.length || !set2.length) {
        return [];
    }
    const result = [];
    for (const polyA of set1) {
        for (const polyB of set2) {
            if (!areViewReferencesEqual(polyA.viewReference, polyB.viewReference)) {
                continue;
            }
            if (arePolylinesIdentical(polyA.polyline, polyB.polyline)) {
                result.push({ ...polyA });
                continue;
            }
            const intersection = checkIntersection(polyA.polyline, polyB.polyline);
            if (intersection.hasIntersection && !intersection.isContourHole) {
                const intersectionRegions = cleanupPolylines(intersectPolylines(polyA.polyline, polyB.polyline));
                if (intersectionRegions && intersectionRegions.length > 0) {
                    intersectionRegions.forEach((region) => {
                        result.push({
                            polyline: region,
                            viewReference: polyA.viewReference,
                        });
                    });
                }
            }
        }
    }
    return result;
}
