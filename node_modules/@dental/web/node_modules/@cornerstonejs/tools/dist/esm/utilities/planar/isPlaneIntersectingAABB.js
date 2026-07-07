import { vec3 } from 'gl-matrix';
export const isPlaneIntersectingAABB = (origin, normal, minX, minY, minZ, maxX, maxY, maxZ) => {
    const vertices = [
        vec3.fromValues(minX, minY, minZ),
        vec3.fromValues(maxX, minY, minZ),
        vec3.fromValues(minX, maxY, minZ),
        vec3.fromValues(maxX, maxY, minZ),
        vec3.fromValues(minX, minY, maxZ),
        vec3.fromValues(maxX, minY, maxZ),
        vec3.fromValues(minX, maxY, maxZ),
        vec3.fromValues(maxX, maxY, maxZ),
    ];
    const normalVec = vec3.fromValues(normal[0], normal[1], normal[2]);
    const originVec = vec3.fromValues(origin[0], origin[1], origin[2]);
    const planeDistance = -vec3.dot(normalVec, originVec);
    let initialSign = null;
    for (const vertex of vertices) {
        const distance = vec3.dot(normalVec, vertex) + planeDistance;
        if (initialSign === null) {
            initialSign = Math.sign(distance);
        }
        else if (Math.sign(distance) !== initialSign) {
            return true;
        }
    }
    return false;
};
