function swap16(val) {
    return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
}
async function decodeBigEndian(imageFrame, pixelData) {
    if (imageFrame.bitsAllocated === 16) {
        let arrayBuffer = pixelData.buffer;
        let offset = pixelData.byteOffset;
        const length = pixelData.length;
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
        for (let i = 0; i < imageFrame.pixelData.length; i++) {
            imageFrame.pixelData[i] = swap16(imageFrame.pixelData[i]);
        }
    }
    else if (imageFrame.bitsAllocated === 8) {
        imageFrame.pixelData = pixelData;
    }
    return imageFrame;
}
export default decodeBigEndian;
