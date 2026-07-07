export default function (imageFrame, colorBuffer, useRGBA) {
    if (imageFrame === undefined) {
        throw new Error('decodeRGB: rgbBuffer must be defined');
    }
    if (imageFrame.length % 3 !== 0) {
        throw new Error(`decodeRGB: rgbBuffer length ${imageFrame.length} must be divisible by 3`);
    }
    const numPixels = imageFrame.length / 3;
    let rgbIndex = 0;
    let bufferIndex = 0;
    if (useRGBA) {
        for (let i = 0; i < numPixels; i++) {
            colorBuffer[bufferIndex++] = imageFrame[rgbIndex++];
            colorBuffer[bufferIndex++] = imageFrame[rgbIndex++];
            colorBuffer[bufferIndex++] = imageFrame[rgbIndex++];
            colorBuffer[bufferIndex++] = 255;
        }
        return;
    }
    colorBuffer.set(imageFrame);
}
