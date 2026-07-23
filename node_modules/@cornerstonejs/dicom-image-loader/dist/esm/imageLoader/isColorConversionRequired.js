export default function isColorConversionRequired(imageFrame) {
    if (imageFrame === undefined) {
        return false;
    }
    const { rows, columns, photometricInterpretation, pixelDataLength, planarConfiguration, } = imageFrame;
    if (pixelDataLength === 4 * columns * rows) {
        return false;
    }
    if (photometricInterpretation === 'PALETTE COLOR') {
        return true;
    }
    if (photometricInterpretation.endsWith('420')) {
        return (pixelDataLength ===
            (3 * Math.ceil(columns / 2) + Math.floor(columns / 2)) * rows);
    }
    else if (photometricInterpretation.endsWith('422')) {
        return (pixelDataLength ===
            (3 * Math.ceil(columns / 2) + Math.floor(columns / 2)) *
                Math.ceil(rows / 2) +
                Math.floor(rows / 2) * columns);
    }
    else {
        return photometricInterpretation !== 'RGB' || planarConfiguration === 1;
    }
}
