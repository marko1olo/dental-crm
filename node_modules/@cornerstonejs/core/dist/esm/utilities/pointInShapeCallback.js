import { createPositionCallback } from './createPositionCallback';
export function pointInShapeCallback(imageData, options) {
    const { pointInShapeFn, callback, boundsIJK, returnPoints = false } = options;
    let scalarData;
    if (imageData.getScalarData) {
        scalarData = imageData.getScalarData();
    }
    else {
        const scalars = imageData.getPointData().getScalars();
        if (scalars) {
            scalarData = scalars.getData();
        }
        else {
            const { voxelManager } = imageData.get('voxelManager') || {};
            if (voxelManager) {
                scalarData = voxelManager.getCompleteScalarDataArray();
            }
        }
    }
    const dimensions = imageData.getDimensions();
    const defaultBoundsIJK = [
        [0, dimensions[0]],
        [0, dimensions[1]],
        [0, dimensions[2]],
    ];
    const bounds = boundsIJK || defaultBoundsIJK;
    const pointsInShape = iterateOverPointsInShape({
        imageData,
        bounds,
        scalarData,
        pointInShapeFn,
        callback,
    });
    return returnPoints ? pointsInShape : undefined;
}
export function iterateOverPointsInShape({ imageData, bounds, scalarData, pointInShapeFn, callback, }) {
    const [[iMin, iMax], [jMin, jMax], [kMin, kMax]] = bounds;
    const { numComps } = imageData;
    const dimensions = imageData.getDimensions();
    const indexToWorld = createPositionCallback(imageData);
    const pointIJK = [0, 0, 0];
    const xMultiple = numComps ||
        scalarData.length / dimensions[2] / dimensions[1] / dimensions[0];
    const yMultiple = dimensions[0] * xMultiple;
    const zMultiple = dimensions[1] * yMultiple;
    const pointsInShape = [];
    for (let k = kMin; k <= kMax; k++) {
        pointIJK[2] = k;
        const indexK = k * zMultiple;
        for (let j = jMin; j <= jMax; j++) {
            pointIJK[1] = j;
            const indexJK = indexK + j * yMultiple;
            for (let i = iMin; i <= iMax; i++) {
                pointIJK[0] = i;
                const pointLPS = indexToWorld(pointIJK);
                if (pointInShapeFn(pointLPS, pointIJK)) {
                    const index = indexJK + i * xMultiple;
                    let value;
                    if (xMultiple > 2) {
                        value = [
                            scalarData[index],
                            scalarData[index + 1],
                            scalarData[index + 2],
                        ];
                    }
                    else {
                        value = scalarData[index];
                    }
                    pointsInShape.push({
                        value,
                        index,
                        pointIJK,
                        pointLPS: pointLPS.slice(),
                    });
                    callback({ value, index, pointIJK, pointLPS });
                }
            }
        }
    }
    return pointsInShape;
}
export function iterateOverPointsInShapeVoxelManager({ voxelManager, bounds, imageData, pointInShapeFn, callback, returnPoints, }) {
    const [[iMin, iMax], [jMin, jMax], [kMin, kMax]] = bounds;
    const indexToWorld = createPositionCallback(imageData);
    const pointIJK = [0, 0, 0];
    const pointsInShape = [];
    for (let k = kMin; k <= kMax; k++) {
        pointIJK[2] = k;
        for (let j = jMin; j <= jMax; j++) {
            pointIJK[1] = j;
            for (let i = iMin; i <= iMax; i++) {
                pointIJK[0] = i;
                const pointLPS = indexToWorld(pointIJK);
                if (pointInShapeFn(pointLPS, pointIJK)) {
                    const index = voxelManager.toIndex(pointIJK);
                    const value = voxelManager.getAtIndex(index);
                    if (returnPoints) {
                        pointsInShape.push({
                            value,
                            index,
                            pointIJK: [...pointIJK],
                            pointLPS: pointLPS.slice(),
                        });
                    }
                    callback?.({ value, index, pointIJK, pointLPS });
                }
            }
        }
    }
    return pointsInShape;
}
