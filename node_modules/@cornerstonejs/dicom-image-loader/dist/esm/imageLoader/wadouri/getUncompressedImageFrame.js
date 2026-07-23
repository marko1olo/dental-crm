import unpackBinaryFrame from './unpackBinaryFrame';
function getUncompressedImageFrame(dataSet, frameIndex) {
    const pixelDataElement = dataSet.elements.x7fe00010 || dataSet.elements.x7fe00008;
    const bitsAllocated = dataSet.uint16('x00280100');
    const rows = dataSet.uint16('x00280010');
    const columns = dataSet.uint16('x00280011');
    let samplesPerPixel = dataSet.uint16('x00280002');
    const photometricInterpretation = dataSet.string('x00280004');
    if (photometricInterpretation === 'YBR_FULL_422') {
        samplesPerPixel = 2;
        console.warn(`Using SamplesPerPixel of 2 for YBR_FULL_422 photometric interpretation.
      See http://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.7.6.3.html for more information.`);
    }
    const pixelDataOffset = pixelDataElement.dataOffset;
    const pixelsPerFrame = rows * columns * samplesPerPixel;
    let frameOffset;
    if (bitsAllocated === 8) {
        frameOffset = pixelDataOffset + frameIndex * pixelsPerFrame;
        if (frameOffset >= dataSet.byteArray.length) {
            throw new Error('frame exceeds size of pixelData');
        }
        return new Uint8Array(dataSet.byteArray.buffer.slice(frameOffset, frameOffset + pixelsPerFrame));
    }
    else if (bitsAllocated === 16) {
        frameOffset = pixelDataOffset + frameIndex * pixelsPerFrame * 2;
        if (frameOffset >= dataSet.byteArray.length) {
            throw new Error('frame exceeds size of pixelData');
        }
        return new Uint8Array(dataSet.byteArray.buffer.slice(frameOffset, frameOffset + pixelsPerFrame * 2));
    }
    else if (bitsAllocated === 1) {
        frameOffset = pixelDataOffset + frameIndex * pixelsPerFrame * 0.125;
        if (frameOffset >= dataSet.byteArray.length) {
            throw new Error('frame exceeds size of pixelData');
        }
        return unpackBinaryFrame(dataSet.byteArray, frameOffset, pixelsPerFrame);
    }
    else if (bitsAllocated === 32) {
        frameOffset = pixelDataOffset + frameIndex * pixelsPerFrame * 4;
        if (frameOffset >= dataSet.byteArray.length) {
            throw new Error('frame exceeds size of pixelData');
        }
        return new Uint8Array(dataSet.byteArray.buffer.slice(frameOffset, frameOffset + pixelsPerFrame * 4));
    }
    throw new Error('unsupported pixel format');
}
export default getUncompressedImageFrame;
