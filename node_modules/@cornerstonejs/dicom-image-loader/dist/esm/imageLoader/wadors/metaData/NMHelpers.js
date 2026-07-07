import getTagValue from '../getTagValue';
import getValue from './getValue';
import isNMReconstructable from '../../isNMReconstructable';
import getNumberValues from './getNumberValues';
function isNMModality(metaData) {
    const modality = getValue(metaData['00080060']);
    return modality.includes('NM');
}
function getImageTypeSubItemFromMetadata(metaData, index) {
    const imageType = getTagValue(metaData['00080008'], false);
    if (imageType) {
        return imageType[index];
    }
    return undefined;
}
function extractOrientationFromNMMultiframeMetadata(metaData) {
    let imageOrientationPatient;
    const imageSubType = getImageTypeSubItemFromMetadata(metaData, 2);
    if (imageSubType && isNMReconstructable(imageSubType)) {
        const detectorInformationSequence = getTagValue(metaData['00540022']);
        if (detectorInformationSequence) {
            imageOrientationPatient = getNumberValues(detectorInformationSequence['00200037'], 6);
        }
    }
    return imageOrientationPatient;
}
function extractPositionFromNMMultiframeMetadata(metaData) {
    let imagePositionPatient;
    const imageSubType = getImageTypeSubItemFromMetadata(metaData, 2);
    if (imageSubType && isNMReconstructable(imageSubType)) {
        const detectorInformationSequence = getTagValue(metaData['00540022']);
        if (detectorInformationSequence) {
            imagePositionPatient = getNumberValues(detectorInformationSequence['00200032'], 3);
        }
    }
    return imagePositionPatient;
}
export { extractOrientationFromNMMultiframeMetadata, extractPositionFromNMMultiframeMetadata, isNMModality, getImageTypeSubItemFromMetadata, };
