import libjpegTurboFactory from '@cornerstonejs/codec-libjpeg-turbo-8bit/decodewasmjs';
const libjpegTurboWasm = new URL('@cornerstonejs/codec-libjpeg-turbo-8bit/decodewasm', import.meta.url);
const local = {
    codec: undefined,
    decoder: undefined,
};
function initLibjpegTurbo() {
    if (local.codec) {
        return Promise.resolve();
    }
    const libjpegTurboModule = libjpegTurboFactory({
        locateFile: (f) => {
            if (f.endsWith('.wasm')) {
                return libjpegTurboWasm.toString();
            }
            return f;
        },
    });
    return new Promise((resolve, reject) => {
        libjpegTurboModule.then((instance) => {
            local.codec = instance;
            local.decoder = new instance.JPEGDecoder();
            resolve();
        }, reject);
    });
}
async function decodeAsync(compressedImageFrame, imageInfo) {
    await initLibjpegTurbo();
    const decoder = local.decoder;
    const encodedBufferInWASM = decoder.getEncodedBuffer(compressedImageFrame.length);
    encodedBufferInWASM.set(compressedImageFrame);
    decoder.decode();
    const frameInfo = decoder.getFrameInfo();
    const decodedPixelsInWASM = decoder.getDecodedBuffer();
    const encodedImageInfo = {
        columns: frameInfo.width,
        rows: frameInfo.height,
        bitsPerPixel: frameInfo.bitsPerSample,
        signed: imageInfo.signed,
        bytesPerPixel: imageInfo.bytesPerPixel,
        componentsPerPixel: frameInfo.componentCount,
    };
    const pixelData = getPixelData(frameInfo, decodedPixelsInWASM);
    const encodeOptions = {
        frameInfo,
    };
    return {
        ...imageInfo,
        pixelData,
        imageInfo: encodedImageInfo,
        encodeOptions,
        ...encodeOptions,
        ...encodedImageInfo,
    };
}
function getPixelData(frameInfo, decodedBuffer) {
    if (frameInfo.isSigned) {
        return new Int8Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength);
    }
    return new Uint8Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength);
}
const initialize = initLibjpegTurbo;
export { initialize };
export default decodeAsync;
