import getNumberValues from './getNumberValues';
import { extractOrientationFromNMMultiframeMetadata, extractPositionFromNMMultiframeMetadata, isNMModality, } from './NMHelpers';
function extractOrientationFromMetadata(metaData) {
    let imageOrientationPatient = getNumberValues(metaData['00200037'], 6);
    if (!imageOrientationPatient && isNMModality(metaData)) {
        imageOrientationPatient =
            extractOrientationFromNMMultiframeMetadata(metaData);
    }
    return imageOrientationPatient;
}
function extractPositionFromMetadata(metaData) {
    let imagePositionPatient = getNumberValues(metaData['00200032'], 3);
    if (!imagePositionPatient && isNMModality(metaData)) {
        imagePositionPatient = extractPositionFromNMMultiframeMetadata(metaData);
    }
    return imagePositionPatient;
}
export { extractOrientationFromMetadata, extractPositionFromMetadata };
