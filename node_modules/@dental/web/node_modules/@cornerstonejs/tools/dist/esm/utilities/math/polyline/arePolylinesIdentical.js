import { pointsAreEqual } from './robustSegmentIntersection';
export default function arePolylinesIdentical(poly1, poly2) {
    if (poly1.length !== poly2.length) {
        return false;
    }
    const len = poly1.length;
    if (len === 0) {
        return true;
    }
    let identicalForward = true;
    for (let i = 0; i < len; i++) {
        if (!pointsAreEqual(poly1[i], poly2[i])) {
            identicalForward = false;
            break;
        }
    }
    if (identicalForward) {
        return true;
    }
    let identicalReverse = true;
    for (let i = 0; i < len; i++) {
        if (!pointsAreEqual(poly1[i], poly2[len - 1 - i])) {
            identicalReverse = false;
            break;
        }
    }
    if (identicalReverse) {
        return true;
    }
    for (let offset = 1; offset < len; offset++) {
        let cyclicForward = true;
        for (let i = 0; i < len; i++) {
            if (!pointsAreEqual(poly1[i], poly2[(i + offset) % len])) {
                cyclicForward = false;
                break;
            }
        }
        if (cyclicForward) {
            return true;
        }
        let cyclicReverse = true;
        for (let i = 0; i < len; i++) {
            if (!pointsAreEqual(poly1[i], poly2[(len - 1 - i + offset) % len])) {
                cyclicReverse = false;
                break;
            }
        }
        if (cyclicReverse) {
            return true;
        }
    }
    return false;
}
