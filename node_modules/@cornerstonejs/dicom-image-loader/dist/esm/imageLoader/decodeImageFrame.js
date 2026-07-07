import decodeJPEGBaseline8BitColor from './decodeJPEGBaseline8BitColor';
import { getWebWorkerManager } from '@cornerstonejs/core';
function processDecodeTask(imageFrame, transferSyntax, pixelData, srcOptions, decodeConfig) {
    const options = { ...srcOptions };
    delete options.loader;
    delete options.streamingData;
    const webWorkerManager = getWebWorkerManager();
    const priority = options.priority || undefined;
    const transferList = options.transferPixelData
        ? [pixelData.buffer]
        : undefined;
    return webWorkerManager.executeTask('dicomImageLoader', 'decodeTask', {
        imageFrame,
        transferSyntax,
        pixelData,
        options,
        decodeConfig,
    }, {
        priority,
        requestType: options?.requestType,
    });
}
function decodeImageFrame(imageFrame, transferSyntax, pixelData, canvas, options = {}, decodeConfig) {
    switch (transferSyntax) {
        case '1.2.840.10008.1.2':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.1':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.2':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.1.99':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.5':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.50':
            if (imageFrame.bitsAllocated === 8 &&
                (imageFrame.samplesPerPixel === 3 || imageFrame.samplesPerPixel === 4)) {
                return decodeJPEGBaseline8BitColor(imageFrame, pixelData, canvas);
            }
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.51':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.57':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.70':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.80':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.81':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.90':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '1.2.840.10008.1.2.4.91':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
        case '3.2.840.10008.1.2.4.96':
        case '1.2.840.10008.1.2.4.201':
        case '1.2.840.10008.1.2.4.202':
        case '1.2.840.10008.1.2.4.203':
            return processDecodeTask(imageFrame, transferSyntax, pixelData, options, decodeConfig);
    }
    return Promise.reject(new Error(`No decoder for transfer syntax ${transferSyntax}`));
}
export default decodeImageFrame;
