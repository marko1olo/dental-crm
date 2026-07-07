import { BaseVolumeViewport, utilities } from '@cornerstonejs/core';
const { isEqual } = utilities;
const acquisitionMapping = {
    toIJK: (ijkPrime) => ijkPrime,
    fromIJK: (ijk) => ijk,
    type: 'acquistion',
};
const jkMapping = {
    toIJK: ([j, k, i]) => [i, j, k],
    fromIJK: ([i, j, k]) => [j, k, i],
    type: 'jk',
};
const ikMapping = {
    toIJK: ([i, k, j]) => [i, j, k],
    fromIJK: ([i, j, k]) => [i, k, j],
    type: 'ik',
};
export default function normalizeViewportPlane(viewport, boundsIJK) {
    if (!(viewport instanceof BaseVolumeViewport)) {
        return { ...acquisitionMapping, boundsIJKPrime: boundsIJK };
    }
    const { viewPlaneNormal } = viewport.getCamera();
    const mapping = (isEqual(Math.abs(viewPlaneNormal[0]), 1) && jkMapping) ||
        (isEqual(Math.abs(viewPlaneNormal[1]), 1) && ikMapping) ||
        (isEqual(Math.abs(viewPlaneNormal[2]), 1) && acquisitionMapping);
    if (!mapping) {
        return {
            toIJK: null,
            boundsIJKPrime: null,
            fromIJK: null,
            error: `Only mappings orthogonal to acquisition plane are permitted, but requested ${viewPlaneNormal}`,
        };
    }
    return { ...mapping, boundsIJKPrime: mapping.fromIJK(boundsIJK) };
}
