import { Enums, imageRetrievalPoolManager, utilities, } from '@cornerstonejs/core';
import { Enums as csCoreEnums } from '@cornerstonejs/core';
import createImage from '../createImage';
import getPixelData from './getPixelData';
const { ProgressiveIterator } = utilities;
const { ImageQualityStatus } = Enums;
const streamableTransferSyntaxes = new Set([
    '3.2.840.10008.1.2.4.96',
    '1.2.840.10008.1.2.4.202',
    '1.2.840.10008.1.2.4.203',
]);
export function getTransferSyntaxForContentType(contentType) {
    const defaultTransferSyntax = '1.2.840.10008.1.2';
    if (!contentType) {
        return defaultTransferSyntax;
    }
    const parameters = contentType.split(';');
    const params = {};
    parameters.forEach((parameter) => {
        const parameterValues = parameter.split('=');
        if (parameterValues.length !== 2) {
            return;
        }
        const value = parameterValues[1].trim().replace(/"/g, '');
        params[parameterValues[0].trim()] = value;
    });
    const defaultTransferSyntaxByType = {
        'image/jpeg': '1.2.840.10008.1.2.4.50',
        'image/x-dicom-rle': '1.2.840.10008.1.2.5',
        'image/x-jls': '1.2.840.10008.1.2.4.80',
        'image/jls': '1.2.840.10008.1.2.4.80',
        'image/jll': '1.2.840.10008.1.2.4.70',
        'image/jp2': '1.2.840.10008.1.2.4.90',
        'image/jpx': '1.2.840.10008.1.2.4.92',
        'image/jphc': '3.2.840.10008.1.2.4.96',
        'image/jxl': '1.2.840.10008.1.2.4.140',
    };
    if (params['transfer-syntax']) {
        return params['transfer-syntax'];
    }
    else if (contentType &&
        !Object.keys(params).length &&
        defaultTransferSyntaxByType[contentType]) {
        return defaultTransferSyntaxByType[contentType];
    }
    else if (params.type && defaultTransferSyntaxByType[params.type]) {
        return defaultTransferSyntaxByType[params.type];
    }
    else if (defaultTransferSyntaxByType[contentType]) {
        return defaultTransferSyntaxByType[contentType];
    }
    return defaultTransferSyntax;
}
function getImageRetrievalPool() {
    return imageRetrievalPoolManager;
}
const mediaType = 'multipart/related; type=application/octet-stream; transfer-syntax=*';
function loadImage(imageId, options = {}) {
    const imageRetrievalPool = getImageRetrievalPool();
    const start = new Date().getTime();
    const uncompressedIterator = new ProgressiveIterator('decompress');
    async function sendXHR(imageURI, imageId, mediaType) {
        uncompressedIterator.generate(async (it) => {
            const compressedIt = ProgressiveIterator.as(getPixelData(imageURI, imageId, mediaType, options));
            let lastDecodeLevel = 10;
            for await (const result of compressedIt) {
                const { pixelData, imageQualityStatus = ImageQualityStatus.FULL_RESOLUTION, percentComplete, done = true, extractDone = true, } = result;
                const transferSyntax = getTransferSyntaxForContentType(result.contentType);
                if (!extractDone && !streamableTransferSyntaxes.has(transferSyntax)) {
                    continue;
                }
                const decodeLevel = result.decodeLevel ??
                    (imageQualityStatus === ImageQualityStatus.FULL_RESOLUTION
                        ? 0
                        : decodeLevelFromComplete(percentComplete, options.retrieveOptions?.decodeLevel));
                if (!done && lastDecodeLevel <= decodeLevel) {
                    continue;
                }
                try {
                    const useOptions = {
                        ...options,
                        decodeLevel,
                    };
                    const image = (await createImage(imageId, pixelData, transferSyntax, useOptions));
                    const end = new Date().getTime();
                    image.loadTimeInMS = end - start;
                    image.transferSyntaxUID = transferSyntax;
                    image.imageQualityStatus = imageQualityStatus;
                    it.add(image, done);
                    lastDecodeLevel = decodeLevel;
                }
                catch (e) {
                    if (extractDone) {
                        console.warn("Couldn't decode", e);
                        throw e;
                    }
                }
            }
        });
    }
    const requestType = options.requestType || csCoreEnums.RequestType.Interaction;
    const additionalDetails = options.additionalDetails || { imageId };
    const priority = options.priority === undefined ? 5 : options.priority;
    const uri = imageId.substring(7);
    imageRetrievalPool.addRequest(sendXHR.bind(this, uri, imageId, mediaType), requestType, additionalDetails, priority);
    return {
        promise: uncompressedIterator.getDonePromise(),
        cancelFn: undefined,
    };
}
function decodeLevelFromComplete(percent, retrieveDecodeLevel = 4) {
    const testSize = percent / 100 - 0.02;
    if (testSize > 1 / 4) {
        return Math.min(retrieveDecodeLevel, 0);
    }
    if (testSize > 1 / 16) {
        return Math.min(retrieveDecodeLevel, 1);
    }
    if (testSize > 1 / 64) {
        return Math.min(retrieveDecodeLevel, 2);
    }
    return Math.min(retrieveDecodeLevel, 3);
}
export default loadImage;
