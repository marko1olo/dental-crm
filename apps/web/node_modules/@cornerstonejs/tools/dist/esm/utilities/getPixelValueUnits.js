import { metaData } from '@cornerstonejs/core';
function getPixelValueUnitsImageId(imageId, options) {
    const generalSeriesModule = metaData.get('generalSeriesModule', imageId);
    return getPixelValueUnits(generalSeriesModule.modality, imageId, options);
}
function getPixelValueUnits(modality, imageId, options) {
    if (modality === 'CT') {
        return 'HU';
    }
    else if (modality === 'PT') {
        return _handlePTModality(imageId, options);
    }
    else {
        return '';
    }
}
function _handlePTModality(imageId, options) {
    if (!options.isPreScaled) {
        return 'raw';
    }
    if (options.isSuvScaled) {
        return 'SUV';
    }
    const generalSeriesModule = metaData.get('generalSeriesModule', imageId);
    if (generalSeriesModule?.modality === 'PT') {
        const petSeriesModule = metaData.get('petSeriesModule', imageId);
        return petSeriesModule?.units || 'unitless';
    }
    return 'unknown';
}
export { getPixelValueUnits, getPixelValueUnitsImageId };
