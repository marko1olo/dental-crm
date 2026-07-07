import isNMReconstructable from '../../isNMReconstructable';
import getNumberValues from './getNumberValues';
function getImageTypeSubItemFromDataset(dataSet, index) {
    const imageType = dataSet.string('x00080008');
    if (imageType) {
        const subTypes = imageType.split('\\');
        if (subTypes.length > index) {
            return subTypes[index];
        }
    }
    return undefined;
}
function extractOrientationFromNMMultiframeDataset(dataSet) {
    let imageOrientationPatient;
    const modality = dataSet.string('x00080060');
    if (modality?.includes('NM')) {
        const imageSubType = getImageTypeSubItemFromDataset(dataSet, 2);
        if (imageSubType && isNMReconstructable(imageSubType)) {
            if (dataSet.elements.x00540022) {
                imageOrientationPatient = getNumberValues(dataSet.elements.x00540022.items[0].dataSet, 'x00200037', 6);
            }
        }
    }
    return imageOrientationPatient;
}
function extractPositionFromNMMultiframeDataset(dataSet) {
    let imagePositionPatient;
    const modality = dataSet.string('x00080060');
    if (modality?.includes('NM')) {
        const imageSubType = getImageTypeSubItemFromDataset(dataSet, 2);
        if (imageSubType && isNMReconstructable(imageSubType)) {
            if (dataSet.elements.x00540022) {
                imagePositionPatient = getNumberValues(dataSet.elements.x00540022.items[0].dataSet, 'x00200032', 3);
            }
        }
    }
    return imagePositionPatient;
}
function extractOrientationFromDataset(dataSet) {
    let imageOrientationPatient = getNumberValues(dataSet, 'x00200037', 6);
    if (!imageOrientationPatient &&
        dataSet.elements.x00209116?.items?.[0]?.dataSet) {
        imageOrientationPatient = getNumberValues(dataSet.elements.x00209116.items[0].dataSet, 'x00200037', 6);
    }
    if (!imageOrientationPatient) {
        imageOrientationPatient =
            extractOrientationFromNMMultiframeDataset(dataSet);
    }
    return imageOrientationPatient;
}
function extractPositionFromDataset(dataSet) {
    let imagePositionPatient = getNumberValues(dataSet, 'x00200032', 3);
    if (!imagePositionPatient &&
        dataSet.elements.x00209113?.items?.[0]?.dataSet) {
        imagePositionPatient = getNumberValues(dataSet.elements.x00209113.items[0].dataSet, 'x00200032', 3);
    }
    if (!imagePositionPatient) {
        imagePositionPatient = extractPositionFromNMMultiframeDataset(dataSet);
    }
    return imagePositionPatient;
}
function extractSpacingFromDataset(dataSet) {
    let pixelSpacing = getNumberValues(dataSet, 'x00280030', 2);
    if (!pixelSpacing && dataSet.elements.x00289110?.items?.[0]?.dataSet) {
        pixelSpacing = getNumberValues(dataSet.elements.x00289110.items[0].dataSet, 'x00280030', 2);
    }
    return pixelSpacing;
}
function extractSliceThicknessFromDataset(dataSet) {
    let sliceThickness;
    if (dataSet.elements.x00180050) {
        sliceThickness = dataSet.floatString('x00180050');
    }
    else if (dataSet.elements.x00289110 &&
        dataSet.elements.x00289110.items.length &&
        dataSet.elements.x00289110.items[0].dataSet.elements.x00180050) {
        sliceThickness =
            dataSet.elements.x00289110.items[0].dataSet.floatString('x00180050');
    }
    return sliceThickness;
}
export { extractOrientationFromDataset, extractPositionFromDataset, extractSliceThicknessFromDataset, extractSpacingFromDataset, getImageTypeSubItemFromDataset, };
