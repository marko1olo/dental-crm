import { vec3 } from 'gl-matrix';
function _getAreaVector(polyline) {
    const vecArea = vec3.create();
    const refPoint = polyline[0];
    for (let i = 0, len = polyline.length; i < len; i++) {
        const p1 = polyline[i];
        const p2Index = i === len - 1 ? 0 : i + 1;
        const p2 = polyline[p2Index];
        const aX = p1[0] - refPoint[0];
        const aY = p1[1] - refPoint[1];
        const aZ = p1[2] - refPoint[2];
        const bX = p2[0] - refPoint[0];
        const bY = p2[1] - refPoint[1];
        const bZ = p2[2] - refPoint[2];
        vecArea[0] += aY * bZ - aZ * bY;
        vecArea[1] += aZ * bX - aX * bZ;
        vecArea[2] += aX * bY - aY * bX;
    }
    vec3.scale(vecArea, vecArea, 0.5);
    return vecArea;
}
export default function getNormal3(polyline) {
    const vecArea = _getAreaVector(polyline);
    return vec3.normalize(vecArea, vecArea);
}
