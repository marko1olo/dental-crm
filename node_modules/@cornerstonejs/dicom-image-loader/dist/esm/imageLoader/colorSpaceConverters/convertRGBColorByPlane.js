export default function (imageFrame, colorBuffer, useRGBA) {
    if (imageFrame === undefined) {
        throw new Error('decodeRGB: rgbBuffer must be defined');
    }
    if (imageFrame.length % 3 !== 0) {
        throw new Error(`decodeRGB: rgbBuffer length ${imageFrame.length} must be divisible by 3`);
    }
    const numPixels = imageFrame.length / 3;
    let bufferIndex = 0;
    let rIndex = 0;
    let gIndex = numPixels;
    let bIndex = numPixels * 2;
    if (useRGBA) {
        for (let i = 0; i < numPixels; i++) {
            colorBuffer[bufferIndex++] = imageFrame[rIndex++];
            colorBuffer[bufferIndex++] = imageFrame[gIndex++];
            colorBuffer[bufferIndex++] = imageFrame[bIndex++];
            colorBuffer[bufferIndex++] = 255;
        }
    }
    else {
        for (let i = 0; i < numPixels; i++) {
            colorBuffer[bufferIndex++] = imageFrame[rIndex++];
            colorBuffer[bufferIndex++] = imageFrame[gIndex++];
            colorBuffer[bufferIndex++] = imageFrame[bIndex++];
        }
    }
}
