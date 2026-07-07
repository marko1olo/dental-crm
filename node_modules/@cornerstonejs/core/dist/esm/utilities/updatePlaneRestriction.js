import { isEqual } from '../utilities/isEqual';
import { vec3 } from 'gl-matrix';
const ORTHOGONAL_TEST_VALUE = 0.95;
export function updatePlaneRestriction(points, reference) {
    if (!points?.length || !reference.FrameOfReferenceUID) {
        return;
    }
    reference.planeRestriction ||= {
        FrameOfReferenceUID: reference.FrameOfReferenceUID,
        point: points[0],
        inPlaneVector1: null,
        inPlaneVector2: null,
    };
    const { planeRestriction } = reference;
    if (points.length === 1) {
        planeRestriction.inPlaneVector1 = null;
        planeRestriction.inPlaneVector2 = null;
        return planeRestriction;
    }
    const v1 = vec3.sub(vec3.create(), points[0], points[Math.floor(points.length / 2)]);
    vec3.normalize(v1, v1);
    planeRestriction.inPlaneVector1 = v1;
    planeRestriction.inPlaneVector2 = null;
    const n = points.length;
    if (n > 2) {
        for (let i = Math.floor(n / 3); i < n; i++) {
            const testVector = vec3.sub(vec3.create(), points[i], points[0]);
            const length = vec3.length(testVector);
            if (isEqual(length, 0)) {
                continue;
            }
            if (vec3.dot(testVector, planeRestriction.inPlaneVector1) <
                length * ORTHOGONAL_TEST_VALUE) {
                vec3.normalize(testVector, testVector);
                planeRestriction.inPlaneVector2 = testVector;
                return planeRestriction;
            }
        }
    }
    return planeRestriction;
}
