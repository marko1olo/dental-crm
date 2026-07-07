function removeAFromRGBA(pixelData, targetBuffer) {
    const numPixels = pixelData.length / 4;
    let rgbIndex = 0;
    let bufferIndex = 0;
    for (let i = 0; i < numPixels; i++) {
        targetBuffer[bufferIndex++] = pixelData[rgbIndex++];
        targetBuffer[bufferIndex++] = pixelData[rgbIndex++];
        targetBuffer[bufferIndex++] = pixelData[rgbIndex++];
        rgbIndex++;
    }
    return targetBuffer;
}
export default removeAFromRGBA;
