function isBitSet(byte, bitPos) {
    return byte & (1 << bitPos);
}
function unpackBinaryFrame(byteArray, frameOffset, pixelsPerFrame) {
    const pixelData = new Uint8Array(pixelsPerFrame);
    for (let i = 0; i < pixelsPerFrame; i++) {
        const bytePos = Math.floor(i / 8);
        const byte = byteArray[bytePos + frameOffset];
        const bitPos = i % 8;
        pixelData[i] = isBitSet(byte, bitPos) ? 1 : 0;
    }
    return pixelData;
}
export default unpackBinaryFrame;
