import { vec3 } from 'gl-matrix';
import { reflectVector } from './reflectVector';
export function adjustInitialViewUp(initialViewUp, flipHorizontal, flipVertical, viewPlaneNormal) {
    let adjustedInitialViewUp = vec3.clone(initialViewUp);
    if (flipVertical) {
        vec3.negate(adjustedInitialViewUp, adjustedInitialViewUp);
    }
    if (flipHorizontal) {
        const screenVerticalAxis = vec3.cross(vec3.create(), viewPlaneNormal, adjustedInitialViewUp);
        vec3.normalize(screenVerticalAxis, screenVerticalAxis);
        adjustedInitialViewUp = reflectVector(adjustedInitialViewUp, screenVerticalAxis);
    }
    return adjustedInitialViewUp;
}
