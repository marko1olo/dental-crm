import { Enums } from '@cornerstonejs/core';
function sumOverDimensionGroups(voxelManager, dimensionGroups) {
    const arrayLength = voxelManager.getScalarDataLength();
    const resultArray = new Float32Array(arrayLength);
    for (const dimensionGroupNumber of dimensionGroups) {
        const scalarData = voxelManager.getDimensionGroupScalarData(dimensionGroupNumber);
        for (let i = 0; i < arrayLength; i++) {
            resultArray[i] += scalarData[i];
        }
    }
    return resultArray;
}
function averageOverDimensionGroups(voxelManager, dimensionGroups) {
    const sumArray = sumOverDimensionGroups(voxelManager, dimensionGroups);
    const numDimensionGroups = dimensionGroups.length;
    for (let i = 0; i < sumArray.length; i++) {
        sumArray[i] /= numDimensionGroups;
    }
    return sumArray;
}
const operationFunctions = {
    [Enums.GenerateImageType.SUM]: (voxelManager, dimensionGroups, callback) => {
        const resultArray = sumOverDimensionGroups(voxelManager, dimensionGroups);
        for (let i = 0; i < resultArray.length; i++) {
            callback(i, resultArray[i]);
        }
    },
    [Enums.GenerateImageType.AVERAGE]: (voxelManager, dimensionGroups, callback) => {
        const resultArray = averageOverDimensionGroups(voxelManager, dimensionGroups);
        for (let i = 0; i < resultArray.length; i++) {
            callback(i, resultArray[i]);
        }
    },
    [Enums.GenerateImageType.SUBTRACT]: (voxelManager, dimensionGroups, callback) => {
        if (dimensionGroups.length !== 2) {
            throw new Error('Please provide only 2 dimension groups for subtraction.');
        }
        const arrayLength = voxelManager.getScalarDataLength();
        const scalarData1 = voxelManager.getDimensionGroupScalarData(dimensionGroups[0]);
        const scalarData2 = voxelManager.getDimensionGroupScalarData(dimensionGroups[1]);
        for (let i = 0; i < arrayLength; i++) {
            const difference = scalarData1[i] - scalarData2[i];
            callback(i, difference);
        }
    },
};
function generateImageFromTimeData(dynamicVolume, operation, options) {
    const { dimensionGroupNumbers, frameNumbers } = options;
    if (frameNumbers) {
        console.warn('Warning: frameNumbers parameter is deprecated. Please use dimensionGroupNumbers instead.');
    }
    const dimensionGroups = dimensionGroupNumbers ||
        frameNumbers ||
        Array.from({ length: dynamicVolume.numDimensionGroups }, (_, i) => i + 1);
    if (dimensionGroups.length <= 1) {
        throw new Error('Please provide two or more dimension groups');
    }
    const voxelManager = dynamicVolume.voxelManager;
    const arrayLength = voxelManager.getScalarDataLength();
    const operationFunction = operationFunctions[operation];
    if (!operationFunction) {
        throw new Error(`Unsupported operation: ${operation}`);
    }
    const resultArray = new Float32Array(arrayLength);
    operationFunction(voxelManager, dimensionGroups, (index, value) => {
        resultArray[index] = value;
    });
    return resultArray;
}
function updateVolumeFromTimeData(dynamicVolume, operation, options) {
    const { dimensionGroupNumbers, frameNumbers, targetVolume } = options;
    if (!targetVolume) {
        throw new Error('A target volume must be provided');
    }
    if (frameNumbers) {
        console.warn('Warning: frameNumbers parameter is deprecated. Please use dimensionGroupNumbers instead.');
    }
    const dimensionGroups = dimensionGroupNumbers ||
        frameNumbers ||
        Array.from({ length: dynamicVolume.numDimensionGroups }, (_, i) => i + 1);
    if (dimensionGroups.length <= 1) {
        throw new Error('Please provide two or more dimension groups');
    }
    const voxelManager = dynamicVolume.voxelManager;
    const targetVoxelManager = targetVolume.voxelManager;
    const operationFunction = operationFunctions[operation];
    if (!operationFunction) {
        throw new Error(`Unsupported operation: ${operation}`);
    }
    operationFunction(voxelManager, dimensionGroups, (index, value) => {
        targetVoxelManager.setAtIndex(index, value);
    });
    targetVoxelManager.resetModifiedSlices();
    for (let k = 0; k < targetVolume.dimensions[2]; k++) {
        targetVoxelManager.modifiedSlices.add(k);
    }
}
export { generateImageFromTimeData, updateVolumeFromTimeData };
