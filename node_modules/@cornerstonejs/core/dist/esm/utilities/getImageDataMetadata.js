import { vec3 } from 'gl-matrix';
import { EPSILON } from '../constants';
import { buildMetadata } from './buildMetadata';
export function getImageDataMetadata(image) {
    const { imagePlaneModule, imagePixelModule, voiLUTFunction, modality, scalingFactor, calibration, } = buildMetadata(image);
    let { rowCosines, columnCosines } = imagePlaneModule;
    if (rowCosines == null || columnCosines == null) {
        rowCosines = [1, 0, 0];
        columnCosines = [0, 1, 0];
    }
    const rowCosineVec = vec3.fromValues(rowCosines[0], rowCosines[1], rowCosines[2]);
    const colCosineVec = vec3.fromValues(columnCosines[0], columnCosines[1], columnCosines[2]);
    const scanAxisNormal = vec3.create();
    vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);
    let origin = imagePlaneModule.imagePositionPatient;
    if (origin == null) {
        origin = [0, 0, 0];
    }
    const xSpacing = imagePlaneModule.columnPixelSpacing || image.columnPixelSpacing;
    const ySpacing = imagePlaneModule.rowPixelSpacing || image.rowPixelSpacing;
    const xVoxels = image.columns;
    const yVoxels = image.rows;
    const zSpacing = EPSILON;
    const zVoxels = 1;
    if (!imagePixelModule.photometricInterpretation &&
        image.sizeInBytes === 3 * image.width * image.height) {
        image.numberOfComponents = 3;
    }
    const numberOfComponents = image.numberOfComponents ||
        _getNumCompsFromPhotometricInterpretation(imagePixelModule.photometricInterpretation);
    return {
        numberOfComponents,
        origin,
        direction: [...rowCosineVec, ...colCosineVec, ...scanAxisNormal],
        dimensions: [xVoxels, yVoxels, zVoxels],
        spacing: [xSpacing, ySpacing, zSpacing],
        numVoxels: xVoxels * yVoxels * zVoxels,
        imagePlaneModule,
        imagePixelModule,
        bitsAllocated: imagePixelModule.bitsAllocated,
        voiLUTFunction,
        modality,
        scalingFactor,
        calibration,
        scanAxisNormal: scanAxisNormal,
    };
}
function _getNumCompsFromPhotometricInterpretation(photometricInterpretation) {
    let numberOfComponents = 1;
    if (photometricInterpretation === 'RGB' ||
        photometricInterpretation?.includes('YBR') ||
        photometricInterpretation === 'PALETTE COLOR') {
        numberOfComponents = 3;
    }
    return numberOfComponents;
}
