import { utilities as csUtils } from '@cornerstonejs/core';
import { getBoundingBoxAroundShapeIJK } from '../boundingBox/getBoundingBoxAroundShape';
const equalsCheck = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
};
export function getVoxelOverlap(imageData, dimensions, voxelSpacing, voxelCenter) {
    const halfSpacingX = voxelSpacing[0] / 2;
    const halfSpacingY = voxelSpacing[1] / 2;
    const halfSpacingZ = voxelSpacing[2] / 2;
    const voxelCornersIJK = new Array(8);
    voxelCornersIJK[0] = csUtils.transformWorldToIndex(imageData, [
        voxelCenter[0] - halfSpacingX,
        voxelCenter[1] - halfSpacingY,
        voxelCenter[2] - halfSpacingZ,
    ]);
    const offsets = [
        [1, -1, -1],
        [-1, 1, -1],
        [1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [-1, 1, 1],
        [1, 1, 1],
    ];
    for (let i = 0; i < 7; i++) {
        const [xOff, yOff, zOff] = offsets[i];
        voxelCornersIJK[i + 1] = csUtils.transformWorldToIndex(imageData, [
            voxelCenter[0] + xOff * halfSpacingX,
            voxelCenter[1] + yOff * halfSpacingY,
            voxelCenter[2] + zOff * halfSpacingZ,
        ]);
    }
    return getBoundingBoxAroundShapeIJK(voxelCornersIJK, dimensions);
}
export function processVolumes(segmentationVolume, thresholdVolumeInformation) {
    const { spacing: segmentationSpacing } = segmentationVolume;
    const scalarDataLength = segmentationVolume.voxelManager.getScalarDataLength();
    const volumeInfoList = [];
    let baseVolumeIdx = 0;
    for (let i = 0; i < thresholdVolumeInformation.length; i++) {
        const { imageData, spacing, dimensions, voxelManager } = thresholdVolumeInformation[i].volume;
        const volumeSize = thresholdVolumeInformation[i].volume.voxelManager.getScalarDataLength();
        if (volumeSize === scalarDataLength &&
            equalsCheck(spacing, segmentationSpacing)) {
            baseVolumeIdx = i;
        }
        const lower = thresholdVolumeInformation[i].lower;
        const upper = thresholdVolumeInformation[i].upper;
        volumeInfoList.push({
            imageData,
            lower,
            upper,
            spacing,
            dimensions,
            volumeSize,
            voxelManager,
        });
    }
    return {
        volumeInfoList,
        baseVolumeIdx,
    };
}
const segmentIndicesCache = new Map();
export const setSegmentationDirty = (segmentationId) => {
    const cached = segmentIndicesCache.get(segmentationId);
    if (cached) {
        cached.isDirty = true;
    }
};
export const setSegmentationClean = (segmentationId) => {
    const cached = segmentIndicesCache.get(segmentationId);
    if (cached) {
        cached.isDirty = false;
    }
};
export const getCachedSegmentIndices = (segmentationId) => {
    const cached = segmentIndicesCache.get(segmentationId);
    if (cached && !cached.isDirty) {
        return cached.indices;
    }
    return null;
};
export const setCachedSegmentIndices = (segmentationId, indices) => {
    segmentIndicesCache.set(segmentationId, { indices, isDirty: false });
};
