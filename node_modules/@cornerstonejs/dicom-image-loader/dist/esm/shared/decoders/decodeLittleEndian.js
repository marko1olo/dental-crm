async function decodeLittleEndian(imageFrame, pixelData) {
    let arrayBuffer = pixelData.buffer;
    let offset = pixelData.byteOffset;
    const length = pixelData.length;
    if (imageFrame.bitsAllocated === 16) {
        if (offset % 2) {
            arrayBuffer = arrayBuffer.slice(offset);
            offset = 0;
        }
        if (imageFrame.pixelRepresentation === 0) {
            imageFrame.pixelData = new Uint16Array(arrayBuffer, offset, length / 2);
        }
        else {
            imageFrame.pixelData = new Int16Array(arrayBuffer, offset, length / 2);
        }
    }
    else if (imageFrame.bitsAllocated === 8 || imageFrame.bitsAllocated === 1) {
        imageFrame.pixelData = pixelData;
    }
    else if (imageFrame.bitsAllocated === 32) {
        if (offset % 2) {
            arrayBuffer = arrayBuffer.slice(offset);
            offset = 0;
        }
        if (imageFrame.floatPixelData || imageFrame.doubleFloatPixelData) {
            throw new Error('Float pixel data is not supported for parsing into ImageFrame');
        }
        if (imageFrame.pixelRepresentation === 0) {
            imageFrame.pixelData = new Uint32Array(arrayBuffer, offset, length / 4);
        }
        else if (imageFrame.pixelRepresentation === 1) {
            imageFrame.pixelData = new Int32Array(arrayBuffer, offset, length / 4);
        }
        else {
            imageFrame.pixelData = new Float32Array(arrayBuffer, offset, length / 4);
        }
    }
    return imageFrame;
}
export default decodeLittleEndian;
