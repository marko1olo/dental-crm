import { utilities } from '@cornerstonejs/core';
const epsilon = 1e-6;
export function projectTo2D(polyline) {
    let sharedDimensionIndex;
    const testPoints = utilities.getRandomSampleFromArray(polyline, 50);
    for (let i = 0; i < 3; i++) {
        if (testPoints.every((point, index, array) => Math.abs(point[i] - array[0][i]) < epsilon)) {
            sharedDimensionIndex = i;
            break;
        }
    }
    if (sharedDimensionIndex === undefined) {
        throw new Error('Cannot find a shared dimension index for polyline, probably oblique plane');
    }
    const points2D = [];
    const firstDim = (sharedDimensionIndex + 1) % 3;
    const secondDim = (sharedDimensionIndex + 2) % 3;
    for (let i = 0; i < polyline.length; i++) {
        points2D.push([polyline[i][firstDim], polyline[i][secondDim]]);
    }
    return {
        sharedDimensionIndex,
        projectedPolyline: points2D,
    };
}
