import { utilities as csUtils } from '@cornerstonejs/core';
export function getPointInLineOfSightWithCriteria(viewport, worldPos, targetVolumeId, criteriaFunction, stepSize = 0.25) {
    const points = getPointsInLineOfSight(viewport, worldPos, {
        targetVolumeId,
        stepSize,
    });
    let pickedPoint;
    for (const point of points) {
        const intensity = viewport.getIntensityFromWorld(point);
        const pointToPick = criteriaFunction(intensity, point);
        if (pointToPick) {
            pickedPoint = pointToPick;
        }
    }
    return pickedPoint;
}
export function getPointsInLineOfSight(viewport, worldPos, { targetVolumeId, stepSize }) {
    const camera = viewport.getCamera();
    const { viewPlaneNormal: normalDirection } = camera;
    const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera, targetVolumeId);
    const step = spacingInNormalDirection * stepSize || 1;
    const bounds = viewport.getBounds();
    const points = [];
    let currentPos = [...worldPos];
    while (_inBounds(currentPos, bounds)) {
        points.push([...currentPos]);
        currentPos[0] += normalDirection[0] * step;
        currentPos[1] += normalDirection[1] * step;
        currentPos[2] += normalDirection[2] * step;
    }
    currentPos = [...worldPos];
    while (_inBounds(currentPos, bounds)) {
        points.push([...currentPos]);
        currentPos[0] -= normalDirection[0] * step;
        currentPos[1] -= normalDirection[1] * step;
        currentPos[2] -= normalDirection[2] * step;
    }
    return points;
}
const _inBounds = function (point, bounds) {
    const [xMin, xMax, yMin, yMax, zMin, zMax] = bounds;
    const padding = 10;
    return (point[0] > xMin + padding &&
        point[0] < xMax - padding &&
        point[1] > yMin + padding &&
        point[1] < yMax - padding &&
        point[2] > zMin + padding &&
        point[2] < zMax - padding);
};
