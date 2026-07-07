import { vec3 } from 'gl-matrix';
import makeVolumeMetadata from './makeVolumeMetadata';
import sortImageIdsAndGetSpacing from './sortImageIdsAndGetSpacing';
import getScalingParameters from './getScalingParameters';
import { hasFloatScalingParameters } from './hasFloatScalingParameters';
import { canRenderFloatTextures } from '../init';
import cache from '../cache/cache';
const constructorToTypedArray = {
    Uint8Array: 'Uint8Array',
    Int16Array: 'Int16Array',
    Uint16Array: 'Uint16Array',
    Float32Array: 'Float32Array',
};
function generateVolumePropsFromImageIds(imageIds, volumeId) {
    const volumeMetadata = makeVolumeMetadata(imageIds);
    const { ImageOrientationPatient, PixelSpacing, Columns, Rows } = volumeMetadata;
    const rowCosineVec = vec3.fromValues(ImageOrientationPatient[0], ImageOrientationPatient[1], ImageOrientationPatient[2]);
    const colCosineVec = vec3.fromValues(ImageOrientationPatient[3], ImageOrientationPatient[4], ImageOrientationPatient[5]);
    const scanAxisNormal = vec3.create();
    vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);
    const { zSpacing, origin, sortedImageIds } = sortImageIdsAndGetSpacing(imageIds, scanAxisNormal);
    const numFrames = imageIds.length;
    const spacing = [PixelSpacing[1], PixelSpacing[0], zSpacing];
    const dimensions = [Columns, Rows, numFrames].map((it) => Math.floor(it));
    const direction = [
        ...rowCosineVec,
        ...colCosineVec,
        ...scanAxisNormal,
    ];
    return {
        dimensions,
        spacing,
        origin,
        dataType: _determineDataType(sortedImageIds, volumeMetadata),
        direction,
        metadata: volumeMetadata,
        imageIds: sortedImageIds,
        volumeId,
        voxelManager: null,
        numberOfComponents: volumeMetadata.PhotometricInterpretation === 'RGB' ? 3 : 1,
    };
}
function _determineDataType(imageIds, volumeMetadata) {
    const { BitsAllocated, PixelRepresentation } = volumeMetadata;
    const signed = PixelRepresentation === 1;
    const cachedDataType = _getDataTypeFromCache(imageIds);
    if (cachedDataType) {
        return cachedDataType;
    }
    const [firstIndex, middleIndex, lastIndex] = [
        0,
        Math.floor(imageIds.length / 2),
        imageIds.length - 1,
    ];
    const scalingParameters = [firstIndex, middleIndex, lastIndex].map((index) => getScalingParameters(imageIds[index]));
    const hasNegativeRescale = scalingParameters.some((params) => params.rescaleIntercept < 0 || params.rescaleSlope < 0);
    const floatAfterScale = scalingParameters.some((params) => hasFloatScalingParameters(params));
    const canRenderFloat = canRenderFloatTextures();
    switch (BitsAllocated) {
        case 8:
            return 'Uint8Array';
        case 16:
            if (canRenderFloat && floatAfterScale) {
                return 'Float32Array';
            }
            if (signed || hasNegativeRescale) {
                return 'Int16Array';
            }
            if (!signed && !hasNegativeRescale) {
                return 'Uint16Array';
            }
            return 'Float32Array';
        case 24:
            return 'Uint8Array';
        case 32:
            return 'Float32Array';
        case 64:
            return 'Float64Array';
        default:
            throw new Error(`Bits allocated of ${BitsAllocated} is not defined to generate scalarData for the volume.`);
    }
}
function _getDataTypeFromCache(imageIds) {
    const indices = [0, Math.floor(imageIds.length / 2), imageIds.length - 1];
    const images = indices.map((i) => cache.getImage(imageIds[i]));
    if (!images.every(Boolean)) {
        return null;
    }
    const constructorName = images[0].getPixelData().constructor.name;
    if (images.every((img) => img.getPixelData().constructor.name === constructorName) &&
        constructorName in constructorToTypedArray) {
        return constructorToTypedArray[constructorName];
    }
    return null;
}
export { generateVolumePropsFromImageIds };
