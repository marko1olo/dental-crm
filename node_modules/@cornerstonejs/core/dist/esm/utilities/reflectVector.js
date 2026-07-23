import { vec3 } from 'gl-matrix';
export function reflectVector(v, normal) {
    const dotProduct = vec3.dot(v, normal);
    const scaledNormal = vec3.scale(vec3.create(), normal, 2 * dotProduct);
    return vec3.sub(vec3.create(), v, scaledNormal);
}
