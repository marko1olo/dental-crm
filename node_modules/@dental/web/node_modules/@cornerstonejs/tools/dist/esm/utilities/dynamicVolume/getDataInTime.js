import { utilities, cache } from '@cornerstonejs/core';
import { getVoxelOverlap } from '../segmentation/utilities';
function getDataInTime(dynamicVolume, options) {
    let dataInTime;
    const dimensionGroups = options.dimensionGroupNumbers ||
        options.frameNumbers ||
        Array.from({ length: dynamicVolume.numDimensionGroups }, (_, i) => i + 1);
    if (options.frameNumbers) {
        console.warn('Warning: frameNumbers parameter is deprecated. Please use dimensionGroupNumbers instead.');
    }
    if (!options.maskVolumeId && !options.worldCoordinate) {
        throw new Error('You should provide either maskVolumeId or imageCoordinate');
    }
    if (options.maskVolumeId && options.worldCoordinate) {
        throw new Error('You can only use one of maskVolumeId or imageCoordinate');
    }
    if (options.maskVolumeId) {
        const segmentationVolume = cache.getVolume(options.maskVolumeId);
        if (!segmentationVolume) {
            throw new Error('Segmentation volume not found');
        }
        const [dataInTime, ijkCoords] = _getDimensionGroupDataMask(dimensionGroups, dynamicVolume, segmentationVolume);
        return [dataInTime, ijkCoords];
    }
    if (options.worldCoordinate) {
        const dataInTime = _getDimensionGroupDataCoordinate(dimensionGroups, options.worldCoordinate, dynamicVolume);
        return dataInTime;
    }
    return dataInTime;
}
function _getDimensionGroupDataCoordinate(dimensionGroups, coordinate, volume) {
    const { dimensions, imageData } = volume;
    const index = imageData.worldToIndex(coordinate);
    index[0] = Math.floor(index[0]);
    index[1] = Math.floor(index[1]);
    index[2] = Math.floor(index[2]);
    if (!utilities.indexWithinDimensions(index, dimensions)) {
        throw new Error('outside bounds');
    }
    const yMultiple = dimensions[0];
    const zMultiple = dimensions[0] * dimensions[1];
    const value = [];
    dimensionGroups.forEach((dimensionGroupNumber) => {
        const scalarIndex = index[2] * zMultiple + index[1] * yMultiple + index[0];
        value.push(volume.voxelManager.getAtIndexAndDimensionGroup(scalarIndex, dimensionGroupNumber));
    });
    return value;
}
function _getDimensionGroupDataMask(dimensionGroups, dynamicVolume, segmentationVolume) {
    const { imageData: maskImageData } = segmentationVolume;
    const segVoxelManager = segmentationVolume.voxelManager;
    const scalarDataLength = segVoxelManager.getScalarDataLength();
    const nonZeroVoxelIndices = [];
    nonZeroVoxelIndices.length = scalarDataLength;
    let actualLen = 0;
    for (let i = 0, len = scalarDataLength; i < len; i++) {
        if (segVoxelManager.getAtIndex(i) !== 0) {
            nonZeroVoxelIndices[actualLen++] = i;
        }
    }
    nonZeroVoxelIndices.length = actualLen;
    const nonZeroVoxelValuesInTime = [];
    const isSameVolume = dynamicVolume.voxelManager.getScalarDataLength() === scalarDataLength &&
        JSON.stringify(dynamicVolume.spacing) ===
            JSON.stringify(segmentationVolume.spacing);
    const ijkCoords = [];
    if (isSameVolume) {
        for (let i = 0; i < nonZeroVoxelIndices.length; i++) {
            const valuesInTime = [];
            const index = nonZeroVoxelIndices[i];
            for (let j = 0; j < dimensionGroups.length; j++) {
                valuesInTime.push(dynamicVolume.voxelManager.getAtIndexAndDimensionGroup(index, dimensionGroups[j]));
            }
            nonZeroVoxelValuesInTime.push(valuesInTime);
            ijkCoords.push(segVoxelManager.toIJK(index));
        }
        return [nonZeroVoxelValuesInTime, ijkCoords];
    }
    const callback = ({ pointLPS: segPointLPS, value: segValue, pointIJK: segPointIJK, }) => {
        if (segValue === 0) {
            return;
        }
        const overlapIJKMinMax = getVoxelOverlap(dynamicVolume.imageData, dynamicVolume.dimensions, dynamicVolume.spacing, segPointLPS);
        let count = 0;
        const perDimensionGroupSum = new Map();
        dimensionGroups.forEach((dimensionGroupNumber) => perDimensionGroupSum.set(dimensionGroupNumber, 0));
        const averageCallback = ({ index }) => {
            for (let i = 0; i < dimensionGroups.length; i++) {
                const value = dynamicVolume.voxelManager.getAtIndexAndDimensionGroup(index, dimensionGroups[i]);
                const dimensionGroupNumber = dimensionGroups[i];
                perDimensionGroupSum.set(dimensionGroupNumber, perDimensionGroupSum.get(dimensionGroupNumber) + value);
            }
            count++;
        };
        dynamicVolume.voxelManager.forEach(averageCallback, {
            imageData: dynamicVolume.imageData,
            boundsIJK: overlapIJKMinMax,
        });
        const averageValues = [];
        perDimensionGroupSum.forEach((sum) => {
            averageValues.push(sum / count);
        });
        ijkCoords.push(segPointIJK);
        nonZeroVoxelValuesInTime.push(averageValues);
    };
    segmentationVolume.voxelManager.forEach(callback, {
        imageData: maskImageData,
    });
    return [nonZeroVoxelValuesInTime, ijkCoords];
}
export default getDataInTime;
