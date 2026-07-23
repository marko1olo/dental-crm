import charlsFactory from '@cornerstonejs/codec-charls/decodewasmjs';
const charlsWasm = new URL('@cornerstonejs/codec-charls/decodewasm', import.meta.url);
const local = {
    codec: undefined,
    decoder: undefined,
    decodeConfig: {},
};
function getExceptionMessage(exception) {
    return typeof exception === 'number'
        ? local.codec.getExceptionMessage(exception)
        : exception;
}
export function initialize(decodeConfig) {
    local.decodeConfig = decodeConfig;
    if (local.codec) {
        return Promise.resolve();
    }
    const charlsModule = charlsFactory({
        locateFile: (f) => {
            if (f.endsWith('.wasm')) {
                return charlsWasm.toString();
            }
            return f;
        },
    });
    return new Promise((resolve, reject) => {
        charlsModule.then((instance) => {
            local.codec = instance;
            local.decoder = new instance.JpegLSDecoder();
            resolve();
        }, reject);
    });
}
async function decodeAsync(compressedImageFrame, imageInfo) {
    try {
        await initialize();
        const decoder = local.decoder;
        const encodedBufferInWASM = decoder.getEncodedBuffer(compressedImageFrame.length);
        encodedBufferInWASM.set(compressedImageFrame);
        decoder.decode();
        const frameInfo = decoder.getFrameInfo();
        const interleaveMode = decoder.getInterleaveMode();
        const nearLossless = decoder.getNearLossless();
        const decodedPixelsInWASM = decoder.getDecodedBuffer();
        const encodedImageInfo = {
            columns: frameInfo.width,
            rows: frameInfo.height,
            bitsPerPixel: frameInfo.bitsPerSample,
            signed: imageInfo.signed,
            bytesPerPixel: imageInfo.bytesPerPixel,
            componentsPerPixel: frameInfo.componentCount,
        };
        const pixelData = getPixelData(frameInfo, decodedPixelsInWASM, imageInfo.signed);
        const encodeOptions = {
            nearLossless,
            interleaveMode,
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
    catch (error) {
        throw getExceptionMessage(error);
    }
}
function getPixelData(frameInfo, decodedBuffer, signed) {
    if (frameInfo.bitsPerSample > 8) {
        if (signed) {
            return new Int16Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength / 2);
        }
        return new Uint16Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength / 2);
    }
    if (signed) {
        return new Int8Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength);
    }
    return new Uint8Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength);
}
export default decodeAsync;
