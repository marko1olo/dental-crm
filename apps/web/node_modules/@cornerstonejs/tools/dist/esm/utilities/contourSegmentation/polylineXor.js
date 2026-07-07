import { cleanupPolylines } from './sharedOperations';
import arePolylinesIdentical from '../math/polyline/arePolylinesIdentical';
import { subtractPolylineSets } from './polylineSubtract';
import { areViewReferencesEqual } from './areViewReferencesEqual';
export function xorPolylinesSets(polylinesSetA, polylinesSetB) {
    if (!polylinesSetA.length && !polylinesSetB.length) {
        return [];
    }
    if (!polylinesSetA.length) {
        return polylinesSetB;
    }
    if (!polylinesSetB.length) {
        return polylinesSetA;
    }
    if (polylinesSetA.length === polylinesSetB.length) {
        let allIdentical = true;
        for (let i = 0; i < polylinesSetA.length; i++) {
            let foundMatch = false;
            for (let j = 0; j < polylinesSetB.length; j++) {
                if (!areViewReferencesEqual(polylinesSetA[i].viewReference, polylinesSetB[j].viewReference)) {
                    continue;
                }
                if (arePolylinesIdentical(polylinesSetA[i].polyline, polylinesSetB[j].polyline)) {
                    foundMatch = true;
                    break;
                }
            }
            if (!foundMatch) {
                allIdentical = false;
                break;
            }
        }
        if (allIdentical) {
            return [];
        }
    }
    const aMinusB = subtractPolylineSets(polylinesSetA, polylinesSetB);
    const bMinusA = subtractPolylineSets(polylinesSetB, polylinesSetA);
    const xorResult = [...aMinusB, ...bMinusA];
    return xorResult;
}
