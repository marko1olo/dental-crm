function getMinStoredPixelValue(dataSet) {
    const pixelRepresentation = dataSet.uint16('x00280103');
    const bitsStored = dataSet.uint16('x00280101');
    if (pixelRepresentation === 0) {
        return 0;
    }
    return -1 << (bitsStored - 1);
}
function getModalityLUTOutputPixelRepresentation(dataSet) {
    const sopClassUID = dataSet.string('x00080016');
    if (sopClassUID === '1.2.840.10008.5.1.4.1.1.2' ||
        sopClassUID === '1.2.840.10008.5.1.4.1.1.2.1') {
        return 1;
    }
    const rescaleIntercept = dataSet.floatString('x00281052');
    const rescaleSlope = dataSet.floatString('x00281053');
    if (rescaleIntercept !== undefined && rescaleSlope !== undefined) {
        const minStoredPixelValue = getMinStoredPixelValue(dataSet);
        const minModalityLutValue = minStoredPixelValue * rescaleSlope + rescaleIntercept;
        if (minModalityLutValue < 0) {
            return 1;
        }
        return 0;
    }
    if (dataSet.elements.x00283000 && dataSet.elements.x00283000.length > 0) {
        return 0;
    }
    return dataSet.uint16('x00280103');
}
export default getModalityLUTOutputPixelRepresentation;
