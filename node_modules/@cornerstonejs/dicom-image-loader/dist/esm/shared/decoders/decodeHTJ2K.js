import openJphFactory, {} from '@cornerstonejs/codec-openjph/wasmjs';
const openjphWasm = new URL('@cornerstonejs/codec-openjph/wasm', import.meta.url);
const local = {
    codec: undefined,
    decoder: undefined,
    decodeConfig: {},
};
function calculateSizeAtDecompositionLevel(decompositionLevel, frameWidth, frameHeight) {
    const result = { width: frameWidth, height: frameHeight };
    while (decompositionLevel > 0) {
        result.width = Math.ceil(result.width / 2);
        result.height = Math.ceil(result.height / 2);
        decompositionLevel--;
    }
    return result;
}
export function initialize(decodeConfig) {
    local.decodeConfig = decodeConfig;
    if (local.codec) {
        return Promise.resolve();
    }
    const openJphModule = openJphFactory({
        locateFile: (f) => {
            if (f.endsWith('.wasm')) {
                return openjphWasm.toString();
            }
            return f;
        },
    });
    return new Promise((resolve, reject) => {
        openJphModule.then((instance) => {
            local.codec = instance;
            local.decoder = new instance.HTJ2KDecoder();
            resolve();
        }, reject);
    });
}
async function decodeAsync(compressedImageFrame, imageInfo) {
    await initialize();
    const decoder = new local.codec.HTJ2KDecoder();
    const encodedBufferInWASM = decoder.getEncodedBuffer(compressedImageFrame.length);
    encodedBufferInWASM.set(compressedImageFrame);
    const decodeLevel = imageInfo.decodeLevel || 0;
    decoder.decodeSubResolution(decodeLevel);
    const frameInfo = decoder.getFrameInfo();
    if (imageInfo.decodeLevel > 0) {
        const { width, height } = calculateSizeAtDecompositionLevel(imageInfo.decodeLevel, frameInfo.width, frameInfo.height);
        frameInfo.width = width;
        frameInfo.height = height;
    }
    const decodedBufferInWASM = decoder.getDecodedBuffer();
    const imageFrame = new Uint8Array(decodedBufferInWASM.length);
    imageFrame.set(decodedBufferInWASM);
    const imageOffset = `x: ${decoder.getImageOffset().x}, y: ${decoder.getImageOffset().y}`;
    const numDecompositions = decoder.getNumDecompositions();
    const numLayers = decoder.getNumLayers();
    const progessionOrder = ['unknown', 'LRCP', 'RLCP', 'RPCL', 'PCRL', 'CPRL'][decoder.getProgressionOrder() + 1];
    const reversible = decoder.getIsReversible();
    const blockDimensions = `${decoder.getBlockDimensions().width} x ${decoder.getBlockDimensions().height}`;
    const tileSize = `${decoder.getTileSize().width} x ${decoder.getTileSize().height}`;
    const tileOffset = `${decoder.getTileOffset().x}, ${decoder.getTileOffset().y}`;
    const decodedSize = `${decodedBufferInWASM.length.toLocaleString()} bytes`;
    const compressionRatio = `${(decodedBufferInWASM.length / encodedBufferInWASM.length).toFixed(2)}:1`;
    const encodedImageInfo = {
        columns: frameInfo.width,
        rows: frameInfo.height,
        bitsPerPixel: frameInfo.bitsPerSample,
        signed: frameInfo.isSigned,
        bytesPerPixel: imageInfo.bytesPerPixel,
        componentsPerPixel: frameInfo.componentCount,
    };
    let pixelData = getPixelData(frameInfo, decodedBufferInWASM);
    const { buffer: b, byteOffset, byteLength } = pixelData;
    const pixelDataArrayBuffer = b.slice(byteOffset, byteOffset + byteLength);
    pixelData = new pixelData.constructor(pixelDataArrayBuffer);
    const encodeOptions = {
        imageOffset,
        numDecompositions,
        numLayers,
        progessionOrder,
        reversible,
        blockDimensions,
        tileSize,
        tileOffset,
        decodedSize,
        compressionRatio,
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
    if (frameInfo.bitsPerSample > 8) {
        if (frameInfo.isSigned) {
            return new Int16Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength / 2);
        }
        return new Uint16Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength / 2);
    }
    if (frameInfo.isSigned) {
        return new Int8Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength);
    }
    return new Uint8Array(decodedBuffer.buffer, decodedBuffer.byteOffset, decodedBuffer.byteLength);
}
export default decodeAsync;
