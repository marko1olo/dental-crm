import { volumeLoader, utilities as csUtils } from '@cornerstonejs/core';
import { run } from './runGrowCut';
const POSITIVE_SEED_VALUE = 254;
const NEGATIVE_SEED_VALUE = 255;
const NEGATIVE_PIXEL_RANGE = [-Infinity, -995];
const POSITIVE_PIXEL_RANGE = [0, 1900];
function _setNegativeSeedValues(subVolume, labelmap, options) {
    const { negativeSeedValue = NEGATIVE_SEED_VALUE, negativePixelRange = NEGATIVE_PIXEL_RANGE, } = options;
    const subVolPixelData = subVolume.voxelManager.getCompleteScalarDataArray();
    const [width, height, numSlices] = labelmap.dimensions;
    const middleSliceIndex = Math.floor(numSlices / 2);
    const visited = new Array(width * height).fill(false);
    const sliceOffset = middleSliceIndex * width * height;
    const bfs = (startX, startY) => {
        const queue = [[startX, startY]];
        while (queue.length) {
            const [x, y] = queue.shift();
            const slicePixelIndex = y * width + x;
            if (x < 0 ||
                x >= width ||
                y < 0 ||
                y >= height ||
                visited[slicePixelIndex]) {
                continue;
            }
            visited[slicePixelIndex] = true;
            const volumeVoxelIndex = sliceOffset + slicePixelIndex;
            const volumeVoxelValue = subVolPixelData[volumeVoxelIndex];
            if (volumeVoxelValue < negativePixelRange[0] ||
                volumeVoxelValue > negativePixelRange[1]) {
                continue;
            }
            labelmap.voxelManager.setAtIndex(volumeVoxelIndex, negativeSeedValue);
            queue.push([x - 1, y]);
            queue.push([x + 1, y]);
            queue.push([x, y - 1]);
            queue.push([x, y + 1]);
        }
    };
    const scanLine = (startX, limitX, incX, y) => {
        for (let x = startX; x !== limitX; x += incX) {
            const slicePixelIndex = y * width + x;
            const volumeVoxelIndex = sliceOffset + slicePixelIndex;
            const volumeVoxelValue = subVolPixelData[volumeVoxelIndex];
            if (volumeVoxelValue < negativePixelRange[0] ||
                volumeVoxelValue > negativePixelRange[1]) {
                break;
            }
            if (!visited[slicePixelIndex]) {
                bfs(x, y);
            }
        }
    };
    for (let y = 0; y < height; y++) {
        scanLine(0, width - 1, 1, y);
        scanLine(width - 1, 0, -1, y);
    }
}
function _setPositiveSeedValues(subVolume, labelmap, options) {
    const { positiveSeedValue = POSITIVE_SEED_VALUE, positivePixelRange = POSITIVE_PIXEL_RANGE, } = options;
    const subVolPixelData = subVolume.voxelManager.getCompleteScalarDataArray();
    const labelmapData = labelmap.voxelManager.getCompleteScalarDataArray();
    const [width, height, numSlices] = labelmap.dimensions;
    const middleSliceIndex = Math.floor(numSlices / 2);
    const startSliceIndex = Math.max(middleSliceIndex - 3, 0);
    const stopSliceIndex = Math.max(startSliceIndex + 5, numSlices);
    const pixelsPerSlice = width * height;
    for (let z = startSliceIndex; z < stopSliceIndex; z++) {
        const zOffset = z * pixelsPerSlice;
        for (let y = 0; y < height; y++) {
            const yOffset = y * width;
            for (let x = 0; x < width; x++) {
                const index = zOffset + yOffset + x;
                const pixelValue = subVolPixelData[index];
                const isPositiveValue = pixelValue >= positivePixelRange[0] &&
                    pixelValue <= positivePixelRange[1];
                if (isPositiveValue) {
                    labelmap.voxelManager.setAtIndex(index, positiveSeedValue);
                }
            }
        }
    }
}
async function _createAndCacheSegmentationSubVolumeForBoundingBox(subVolume, options) {
    const labelmap = volumeLoader.createAndCacheDerivedLabelmapVolume(subVolume.volumeId);
    _setPositiveSeedValues(subVolume, labelmap, options);
    _setNegativeSeedValues(subVolume, labelmap, options);
    return labelmap;
}
async function runGrowCutForBoundingBox(referencedVolumeId, boundingBoxInfo, options) {
    const { boundingBox } = boundingBoxInfo;
    const { ijkTopLeft, ijkBottomRight } = boundingBox;
    const subVolumeBoundsIJK = {
        minX: ijkTopLeft[0],
        maxX: ijkBottomRight[0],
        minY: ijkTopLeft[1],
        maxY: ijkBottomRight[1],
        minZ: ijkTopLeft[2],
        maxZ: ijkBottomRight[2],
    };
    const subVolume = csUtils.createSubVolume(referencedVolumeId, subVolumeBoundsIJK, {
        targetBuffer: {
            type: 'Float32Array',
        },
    });
    const labelmap = await _createAndCacheSegmentationSubVolumeForBoundingBox(subVolume, options);
    await run(subVolume.volumeId, labelmap.volumeId);
    return labelmap;
}
export { runGrowCutForBoundingBox as default, runGrowCutForBoundingBox };
